/** Citerar en CSV-cell enligt OpenAIs regler (citera vid komma/citat/radbrytning). */
function csvCell(value) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Bygger en UTF-8 CSV-sträng: en header-rad + en rad per produkt. */
function buildCsv(columns, rows) {
  const lines = [];
  lines.push(columns.map(csvCell).join(","));
  for (const row of rows) {
    lines.push(columns.map((col) => csvCell(row[col] || "")).join(","));
  }
  return lines.join("\n") + "\n";
}

module.exports = { buildCsv };
