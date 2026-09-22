const cron = require("node-cron");
const { runFeedSync } = require("./runFeedSync");

/** Kör feed-jobbet varje natt kl 01:00 svensk tid (node-cron hanterar sommartid åt oss). */
function startScheduler() {
  cron.schedule(
    "0 1 * * *",
    async () => {
      console.log(`[${new Date().toISOString()}] Schemalagd feed-körning startar...`);
      const result = await runFeedSync("cron");
      console.log(`[${new Date().toISOString()}] Schemalagd feed-körning klar:`, result);
    },
    { timezone: "Europe/Stockholm" }
  );
  console.log("Schemaläggare startad: feed-körning varje natt kl 01:00 (Europe/Stockholm).");
}

module.exports = { startScheduler };
