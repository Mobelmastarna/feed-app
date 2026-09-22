require("dotenv").config();

const express = require("express");
const rateLimit = require("express-rate-limit");
const { basicAuth } = require("./src/auth");
const adminRouter = require("./src/routes/admin");
const { startScheduler } = require("./src/scheduler");

const app = express();
const PORT = process.env.PORT || 3020;
const HOST = process.env.HOST || "127.0.0.1";

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "För många förfrågningar från denna IP-adress, försök igen senare.",
  standardHeaders: false,
  skip: (req) => req.method === "GET",
});

app.get(["/feed", "/feed/"], (req, res) => {
  res.redirect("/feed/admin");
});

app.get("/feed/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/feed/admin", basicAuth, adminLimiter, adminRouter);

app.listen(PORT, HOST, () => {
  console.log(`Feed-app lyssnar på ${HOST}:${PORT} (mount: /feed).`);
  startScheduler();
});
