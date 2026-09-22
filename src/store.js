const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const OUTPUT_META_PATH = path.join(DATA_DIR, "output.json");
const OUTPUT_CSV_PATH = path.join(DATA_DIR, "latest.csv");
const RUNS_PATH = path.join(DATA_DIR, "runs.json");

const MAX_RUNS = 30;

const DEFAULT_CONFIG = {
  sourceUrl:
    "https://feeds.hyperdrive.jetshop.io/google/mobelmastarna-se-0dbe0a209ec7ca9d78dc10ea7633dd4410cdb6e2.xml",
  targetFilename: "mobelmastarna-products.csv",
  fieldMapping: [
    { target: "item_id", mode: "source", sourceField: "g:id" },
    { target: "title", mode: "source", sourceField: "title" },
    { target: "description", mode: "source", sourceField: "description" },
    { target: "url", mode: "source", sourceField: "link" },
    { target: "brand", mode: "source_or_static", sourceField: "g:brand", staticValue: "Möbelmästarna" },
    { target: "image_url", mode: "source", sourceField: "g:image_link" },
    { target: "price", mode: "source", sourceField: "g:price" },
    { target: "availability", mode: "source", sourceField: "g:availability" },
    { target: "seller_name", mode: "static", staticValue: "Möbelmästarna" },
    { target: "seller_url", mode: "static", staticValue: "https://www.mobelmastarna.se" },
    { target: "target_countries", mode: "static", staticValue: "SE" },
    { target: "store_country", mode: "static", staticValue: "SE" },
    { target: "is_eligible_search", mode: "static", staticValue: "true" },
    { target: "is_eligible_checkout", mode: "static", staticValue: "false" },
    { target: "is_ads_eligible", mode: "static", staticValue: "true" },
    { target: "gtin", mode: "source", sourceField: "g:gtin" },
    { target: "mpn", mode: "source", sourceField: "g:mpn" },
    { target: "condition", mode: "source", sourceField: "g:condition" },
    { target: "product_category", mode: "source", sourceField: "g:google_product_category" },
    { target: "sale_price", mode: "source", sourceField: "g:sale_price" },
    { target: "group_id", mode: "source", sourceField: "g:item_group_id" },
    { target: "additional_image_urls", mode: "source", sourceField: "g:additional_image_link" },
  ],
};

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

/** Skriver atomärt (temp-fil + rename) så en trasig/avbruten skrivning aldrig korrumperar filen. */
function writeJsonAtomic(filePath, data) {
  ensureDataDir();
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpPath, filePath);
}

function writeFileAtomic(filePath, content) {
  ensureDataDir();
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, content, "utf-8");
  fs.renameSync(tmpPath, filePath);
}

function getConfig() {
  return readJson(CONFIG_PATH, DEFAULT_CONFIG);
}

function saveConfig(config) {
  writeJsonAtomic(CONFIG_PATH, config);
}

function getOutputMeta() {
  return readJson(OUTPUT_META_PATH, null);
}

function saveOutput(csv, itemCount) {
  writeFileAtomic(OUTPUT_CSV_PATH, csv);
  writeJsonAtomic(OUTPUT_META_PATH, {
    itemCount,
    generatedAt: new Date().toISOString(),
  });
}

function getLatestCsv() {
  try {
    return fs.readFileSync(OUTPUT_CSV_PATH, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

function getRuns() {
  return readJson(RUNS_PATH, []);
}

function startRun(triggeredBy) {
  const runs = getRuns();
  const run = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    itemCount: null,
    skippedCount: null,
    warnings: [],
    errorMessage: null,
    sftpUploaded: false,
    triggeredBy,
  };
  runs.unshift(run);
  writeJsonAtomic(RUNS_PATH, runs.slice(0, MAX_RUNS));
  return run.id;
}

function finishRun(id, patch) {
  const runs = getRuns();
  const idx = runs.findIndex((r) => r.id === id);
  if (idx === -1) return;
  runs[idx] = { ...runs[idx], ...patch, finishedAt: new Date().toISOString() };
  writeJsonAtomic(RUNS_PATH, runs);
}

module.exports = {
  getConfig,
  saveConfig,
  getOutputMeta,
  saveOutput,
  getLatestCsv,
  getRuns,
  startRun,
  finishRun,
};
