import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import express from "express";
const expect = require("chai").expect;
import cors from "cors";
import expressAsyncHandler from "express-async-handler";
import validator from "validator";
import mongoose from "mongoose";
import Url from "./models/urlModel.js";
import multer from "multer";

const apiRoutes = require("./routes/api.js");
const fccTestingRoutes = require("./routes/fcctesting.js");
const runner = require("./test-runner");

const upload = multer();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;

dotenv.config();
const app = express();

const connectDb = async () => {
  try {
    const connect = await mongoose.connect(process.env.DB_URI);
  } catch (err) {
    console.error(err.message);
  }
};

const isValidUrl = (url) => {
  return validator.isURL(url, {
    protocols: ["http", "https", "ftp"],
    require_tld: false,
    require_protocol: true,
    allow_query_parts: true,
  });
};

connectDb();
app.use(cors({ origin: "*" })); // allow requests from all servers
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(`${process.cwd()}/public`));

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API
apiRoutes(app);

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// View Routes
app.get("/timestamp", (req, res) => {
  res.sendFile(__dirname + "/views/timestamp.html");
});

app.get("/request-header-parser", (req, res) => {
  res.sendFile(__dirname + "/views/request-header-parser.html");
});

app.get("/url-shortener", (req, res) => {
  res.sendFile(__dirname + "/views/url-shortener.html");
});

app.get("/exercise-tracker", (req, res) => {
  res.sendFile(__dirname + "/views/exercise-tracker.html");
});

app.get("/file-metadata", (req, res) => {
  res.sendFile(__dirname + "/views/file-metadata.html");
});

app.get("/metric-imperial-converter", (req, res) => {
  res.sendFile(__dirname + "/views/metric-imperial-converter.html");
});

// test API endpoint...
app.get("/api/hello", (req, res) => {
  console.log({ greeting: "hello API" });
  res.json({ greeting: "hello API" });
});

// File Metadata Microservice
app.post("/api/fileanalyse", upload.single("upfile"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const responseObject = {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    };
    res.json(responseObject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Exercise Tracker
const ExerciseSessionSchema = mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String },
});

const UserSchema = mongoose.Schema({
  _id: { type: String },
  username: { type: String, unique: true },
  log: [ExerciseSessionSchema],
});

const User = mongoose.model("user", UserSchema);
const Session = mongoose.model("session", ExerciseSessionSchema);

app.post("/api/users", async (req, res) => {
  try {
    let mongooseGeneratedID = new mongoose.Types.ObjectId();
    const doc = new User({
      username: req.body.username,
      _id: mongooseGeneratedID,
    });

    await doc.save();

    res.json({
      success: true,
      saved: true,
      message: "User created successfully",
      username: doc.username,
      _id: doc["_id"],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const doc = new Session({
      description: description,
      duration: parseInt(duration),
      date: date
        ? new Date(date).toISOString().substring(0, 10)
        : new Date().toISOString().substring(0, 10),
    });

    user.log.push(doc);
    await doc.save();

    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { $push: { log: doc } },
      { new: true }
    );

    const resObject = {
      _id: updatedUser.id,
      username: updatedUser.username,
      date: new Date(doc.date).toDateString(),
      description: doc.description,
      duration: doc.duration,
    };

    res.json(resObject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add exercise" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const Users = await User.find({}, "username _id");
    console.log(Users, "Users");
    return res.json(Users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const formattedLog = user.log.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    }));

    const responseObject = {
      _id: user._id,
      username: user.username,
      count: user.log.length,
      log: formattedLog,
    };

    if (req.query.from || req.query.to) {
      let fromDate = new Date(0);
      let toDate = new Date();

      if (req.query.from) {
        fromDate = new Date(req.query.from);
      }
      if (req.query.to) {
        toDate = new Date(req.query.to);
      }

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      responseObject.log = responseObject.log.filter((session) => {
        let sessionDate = new Date(session.date).getTime();
        return sessionDate >= fromDate && sessionDate <= toDate;
      });
    }

    if (req.query.limit) {
      responseObject.log = responseObject.log.slice(0, req.query.limit);
    }

    res.json(responseObject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve exercise logs" });
  }
});

// Request Header Parser Microservice
app.get("/api/whoami/", (req, res) => {
  res.json({
    ipaddress: req.remoteAddress,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

// URL Shortener Microservice
app.post(
  "/api/shorturl",
  expressAsyncHandler(async (req, res) => {
    const original_url = req.body.url;

    if (!isValidUrl(original_url)) {
      res.json({
        error: "invalid url",
      });
      throw new Error("Invalid URL");
    }

    const foundUrl = await Url.findOne({ long_url: original_url });
    if (foundUrl) {
      res.json({
        original_url: foundUrl.long_url,
        short_url: foundUrl.short_url,
      });
    } else {
      const newUrl = await Url.create({
        long_url: original_url,
      });
      console.log("New URL successfully stored:", newUrl);
      res.json({
        original_url: newUrl.long_url,
        short_url: newUrl.short_url,
      });
    }
  })
);

app.get(
  "/api/shorturl/:shortUrl",
  expressAsyncHandler(async (req, res) => {
    const shortUrl = Number(req.params.shortUrl);

    const foundUrl = await Url.findOne({ short_url: shortUrl });
    if (foundUrl) {
      const { long_url } = foundUrl;
      res.redirect(long_url);
    }
  })
);

// Timestamp Microservice
app.get("/api/", (req, res) => {
  let now = new Date();
  res.json({
    unix: now.getTime(),
    utc: now.toUTCString(),
  });
});

app.get("/api/:date_string", (req, res) => {
  let dateString = req.params.date_string;

  if (!isNaN(dateString) && parseInt(dateString) > 10000) {
    let unixTime = new Date(parseInt(dateString));
    res.json({
      unix: unixTime.getTime(),
      utc: unixTime.toUTCString(),
    });
  } else {
    let passedInValue = new Date(dateString);
    if (passedInValue == "Invalid Date") {
      res.json({ error: "Invalid Date" });
    } else {
      res.json({
        unix: passedInValue.getTime(),
        utc: passedInValue.toUTCString(),
      });
    }
  }
});

// Listen on port set in environment variable or default to 3000
var listener = app.listen(port, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
