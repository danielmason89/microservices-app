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

const connectDB = async () => {
  try {
    mongoose
      .connect(process.env.DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        bufferCommands: false,
      })
      .then(() => console.log("Connected to MongoDB"))
      .catch((err) => console.error("Failed to connect to MongoDB:", err));
  } catch (err) {
    console.error(err.response.data.message);
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

connectDB();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(`${process.cwd()}/public`));
app.use(cors({ origin: "https://www.freecodecamp.org" }));
app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

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
    const { url: original_url } = req.body;

    // Validate the URL
    if (!isValidUrl(original_url)) {
      return res.json({ error: "invalid url" });
    }

    // Check if the URL already exists
    const existingUrl = await Url.findOne({ original_url });
    if (existingUrl) {
      return res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url,
      });
    }

    // Create a new short URL
    const newUrl = await Url.create({ original_url });
    return res.json({
      original_url: newUrl.original_url,
      short_url: newUrl.short_url,
    });
  })
);

app.get(
  "/api/shorturl/:shortUrl",
  expressAsyncHandler(async (req, res) => {
    const shortUrl = parseInt(req.params.shortUrl);

    const foundUrl = await Url.findOne({ short_url: shortUrl });
    if (foundUrl) {
      return res.redirect(foundUrl.original_url);
    }

    res.status(404).json({ error: "No URL found for this short_url" });
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
  const dateString = req.params.date_string;
  const isUnixTimestamp = !isNaN(dateString) && parseInt(dateString) > 10000;

  let date;
  if (isUnixTimestamp) {
    date = new Date(parseInt(dateString));
  } else {
    date = new Date(dateString);
  }

  if (isNaN(date.getTime())) {
    return res.json({ error: "Invalid Date" });
  }

  res.json({
    unix: date.getTime(),
    utc: date.toUTCString(),
  });
});

// Listen on port set in environment variable or default to 3000
var listener = app.listen(port, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
