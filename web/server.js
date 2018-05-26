require("dotenv").config();
const express = require("express");
const port = process.env.PORT || 3000;
const path = require("path");
const serveStatic = require("serve-static");

const app = express();

app.use(serveStatic("dist"));

// Serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

app.listen(port, () => console.log(`Listening at localhost:${port}`));
