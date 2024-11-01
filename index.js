import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
import cors from "cors";
import mongoose, { Schema } from "mongoose";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();

mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    bufferCommands: false,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

// const { MongoClient } = require("mongodb");
// const client = new MongoClient(process.env.DB_URI);
// const db = client.db("urlshortener");
// const urls = db.collection("urls");

const port = process.env.PORT || 3000;
app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// test API endpoint...
app.get("/api/hello", (req, res) => {
  console.log({ greeting: "hello API" });
  res.json({ greeting: "hello API" });
});

// Request Header Parser Microservice
app.get("/api/whoami", (req, res) => {
  res.json({
    ipaddress: req.remoteAddress,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

// URL Shortener Microservice
let ShortURL = mongoose.model(
  "ShortURL",
  new Schema({ short_url: String, original_url: String, suffix: String })
);

app.post("/api/shorturl", async (req, res) => {
  try {
    let client_requested_url = req.body.url;
    let suffix = nanoid();

    let newURL = new ShortURL({
      short_url: `${req.protocol}://${req.get("host")}/api/shorturl/${suffix}`,
      original_url: client_requested_url,
      suffix: suffix,
    });

    newURL.save();

    res.json({
      saved: true,
      short_url: newURL.short_url,
      original_url: newURL.original_url,
      suffix: newURL.suffix,
    });
  } catch (error) {
    console.error("Error handling /api/shorturl:", error);
    res.status(500).json({ error: "invalid url" });
  }
});

app.get("/api/shorturl/:suffix", (req, res) => {
  let userGeneratedSuffix = req.params.suffix;
  ShortURL.find({ suffix: userGeneratedSuffix }).then((foundUrls) => {
    let urlForDirect = foundUrls[0];
    res.redirect(urlForDirect.original_url);
  });
});

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
