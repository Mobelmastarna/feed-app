require("dotenv").config();

const express = require("express");
const rateLimit = require("express-rate-limit");
const { basicAuth } = require("./src/auth");
const adminRouter = require("./src/routes/admin");
const { startScheduler } = require("./src/scheduler");

const app = express();
const PORT = process.env.PORT || 3020;
const HOST = process.env.HOST || "127.0.0.1";

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: "För många inloggningsförsök, försök igen om 1 minut.",
  standardHeaders: false,
  keyGenerator: (req) => {
    return req.get("authorization") || req.ip;
  },
});

const apiLimiter = rateLimit({
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

app.use("/feed/admin", authLimiter, basicAuth, apiLimiter, adminRouter);

app.listen(PORT, HOST, () => {
  console.log(`Feed-app lyssnar på ${HOST}:${PORT} (mount: /feed).`);
  startScheduler();
});
