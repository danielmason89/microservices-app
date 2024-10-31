// index.js
// where your node app starts

// init project
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
const cors = require("cors");
app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function (req, res) {
  console.log({ greeting: "hello API" });
  res.json({ greeting: "hello API" });
});

app.get("/api/timestamp/:date_string", function (req, res) {
  let dateString = req.params.date_string;
  console.log(dateString);
  res.json({ error: "Invalid Date" });
});

// Listen on port set in environment variable or default to 3000
var listener = app.listen(port, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
