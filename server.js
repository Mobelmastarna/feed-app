require("dotenv").config();

const express = require("express");
const { basicAuth } = require("./src/auth");
const adminRouter = require("./src/routes/admin");
const { startScheduler } = require("./src/scheduler");

const app = express();
const PORT = process.env.PORT || 3020;
// Bind bara till localhost - appen ska aldrig nås direkt utifrån, bara via
// Caddys reverse proxy på samma maskin (extra skyddslager utöver brandväggen).
const HOST = process.env.HOST || "127.0.0.1";

// /feed visar ingen information publikt - skickar bara vidare till den
// lösenordsskyddade inställningsvyn.
app.get(["/feed", "/feed/"], (req, res) => {
  res.redirect("/feed/admin");
});

app.get("/feed/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/feed/admin", basicAuth, adminRouter);

app.listen(PORT, HOST, () => {
  console.log(`Feed-app lyssnar på ${HOST}:${PORT} (mount: /feed).`);
  startScheduler();
});
