const AVAILABILITY_MAP = {
  in_stock: "in_stock",
  instock: "in_stock",
  out_of_stock: "out_of_stock",
  outofstock: "out_of_stock",
  preorder: "pre_order",
  pre_order: "pre_order",
  available_for_order: "pre_order",
  backorder: "backorder",
  back_order: "backorder",
};

function normalizeAvailability(raw) {
  const key = raw.trim().toLowerCase().replace(/[\s_]+/g, "_");
  return AVAILABILITY_MAP[key] || "unknown";
}

/** Trimmar och normaliserar "123.00  SEK" / "123.00SEK" till "123.00 SEK". */
function normalizeMoney(raw) {
  const match = raw.trim().match(/^([\d.,]+)\s*([A-Za-z]{3})$/);
  if (!match) return raw.trim();
  return `${match[1]} ${match[2].toUpperCase()}`;
}

function readSourceValue(item, sourceField) {
  if (!sourceField) return "";
  const value = item[sourceField];
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

/** Applicerar en fältmappning på en rå produktpost, returnerar en CSV-rad. */
function mapItem(item, mapping) {
  const row = {};

  for (const entry of mapping) {
    if (entry.mode === "none") continue;

    let value = "";
    if (entry.mode === "static") {
      value = entry.staticValue || "";
    } else if (entry.mode === "source") {
      value = readSourceValue(item, entry.sourceField);
    } else if (entry.mode === "source_or_static") {
      value = readSourceValue(item, entry.sourceField);
      if (!value.trim()) value = entry.staticValue || "";
    }

    value = value.trim();

    if (entry.target === "availability" && value) {
      value = normalizeAvailability(value);
    }
    if ((entry.target === "price" || entry.target === "sale_price") && value) {
      value = normalizeMoney(value);
    }

    row[entry.target] = value;
  }

  return row;
}

module.exports = { mapItem };
