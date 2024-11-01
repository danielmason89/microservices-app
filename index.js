import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import express from "express";
// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
import cors from "cors";
import expressAsyncHandler from "express-async-handler";
import validator from "validator";
import mongoose from "mongoose";
import Url from "./models/urlModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;

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

const isValidUrl = (url) => {
  return validator.isURL(url, {
    protocols: ["http", "https", "ftp"],
    require_tld: false,
    require_protocol: true,
    allow_query_parts: true,
  });
};

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

app.post(
  "/api/shorturl",
  expressAsyncHandler(async (req, res) => {
    let client_requested_url = req.body.url;

    if (!isValidUrl(client_requested_url)) {
      res.json({
        error: "invalid url",
      });
      throw new Error("Invalid URL");
    }

    const foundUrl = await Url.findOne({ client_requested_url });
    if (foundUrl) {
      res.json({
        client_requested_url: foundUrl.client_requested_url,
        short_url: foundUrl.short_url,
      });
    } else {
      newUrl = await Url.create({ client_requested_url });
      res.json({
        client_requested_url: newURL.client_requested_url,
        short_url: newURL.short_url,
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
      res.redirect(foundUrl.client_requested_url);
    } else {
      res.status(404).json({ error: "URL not found" });
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
