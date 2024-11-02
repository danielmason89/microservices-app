import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import expressAsyncHandler from "express-async-handler";
import validator from "validator";
import mongoose, { Schema } from "mongoose";
import Url from "./models/urlModel.js";
import { nanoid } from "nanoid";

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
app.use(cors()); // allow requests from all servers
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(`${process.cwd()}/public`));

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

// test API endpoint...
app.get("/api/hello", (req, res) => {
  console.log({ greeting: "hello API" });
  res.json({ greeting: "hello API" });
});

// Exercise Tracker
const ExerciseUserSchema = mongoose.Schema({
  _id: { type: String },
  username: { type: String, unique: true },
});

const ExerciseUser = mongoose.model("exerciseUser", ExerciseUserSchema);

app.post("/api/new-users/", async (req, res) => {
  console.log("accessing post request");

  try {
    let mongooseGeneratedID = new mongoose.Types.ObjectId();
    const doc = new ExerciseUser({
      username: req.body.username,
      _id: mongooseGeneratedID,
    });

    await doc.save();
    res.json({
      saved: true,
      username: doc.username,
      _id: doc["_id"],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save user" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const exerciseUsers = await ExerciseUser.find({}, "username _id");
    console.log(exerciseUsers, "exerciseUsers");
    return res.json(exerciseUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve users" });
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
