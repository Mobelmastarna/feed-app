const express = require("express");
const store = require("../store");
const { TARGET_FIELDS } = require("../targetFields");
const { discoverSourceFields } = require("../fetchAndParseSource");
const { runFeedSync } = require("../runFeedSync");

const router = express.Router();
router.use(express.json());

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" });
}

function renderMappingRow(field, mapping) {
  const entry = mapping.find((m) => m.target === field.key);
  const mode = entry ? entry.mode : "none";
  const sourceField = entry ? entry.sourceField || "" : "";
  const staticValue = entry ? entry.staticValue || "" : "";
  const showSource = mode === "source" || mode === "source_or_static";
  const showStatic = mode === "static" || mode === "source_or_static";

  return `
    <div class="row" data-target="${escapeHtml(field.key)}">
      <div class="row-label">
        <span>${escapeHtml(field.label)}</span>${field.required ? '<span class="req">*</span>' : ""}
        ${field.hint ? `<p class="hint">${escapeHtml(field.hint)}</p>` : ""}
      </div>
      <select class="mode-select">
        <option value="none" ${mode === "none" ? "selected" : ""}>Ej mappad</option>
        <option value="source" ${mode === "source" ? "selected" : ""}>Fält från källan</option>
        <option value="static" ${mode === "static" ? "selected" : ""}>Fast värde</option>
        <option value="source_or_static" ${mode === "source_or_static" ? "selected" : ""}>Fält, annars fast värde</option>
      </select>
      <input type="text" class="source-input" list="source-fields" placeholder="t.ex. g:id" value="${escapeHtml(sourceField)}" style="${showSource ? "" : "display:none"}" />
      <input type="text" class="static-input" placeholder="fast värde" value="${escapeHtml(staticValue)}" style="${showStatic ? "" : "display:none"}" />
    </div>`;
}

router.get("/", (req, res) => {
  const config = store.getConfig();
  const outputMeta = store.getOutputMeta();
  const runs = store.getRuns();

  const groups = new Map();
  for (const field of TARGET_FIELDS) {
    if (!groups.has(field.group)) groups.set(field.group, []);
    groups.get(field.group).push(field);
  }

  const mappingHtml = Array.from(groups.entries())
    .map(
      ([group, fields]) => `
      <h3>${escapeHtml(group)}</h3>
      <div class="rows">
        ${fields.map((f) => renderMappingRow(f, config.fieldMapping)).join("")}
      </div>`
    )
    .join("");

  const runsHtml = runs
    .map(
      (r) => `
      <div class="run-row">
        <span class="status status-${escapeHtml(r.status)}">${r.status === "success" ? "OK" : r.status === "error" ? "Fel" : "Kör..."}</span>
        <span>${escapeHtml(formatDate(r.startedAt))}</span>
        <span class="muted">${r.triggeredBy === "manual" ? "manuell" : "schemalagd"}</span>
        ${r.itemCount != null ? `<span>${r.itemCount} produkter</span>` : ""}
        ${r.status === "success" && !r.sftpUploaded ? '<span class="warn">SFTP misslyckades</span>' : ""}
        ${r.warnings && r.warnings.length ? `<span class="warn">${escapeHtml(r.warnings.join(" "))}</span>` : ""}
        ${r.errorMessage ? `<span class="error">${escapeHtml(r.errorMessage)}</span>` : ""}
      </div>`
    )
    .join("");

  res.send(`<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Produktfeed - Möbelmästarna</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f3f4f6; color: #111827; margin: 0; }
  header { background: #fff; border-bottom: 2px solid #7c3aed; padding: 1rem 1.5rem; }
  header h1 { margin: 0; font-size: 1.125rem; }
  main { max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem; }
  section { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
  h2 { font-size: 1.125rem; margin-top: 0; }
  h3 { font-size: 0.875rem; margin: 1.25rem 0 0.5rem; }
  label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
  input[type=text], input[type=url] { border: 1px solid #d1d5db; border-radius: 6px; padding: 0.4rem 0.6rem; font-size: 0.875rem; }
  select { border: 1px solid #d1d5db; border-radius: 6px; padding: 0.4rem 0.6rem; font-size: 0.875rem; }
  button { background: #7c3aed; color: #fff; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  button.secondary { background: #fff; color: #111827; border: 1px solid #d1d5db; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-start; padding: 0.4rem 0; border-bottom: 1px solid #f3f4f6; }
  .row-label { width: 12rem; flex-shrink: 0; padding-top: 0.3rem; font-size: 0.875rem; }
  .req { color: #dc2626; margin-left: 0.25rem; }
  .hint { color: #9ca3af; font-size: 0.75rem; margin: 0; }
  .source-input { width: 10rem; }
  .static-input { width: 12rem; }
  .muted { color: #6b7280; }
  .warn { color: #d97706; }
  .error { color: #dc2626; }
  .status-success { color: #15803d; }
  .status-error { color: #dc2626; }
  .status-running { color: #6b7280; }
  .run-row { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.75rem; padding: 0.25rem 0; }
  .actions { display: flex; gap: 0.75rem; align-items: center; margin-top: 1rem; }
  .msg { font-size: 0.875rem; }
  .msg.ok { color: #15803d; }
  .msg.err { color: #dc2626; }
  p.lead { color: #6b7280; font-size: 0.875rem; }
</style>
</head>
<body>
<header><h1>Produktfeed till OpenAI Ads</h1></header>
<main>
  <p class="lead">
    Konverterar Google-produktfeeden till en CSV enligt OpenAIs schema och
    skickar den via SFTP till OpenAI varje natt kl 01:00. <code>/feed</code>
    visar ingen information publikt - allt sköts här.
  </p>

  <section>
    <h2>Källa</h2>
    <label>Källfeed (Google Shopping-XML från e-handeln)</label>
    <input type="url" id="source-url" value="${escapeHtml(config.sourceUrl)}" style="width:100%; box-sizing:border-box" />
    <p class="hint">Uppdatera här om länken från e-handeln någonsin ändras.</p>
    <label style="margin-top:0.75rem">Filnamn som skickas till OpenAI</label>
    <input type="text" id="target-filename" value="${escapeHtml(config.targetFilename)}" style="width:16rem" />
    <div class="actions">
      <button id="save-config">Spara källa</button>
      <span class="msg" id="config-msg"></span>
    </div>
  </section>

  <section>
    <h2>Fältmappning</h2>
    <p class="lead">
      Välj för varje fält om värdet ska hämtas från källfeeden, vara ett
      fast värde för alla produkter, eller källfältet med ett fast värde
      som reserv om källfältet är tomt.
    </p>
    <div class="actions" style="margin-top:0">
      <button class="secondary" id="discover-fields">Hämta fältnamn från källan</button>
      <span class="msg" id="discover-msg"></span>
    </div>
    <datalist id="source-fields"></datalist>
    ${mappingHtml}
    <div class="actions">
      <button id="save-mapping">Spara mappning</button>
      <span class="msg" id="mapping-msg"></span>
    </div>
  </section>

  <section>
    <h2>Körning</h2>
    <p>
      Senast genererad: <strong>${outputMeta ? escapeHtml(formatDate(outputMeta.generatedAt)) : "aldrig"}</strong>
      ${outputMeta ? `<span class="muted">(${outputMeta.itemCount} produkter)</span>` : ""}
    </p>
    <div class="actions" style="margin-top:0">
      <a class="secondary" href="/feed/admin/download" style="text-decoration:none; display:inline-block" download>
        <button type="button" class="secondary">Ladda ner senaste CSV</button>
      </a>
      <button id="run-now">Kör nu</button>
      <span class="msg" id="run-msg"></span>
    </div>
    <div style="margin-top:1rem">${runsHtml}</div>
  </section>
</main>
<script>
  const TARGET_FIELDS = ${escapeAttrJson(TARGET_FIELDS)};

  document.querySelectorAll(".row").forEach((row) => {
    const select = row.querySelector(".mode-select");
    const sourceInput = row.querySelector(".source-input");
    const staticInput = row.querySelector(".static-input");
    select.addEventListener("change", () => {
      sourceInput.style.display = select.value === "source" || select.value === "source_or_static" ? "" : "none";
      staticInput.style.display = select.value === "static" || select.value === "source_or_static" ? "" : "none";
    });
  });

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
    return data;
  }

  document.getElementById("save-config").addEventListener("click", async () => {
    const msg = document.getElementById("config-msg");
    msg.textContent = "Sparar...";
    msg.className = "msg";
    try {
      await postJson("/feed/admin/api/config", {
        sourceUrl: document.getElementById("source-url").value,
        targetFilename: document.getElementById("target-filename").value,
      });
      msg.textContent = "Sparat";
      msg.className = "msg ok";
    } catch (e) {
      msg.textContent = e.message;
      msg.className = "msg err";
    }
  });

  document.getElementById("discover-fields").addEventListener("click", async () => {
    const msg = document.getElementById("discover-msg");
    msg.textContent = "Hämtar...";
    msg.className = "msg";
    try {
      const data = await postJson("/feed/admin/api/discover", {
        sourceUrl: document.getElementById("source-url").value,
      });
      const list = document.getElementById("source-fields");
      list.innerHTML = "";
      data.fields.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f;
        list.appendChild(opt);
      });
      msg.textContent = "Hittade " + data.fields.length + " fält.";
      msg.className = "msg ok";
    } catch (e) {
      msg.textContent = e.message;
      msg.className = "msg err";
    }
  });

  document.getElementById("save-mapping").addEventListener("click", async () => {
    const msg = document.getElementById("mapping-msg");
    msg.textContent = "Sparar...";
    msg.className = "msg";
    try {
      const fieldMapping = [];
      document.querySelectorAll(".row").forEach((row) => {
        const target = row.dataset.target;
        const mode = row.querySelector(".mode-select").value;
        if (mode === "none") return;
        fieldMapping.push({
          target,
          mode,
          sourceField: row.querySelector(".source-input").value || undefined,
          staticValue: row.querySelector(".static-input").value || undefined,
        });
      });
      await postJson("/feed/admin/api/mapping", { fieldMapping });
      msg.textContent = "Sparat";
      msg.className = "msg ok";
    } catch (e) {
      msg.textContent = e.message;
      msg.className = "msg err";
    }
  });

  document.getElementById("run-now").addEventListener("click", async (e) => {
    const btn = e.target;
    const msg = document.getElementById("run-msg");
    btn.disabled = true;
    msg.textContent = "Kör...";
    msg.className = "msg";
    try {
      const data = await postJson("/feed/admin/api/run", {});
      msg.textContent = data.status === "success"
        ? data.itemCount + " produkter genererade." + (data.warnings.length ? " (" + data.warnings.join(" ") + ")" : "")
        : data.errorMessage;
      msg.className = data.status === "success" ? "msg ok" : "msg err";
      setTimeout(() => window.location.reload(), 1200);
    } catch (e2) {
      msg.textContent = e2.message;
      msg.className = "msg err";
    } finally {
      btn.disabled = false;
    }
  });
</script>
</body>
</html>`);
});

function escapeAttrJson(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

router.post("/api/config", (req, res) => {
  const { sourceUrl, targetFilename } = req.body || {};
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    return res.status(400).json({ error: "Ange en giltig http(s)-URL." });
  }
  if (!targetFilename || !targetFilename.trim()) {
    return res.status(400).json({ error: "Ange ett filnamn." });
  }
  const config = store.getConfig();
  store.saveConfig({ ...config, sourceUrl: sourceUrl.trim(), targetFilename: targetFilename.trim() });
  res.json({ status: "success" });
});

router.post("/api/mapping", (req, res) => {
  const { fieldMapping } = req.body || {};
  if (!Array.isArray(fieldMapping)) {
    return res.status(400).json({ error: "Ogiltig mappning." });
  }
  const config = store.getConfig();
  store.saveConfig({ ...config, fieldMapping });
  res.json({ status: "success" });
});

router.post("/api/discover", async (req, res) => {
  const { sourceUrl } = req.body || {};
  if (!sourceUrl) return res.status(400).json({ error: "Ingen källa angiven." });
  try {
    const { fields } = await discoverSourceFields(sourceUrl);
    res.json({ status: "success", fields });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.post("/api/run", async (req, res) => {
  const result = await runFeedSync("manual");
  res.json(result);
});

router.get("/download", (req, res) => {
  const csv = store.getLatestCsv();
  if (!csv) return res.status(404).json({ error: "Ingen feed genererad ännu." });
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", 'attachment; filename="mobelmastarna-products-preview.csv"');
  res.send(csv);
});

module.exports = router;
