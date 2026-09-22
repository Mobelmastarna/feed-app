const { XMLParser } = require("fast-xml-parser");

const REPEATABLE_TAGS = new Set(["item", "g:additional_image_link", "g:shipping"]);

function makeParser() {
  return new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    isArray: (tagName) => REPEATABLE_TAGS.has(tagName),
  });
}

/** Plattar ett fast-xml-parser-item till "g:fält" -> strängvärde/strängvärden. */
function flattenItem(raw) {
  const result = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      const isPrimitiveArray = value.every((v) => typeof v !== "object");
      if (isPrimitiveArray) {
        result[key] = value.map((v) => String(v));
      } else {
        const first = value[0];
        if (first && typeof first === "object") {
          for (const [subKey, subVal] of Object.entries(first)) {
            if (subVal !== null && subVal !== undefined && typeof subVal !== "object") {
              result[`${key}.${subKey}`] = String(subVal);
            }
          }
        }
      }
    } else if (typeof value === "object") {
      for (const [subKey, subVal] of Object.entries(value)) {
        if (subVal !== null && subVal !== undefined && typeof subVal !== "object") {
          result[`${key}.${subKey}`] = String(subVal);
        }
      }
    } else {
      result[key] = String(value);
    }
  }

  return result;
}

function extractItems(parsed) {
  const rss = parsed && parsed.rss;
  const channel = rss && rss.channel;
  const items = channel && channel.item;
  if (!items) return [];
  const arr = Array.isArray(items) ? items : [items];
  return arr.map((item) => flattenItem(item));
}

/** Hämtar och parsar hela källfeeden. Kan ta flera sekunder för stora feeder. */
async function fetchFullSource(sourceUrl) {
  const res = await fetch(sourceUrl, {
    headers: { "User-Agent": "mobelmastarna-feed-app/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Kunde inte hämta källfeeden (HTTP ${res.status}).`);
  }
  const xml = await res.text();
  const parsed = makeParser().parse(xml);
  return extractItems(parsed);
}

function uniqueFields(items) {
  const set = new Set();
  for (const item of items) {
    for (const key of Object.keys(item)) set.add(key);
  }
  return Array.from(set).sort();
}

/**
 * Läser bara de första produkterna ur källfeeden (strömmande, avbryts tidigt)
 * för att lista tillgängliga fältnamn utan att ladda ner hela filen.
 */
async function discoverSourceFields(sourceUrl, sampleItems = 3) {
  const res = await fetch(sourceUrl, {
    headers: { "User-Agent": "mobelmastarna-feed-app/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Kunde inte hämta källfeeden (HTTP ${res.status}).`);
  }
  if (!res.body) {
    const xml = await res.text();
    const parsed = makeParser().parse(xml);
    const items = extractItems(parsed).slice(0, sampleItems);
    return { fields: uniqueFields(items), sample: items };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let closedTagCount = 0;
  const MAX_BYTES = 2_000_000;
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      buffer += decoder.decode(value, { stream: true });
      closedTagCount = (buffer.match(/<\/item>/g) || []).length;
      if (closedTagCount >= sampleItems || totalBytes >= MAX_BYTES) {
        break;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Anslutningen kan redan vara stängd - ofarligt.
    }
  }

  const firstItemIdx = buffer.indexOf("<item>");
  const lastCloseIdx = buffer.lastIndexOf("</item>");
  if (firstItemIdx === -1 || lastCloseIdx === -1 || lastCloseIdx < firstItemIdx) {
    throw new Error("Hittade inga produkter i källfeeden (oväntat format).");
  }
  const fragment = buffer.slice(firstItemIdx, lastCloseIdx + "</item>".length);
  const wrapped = `<root xmlns:g="http://base.google.com/ns/1.0">${fragment}</root>`;

  const parser = makeParser();
  const parsed = parser.parse(wrapped);
  const root = parsed && parsed.root;
  const rawItems = root && root.item;
  const arr = rawItems ? (Array.isArray(rawItems) ? rawItems : [rawItems]) : [];
  const items = arr.map((item) => flattenItem(item));

  return { fields: uniqueFields(items), sample: items };
}

module.exports = { fetchFullSource, discoverSourceFields };
