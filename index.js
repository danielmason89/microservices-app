require("dotenv").config();
const express = require("express");
const app = express();
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.DB_URI);
const db = client.db("urlshortener");
const urls = db.collection("urls");

const port = process.env.PORT || 3000;

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
const cors = require("cors");
app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204
app.use(express.urlencoded({ extended: true }));

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

// View Routes
app.get("/timestamp", function (req, res) {
  res.sendFile(__dirname + "/views/timestamp.html");
});

app.get("/request-header-parser", function (req, res) {
  res.sendFile(__dirname + "/views/request-header-parser.html");
});

app.get("/url-shortener", function (req, res) {
  res.sendFile(__dirname + "/views/url-shortener.html");
});

// test API endpoint...
app.get("/api/hello", function (req, res) {
  console.log({ greeting: "hello API" });
  res.json({ greeting: "hello API" });
});

// Request Header Parser Microservice
app.get("/api/whoami", function (req, res) {
  res.json({
    ipaddress: req.remoteAddress,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

// URL Shortener Microservice - https://www.freecodecamp.org
app.post("/api/shorturl", function (req, res) {
  const client_requested_url = req.body.url;

  if (
    !client_requested_url.includes("https://") &&
    !client_requested_url.includes("http://")
  ) {
    return res.json({ error: "invalid url" });
  }

  try {
    client.connect();

    let existingUrl = urls.findOne({ original_url: client_requested_url });

    if (existingUrl) {
      return res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url,
      });
    }

    // If the URL is new, generate a short URL and save it to the database
    const short_url = urls.countDocuments() + 1;
    urls.insertOne({
      original_url: client_requested_url,
      short_url: short_url,
    });

    res.json({
      original_url: client_requested_url,
      short_url: short_url,
    });
  } catch (error) {
    console.error("Error handling /api/shorturl:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("api/shorturl/:shorturl", function (req, res) {
  const shorturl = parseInt(req.params.shorturl);
  try {
    client.connect();

    const urlRecord = urls.findOne({ short_url: shorturl });

    if (!urlRecord) {
      return res.json({ error: "No short URL found for the given input" });
    }

    // Redirect to the original URL
    res.redirect(urlRecord.original_url);
  } catch (error) {
    console.error("Error handling /api/shorturl/:shorturl:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Timestamp Microservice
app.get("/api/", function (req, res) {
  let now = new Date();
  res.json({
    unix: now.getTime(),
    utc: now.toUTCString(),
  });
});

app.get("/api/:date_string", function (req, res) {
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
var listener = app.listen(port, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
