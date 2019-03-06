const express = require("express"),
  cors = require("cors"),
  os = require("os"),
  passport = require("passport"),
  LocalStrategy = require("passport-local"),
  bodyParser = require("body-parser"),
  morgan = require("morgan"),
  helmet = require("helmet"),
  compression = require("compression"),
  session = require("express-session"),
  crypto = require("crypto"),
  jwt = require("jsonwebtoken"),
  mongoose = require("mongoose"),
  errorHandler = require("errorhandler"),
  app = express();
mongoose.promise = global.Promise, process.env.NODE_ENV = "development", app.use(helmet()), app.use(compression()), app.use(morgan("dev")), app.use(session({
  secret: "passport-tutorial",
  cookie: {
    maxAge: 6e4
  },
  resave: !1,
  saveUninitialized: !1
})), app.use(bodyParser.urlencoded({
  extended: !1
})), app.use(express.static("public")), app.get("/api/getUsername", (e, t) => t.send({
  username: os.userInfo().username
})), app.use(bodyParser.json()), app.use(cors()), app.use(express.static(`${__dirname}/dist`)), mongoose.connect("mongodb://localhost/auth", {
  useNewUrlParser: !0
}), "development" === process.env.NODE_ENV && app.use(errorHandler()), mongoose.set("debug", !0);
const {
  Schema: Schema
} = mongoose, UsersSchema = new Schema({
  email: String,
  hash: String,
  salt: String
});
UsersSchema.methods.setPassword = function (e) {
  this.salt = crypto.randomBytes(16).toString("hex"), this.hash = crypto.pbkdf2Sync(e, this.salt, 1e4, 512, "sha512").toString("hex")
}, UsersSchema.methods.validatePassword = function (e) {
  const t = crypto.pbkdf2Sync(e, this.salt, 1e4, 512, "sha512").toString("hex");
  return this.hash === t
}, UsersSchema.methods.generateJWT = function () {
  const e = new Date,
    t = new Date(e);
  return t.setDate(e.getDate() + 60), jwt.sign({
    email: this.email,
    id: this._id,
    exp: parseInt(t.getTime() / 1e3, 10)
  }, "secret")
}, UsersSchema.methods.toAuthJSON = function () {
  return {
    _id: this._id,
    email: this.email,
    token: this.generateJWT()
  }
}, mongoose.model("Users", UsersSchema);
const Users = mongoose.model("Users");
passport.use(new LocalStrategy({
  usernameField: "user[email]",
  passwordField: "user[password]"
}, (e, t, s) => {
  Users.findOne({
    email: e
  }).then(e => e && e.validatePassword(t) ? s(null, e) : s(null, !1, {
    errors: {
      "email or password": "is invalid"
    }
  })).catch(s)
}));
const WeightSchema = new Schema({
  User: String,
  Weight: Number,
  Date: {
    type: Date,
    default: Date.now
  },
  Gender: {
    type: String,
    default: 0
  },
  Height: {
    type: Number,
    default: 0
  },
  Age: {
    type: Number,
    default: 0
  },
  BMI: {
    type: Number,
    default: 0
  },
  BMR: {
    type: Number,
    default: 0
  },
  IdealWeight: {
    type: Number,
    default: 0
  }
});
WeightSchema.methods.getBMI = (() => {
  const e = this.Weight / (this.Height / 100) ** 2;
  this.BMI = e
}), WeightSchema.methods.getBMR = (() => {
  let e;
  "M" === this.Gender && (e = 10 * this.Weight + 6.25 * this.Height - 5 * this.Age + 5), "F" === this.Gender && (e = 10 * this.Weight + 6.25 * this.Height - 5 * this.Age - 161), this.BMR = e
}), WeightSchema.methods.getIdealWeight = (() => {
  let e;
  if ("M" === this.Gender) {
    e = 52;
    for (let t = 0; t < this.Height - 5; t++) e += 1.9
  }
  if ("F" === this.Gender) {
    e = 49;
    for (let t = 0; t < this.Height - 5; t++) e += 1.7
  }
  this.IdealWeight = e
}), WeightSchema.methods.toUserJSON = (() => {
  return {
    user: this.User,
    weight: this.Weight,
    gender: this.Gender,
    height: this.Height,
    age: this.Age,
    Date: this.Date,
    BMI: this.BMI,
    BMR: this.BMR,
    idealWeight: this.IdealWeight
  }
}), mongoose.model("Weights", WeightSchema);
const expressjwt = require("express-jwt"),
  getTokenFromHeaders = e => {
    const {
      headers: {
        authorization: t
      }
    } = e;
    return t && "Token" === t.split(" ")[0] ? t.split(" ")[1] : null
  },
  auth = {
    required: expressjwt({
      secret: "secret",
      userProperty: "payload",
      getToken: getTokenFromHeaders
    }),
    optional: expressjwt({
      secret: "secret",
      userProperty: "payload",
      getToken: getTokenFromHeaders,
      credentialsRequired: !1
    })
  };
app.post("/api/users/", auth.optional, (e, t) => {
  const {
    body: {
      user: s
    }
  } = e;
  if (!s.email) return t.status(422).send("Email is Required");
  if (!s.password) return t.status(422).send("Password is Required");
  const r = new Users(s);
  return r.setPassword(s.password), r.save().then(() => t.send({
    user: r.toAuthJSON()
  }))
}), app.post("/api/users/login", auth.optional, (e, t, s) => {
  const {
    body: {
      user: r
    }
  } = e;
  return r.email ? r.password ? passport.authenticate("local", {
    session: !1
  }, (e, r) => {
    if (e) return s(e);
    if (r) {
      const e = r;
      return e.token = r.generateJWT(), t.send({
        user: e.toAuthJSON()
      })
    }
    return t.sendStatus(400)
  })(e, t, s) : t.status(422).send("Password is Required") : t.status(422).send("Email is Required")
}), app.get("/api/users/current", auth.required, (e, t) => {
  const {
    payload: {
      id: s
    }
  } = e;
  return Users.findById(s).then(e => e ? t.send({
    user: e.toAuthJSON()
  }) : t.sendStatus(400))
}), app.get("/api/users/redirect", auth.required, (e, t) => {
  t.send(!0)
});
const inchesOver5Feet = e => {
    let t = .3937 * e;
    return t -= 60, Math.round(t)
  },
  Weight = mongoose.model("Weights");
app.get("/api/hello", auth.required, (e, t) => {
  t.send("Hello, World")
}), app.post("/api/weight/newuser", auth.required, (e, t) => {
  const {
    body: {
      entry: s
    }
  } = e;
  if (s.age = parseInt(s.age, 10), s.weight = parseInt(s.weight, 10), s.height = parseInt(s.height, 10), "O" === s.gender && (s.gender = "M"), !s.weight) return t.sendStatus(422).json({
    error: {
      weight: "is required"
    }
  });
  if (!s.user) return t.status(422).send("user is required");
  let r = 0;
  "M" === s.gender && (r = 10 * s.weight + 6.25 * s.height - 5 * s.age + 5), "F" === s.gender && (r = 10 * s.weight + 6.25 * s.height - 5 * s.age - 161);
  let i = 0;
  if ("M" === s.gender) {
    i = 52;
    for (let e = 0; e < inchesOver5Feet(parseInt(s.height, 10)); e++) i += 1.9
  }
  if ("F" === s.gender) {
    i = 49;
    for (let e = 0; e < inchesOver5Feet(parseInt(s.height, 10)); e++) i += 1.7
  }
  const o = s.weight / (s.height / 100) ** 2,
    a = {
      User: s.user,
      Weight: s.weight,
      Gender: s.gender,
      Height: s.height,
      Age: s.age,
      BMI: Math.round(o),
      BMR: Math.round(r),
      IdealWeight: Math.round(i)
    };
  return new Weight(a).save().then(() => {
    t.send(a)
  })
}), app.post("/api/weight/new", auth.required, (e, t) => {
  const {
    body: {
      entry: s
    }
  } = e;
  if (!s.weight) return t.sendStatus(422).json({
    error: {
      weight: "is required"
    }
  });
  if (!s.user) return t.status(422).send("user is required");
  const r = {
    User: s.user,
    Weight: s.weight
  };
  return new Weight(r).save().then(e => {
    e && console.error(e), t.status(200).json({
      weight: s.weight
    })
  })
}), app.get("/api/weight/data", auth.required, (e, t) => {
  const {
    body: {
      user: s
    }
  } = e;
  s || e.send({
    error: "No User"
  }), Weight.findOne({
    User: s
  }, {}, {
    sort: {
      created_at: 1
    }
  }, (e, s) => {
    t.send(s)
  })
}), app.get("/api/weight/", auth.required, (e, t) => {
  const {
    body: {
      user: s
    }
  } = e;
  s || t.send({
    error: "no user"
  }), Weight.find({
    User: s
  }, (e, s) => {
    t.send(s)
  })
}), app.listen(8081, () => console.log("Server running on http://localhost:8081/"));