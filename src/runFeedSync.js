const { fetchFullSource } = require("./fetchAndParseSource");
const { mapItem } = require("./mapItem");
const { buildCsv } = require("./buildCsv");
const { uploadCsvViaSftp } = require("./sftp");
const { TARGET_FIELDS } = require("./targetFields");
const store = require("./store");

let isRunning = false;

/**
 * Kör hela feed-jobbet: hämtar källfeeden, mappar fält, genererar CSV,
 * cachar den lokalt och laddar upp den till OpenAI via SFTP.
 */
async function runFeedSync(triggeredBy) {
  if (isRunning) {
    return { status: "error", warnings: [], errorMessage: "En körning pågår redan." };
  }
  isRunning = true;

  const runId = store.startRun(triggeredBy);
  const warnings = [];

  try {
    const config = store.getConfig();
    const mapping = config.fieldMapping;

    const configuredTargets = new Set(
      mapping.filter((m) => m.mode !== "none").map((m) => m.target)
    );
    const missingRequired = TARGET_FIELDS.filter(
      (f) => f.required && !configuredTargets.has(f.key)
    );
    if (missingRequired.length > 0) {
      warnings.push(
        `Obligatoriska fält utan mappning: ${missingRequired.map((f) => f.key).join(", ")}`
      );
    }

    const items = await fetchFullSource(config.sourceUrl);
    if (items.length === 0) {
      throw new Error("Källfeeden innehöll inga produkter.");
    }

    const requiredKeys = TARGET_FIELDS.filter((f) => f.required).map((f) => f.key);
    const columns = TARGET_FIELDS.filter((f) => configuredTargets.has(f.key)).map(
      (f) => f.key
    );

    const rows = items.map((item) => mapItem(item, mapping));
    const skipped = rows.filter((row) =>
      requiredKeys.some((key) => !row[key] || row[key].trim() === "")
    ).length;
    if (skipped > 0) {
      warnings.push(`${skipped} produkter saknar värde för ett obligatoriskt fält.`);
    }

    const csv = buildCsv(columns, rows);
    store.saveOutput(csv, rows.length);

    let sftpUploaded = false;
    try {
      await uploadCsvViaSftp(csv, config.targetFilename);
      sftpUploaded = true;
    } catch (sftpError) {
      warnings.push(`SFTP-uppladdning misslyckades: ${sftpError.message}`);
    }

    store.finishRun(runId, {
      status: "success",
      itemCount: rows.length,
      skippedCount: skipped,
      warnings,
      sftpUploaded,
    });

    return { status: "success", itemCount: rows.length, skippedCount: skipped, warnings };
  } catch (error) {
    store.finishRun(runId, {
      status: "error",
      errorMessage: error.message,
      warnings,
    });
    return { status: "error", warnings, errorMessage: error.message };
  } finally {
    isRunning = false;
  }
}

module.exports = { runFeedSync };
