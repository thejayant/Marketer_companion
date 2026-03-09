const $ = (id) => document.getElementById(id);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  sites: [],
  accountEmail: "",
  activePanel: "panelOverview",
  perf: { range: "30", wholeProperty: false },
  ga: { props: null, detection: null }
};

function surfaceError(error) {
  console.error(error);
  const message = error?.message || String(error);
  clearResult(`❌ ${escapeHtml(message)}`);
}

function safe(fn) {
  try {
    return fn();
  } catch (error) {
    surfaceError(error);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (match) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[match]
  ));
}

function badge(text, cls = "") {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

function stateBadge(text) {
  const raw = String(text || "").toLowerCase();
  if (/(valid|passed|ok|good|on google|submitted|success|100|90|ready|matched|yes)/.test(raw)) return badge(text, "good");
  if (/(warning|partial|unknown|needs|medium|limited|review)/.test(raw)) return badge(text, "ok");
  if (/(error|fail|not on google|blocked|denied|slow|poor|noindex|missing|invalid|no)/.test(raw)) return badge(text, "bad");
  return badge(text || "Unknown");
}

function kv(key, value) {
  return `<div class="row kv"><div class="k">${escapeHtml(key)}</div><div>${value}</div></div>`;
}

function clearResult(message = "", targetId = "result") {
  const el = $(targetId);
  if (!el) return;
  el.innerHTML = message ? `<div class="card">${message}</div>` : "";
  if (targetId === "result") {
    const raw = $("raw");
    if (raw) raw.textContent = "";
    const rawPanel = $("rawPanel");
    if (rawPanel) rawPanel.open = false;
  }
}

function setRaw(obj) {
  const raw = $("raw");
  if (!raw) return;
  try {
    raw.textContent = JSON.stringify(obj, null, 2);
  } catch {
    raw.textContent = String(obj);
  }
}

function listHtml(items) {
  if (!items.length) return "";
  return `<ul class="issue-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoISO(daysAgo) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeUrl(raw) {
  if (!raw) return null;
  let url = String(raw).trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    parsed.hash = "";
    parsed.username = "";
    parsed.password = "";
    const host = parsed.hostname;
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function propertyCoversUrl(siteUrl, url) {
  try {
    if (!siteUrl || !url) return false;
    if (siteUrl.startsWith("sc-domain:")) {
      const domain = siteUrl.split(":")[1];
      const parsed = new URL(url);
      return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
    }
    return url.startsWith(siteUrl);
  } catch {
    return false;
  }
}

function chooseBestProperty(sites, pageUrl) {
  if (!Array.isArray(sites) || !pageUrl) return null;
  let best = null;
  let bestScore = -1;
  let bestLength = -1;
  let host = "";
  try {
    host = new URL(pageUrl).hostname || "";
  } catch {}
  for (const site of sites) {
    const siteUrl = site.siteUrl;
    let covers = false;
    let score = 0;
    let length = siteUrl.length;
    if (siteUrl.startsWith("sc-domain:")) {
      const domain = siteUrl.split(":")[1];
      if (host === domain || host.endsWith(`.${domain}`)) {
        covers = true;
        score = 1;
        length = domain.length;
      }
    } else if (pageUrl.startsWith(siteUrl)) {
      covers = true;
      score = 2;
    }
    if (covers && (score > bestScore || (score === bestScore && length > bestLength))) {
      best = siteUrl;
      bestScore = score;
      bestLength = length;
    }
  }
  return best;
}

function getPermissionFor(siteUrl) {
  return state.sites.find((site) => site.siteUrl === siteUrl)?.permissionLevel || "";
}

function isOwner(siteUrl) {
  return /owner/i.test(getPermissionFor(siteUrl));
}

function getSelectionContext() {
  const siteUrl = $("sites")?.value || "";
  const rawUrl = $("inspectUrl")?.value || "";
  const normalizedUrl = normalizeUrl(rawUrl);
  const permission = getPermissionFor(siteUrl);
  const covers = !!(siteUrl && normalizedUrl && propertyCoversUrl(siteUrl, normalizedUrl));
  const owner = isOwner(siteUrl);
  return {
    siteUrl,
    rawUrl,
    normalizedUrl,
    permission,
    covers,
    owner,
    wholeProperty: state.perf.wholeProperty
  };
}

function setSites(sites) {
  state.sites = sites || [];
  const sel = $("sites");
  if (!sel) return;
  sel.innerHTML = "";
  for (const site of state.sites) {
    const opt = document.createElement("option");
    opt.value = site.siteUrl;
    opt.textContent = `${site.siteUrl}${site.permissionLevel ? ` (${site.permissionLevel})` : ""}`;
    sel.appendChild(opt);
  }
  updateActionStates();
}

function updateActionStates() {
  const ctx = getSelectionContext();
  const setDisabled = (id, disabled) => {
    const el = $(id);
    if (el) el.disabled = disabled;
  };

  setDisabled("inspect", !ctx.covers);
  setDisabled("liveTest", !ctx.covers || !ctx.owner);
  setDisabled("openGSC", !ctx.covers);
  setDisabled("openLiveGSC", !ctx.covers);
  setDisabled("loadPerf", !(ctx.siteUrl && (ctx.wholeProperty || ctx.covers)));
  setDisabled("runOnPage", false);

  const openGscQuick = $("quickOpenGsc");
  if (openGscQuick) openGscQuick.disabled = !ctx.covers;
  const inspectQuick = $("quickInspect");
  if (inspectQuick) inspectQuick.disabled = !ctx.covers;
  const liveQuick = $("quickLiveTest");
  if (liveQuick) liveQuick.disabled = !ctx.covers || !ctx.owner;
}

async function send(msg) {
  return chrome.runtime.sendMessage(msg);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getActiveTabUrl() {
  try {
    const tab = await getActiveTab();
    return /^https?:/i.test(tab?.url || "") ? tab.url : "";
  } catch {
    return "";
  }
}

const GA_DIM_LABELS = {
  date: "Date",
  sessionDefaultChannelGroup: "Default Channel Group",
  country: "Country",
  pagePathPlusQueryString: "Page"
};

function gaNumber(value) {
  return Number(value || 0).toLocaleString();
}

function gaPctDelta(current, previous) {
  if (previous == null || previous === 0) return { text: "—", cls: "" };
  const delta = ((current - previous) / previous) * 100;
  return {
    text: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`,
    cls: delta >= 0 ? "up" : "down"
  };
}

function gaSparklineSVG(values) {
  const w = 120;
  const h = 28;
  const p = 2;
  if (!values || !values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sx = (index) => p + (index * (w - 2 * p) / Math.max(1, values.length - 1));
  const sy = (value) => (max === min ? h / 2 : p + (h - 2 * p) * (1 - (value - min) / (max - min)));
  let path = "";
  values.forEach((value, index) => {
    path += `${index ? " L" : "M"}${sx(index).toFixed(1)} ${sy(value).toFixed(1)}`;
  });
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
}

function gaToCSV(data) {
  const dimensionHeaders = (data.dimensionHeaders || []).map((header) => header.name);
  const metricHeaders = (data.metricHeaders || []).map((header) => header.name);
  const lines = [[...dimensionHeaders, ...metricHeaders].join(",")];
  for (const row of data.rows || []) {
    const dims = (row.dimensionValues || []).map((value) => `"${String(value.value || "").replace(/"/g, '""')}"`);
    const metrics = (row.metricValues || []).map((value) => String(value.value || "0"));
    lines.push([...dims, ...metrics].join(","));
  }
  return lines.join("\n");
}

async function loadGaPropsOnce() {
  if (state.ga.props) return state.ga.props;
  const response = await send({ type: "gaListProperties" });
  if (!response.ok) throw new Error(response.error || "Failed to list GA properties");
  state.ga.props = response.data || [];
  const select = $("gaProps");
  if (select) {
    select.innerHTML = "";
    for (const property of state.ga.props) {
      const opt = document.createElement("option");
      opt.value = property.id;
      opt.textContent = `${property.account} • ${property.displayName} (p:${property.id})`;
      select.appendChild(opt);
    }
  }
  return state.ga.props;
}

async function detectGaPropertyForTab() {
  try {
    const response = await send({ type: "gaDetectFromTab" });
    if (!response.ok) return null;
    state.ga.detection = response.data || null;
    const detection = state.ga.detection;
    const select = $("gaProps");
    if (select && detection?.propertyId && Array.from(select.options).some((opt) => opt.value === detection.propertyId)) {
      select.value = detection.propertyId;
    }
    updateOverview();
    return detection;
  } catch {
    return null;
  }
}

function renderOverview() {
  const ctx = getSelectionContext();
  const urlStatus = ctx.normalizedUrl ? "Ready" : "Needs valid public URL";
  const propertyStatus = ctx.siteUrl ? (ctx.covers ? "Matched" : "Does not cover URL") : "Select property";
  const ownerStatus = !ctx.siteUrl ? "Unknown" : ctx.owner ? "Owner access" : ctx.permission || "Limited access";
  const ga = state.ga.detection;
  const gaStatus = ga?.propertyId ? `${ga.propertyName} (${ga.via})` : ga?.foundGIds?.length ? "IDs found, no property match" : "Not checked yet";
  const nextActions = [];

  if (!ctx.normalizedUrl) nextActions.push("Enter a valid public URL.");
  if (ctx.normalizedUrl && !ctx.siteUrl) nextActions.push("Select the Search Console property that should cover this page.");
  if (ctx.normalizedUrl && ctx.siteUrl && !ctx.covers) nextActions.push("Choose a different property before running Indexing or Live Test.");
  if (ctx.covers && !ctx.owner) nextActions.push("Search Console read-only access is enough for most flows, but Live Test is safer with owner access.");
  if (ctx.covers && ctx.owner) nextActions.push("Run Inspect first, then use Live Test or On-Page depending on the issue you are chasing.");

  const overview = $("overviewContent");
  if (!overview) return;
  overview.innerHTML = `
    <div class="card overview-main">
      <h4>Page Context</h4>
      ${kv("URL", ctx.normalizedUrl ? escapeHtml(ctx.normalizedUrl) : '<span class="empty-state">Enter a public URL to unlock the full toolset.</span>')}
      ${kv("Property", ctx.siteUrl ? escapeHtml(ctx.siteUrl) : '<span class="empty-state">No property selected</span>')}
      ${kv("Access", escapeHtml(ctx.permission || "Unknown"))}
      ${kv("Account", escapeHtml(state.accountEmail || "Not signed in"))}
    </div>
    <div class="card">
      <h4>Readiness</h4>
      <div class="status-list">
        <div class="status-item"><span class="label">URL</span><span>${stateBadge(urlStatus)}</span></div>
        <div class="status-item"><span class="label">Search Console property</span><span>${stateBadge(propertyStatus)}</span></div>
        <div class="status-item"><span class="label">Permission</span><span>${stateBadge(ownerStatus)}</span></div>
        <div class="status-item"><span class="label">GA4 detection</span><span>${stateBadge(gaStatus)}</span></div>
      </div>
    </div>
    <div class="card">
      <h4>Quick Actions</h4>
      <div class="quick-actions">
        <button id="quickInspect" type="button">Inspect URL</button>
        <button id="quickLiveTest" type="button">Run Live Test</button>
        <button id="quickOnPage" type="button">Run On-Page Audit</button>
        <button id="quickOpenGsc" type="button">Open in GSC</button>
      </div>
      <div class="status-note">${escapeHtml(nextActions[0] || "Everything needed for a first-pass check is in place.")}</div>
      ${listHtml(nextActions.slice(1))}
    </div>
  `;

  $("quickInspect")?.addEventListener("click", () => {
    showPanel("navIndex");
    $("inspect")?.click();
  });
  $("quickLiveTest")?.addEventListener("click", () => {
    showPanel("navLive");
    $("liveTest")?.click();
  });
  $("quickOnPage")?.addEventListener("click", () => {
    showPanel("navOnPage");
    $("runOnPage")?.click();
  });
  $("quickOpenGsc")?.addEventListener("click", () => $("openGSC")?.click());
  updateActionStates();
}

function updateOverview() {
  renderOverview();
}

function buildRecommendationListForIndexing(indexStatus) {
  const items = [];
  if (/not on google/i.test(indexStatus?.verdict || "")) items.push("The page is not indexed. Check whether this is expected and compare canonical, robots, and coverage details.");
  if (/blocked/i.test(indexStatus?.robotsTxtState || "")) items.push("Robots appears to block crawling. Review robots.txt before asking Google to recrawl.");
  if (indexStatus?.userCanonical && indexStatus?.googleCanonical && indexStatus.userCanonical !== indexStatus.googleCanonical) {
    items.push("User canonical and Google canonical differ. Review duplication, internal linking, and canonical consistency.");
  }
  if (!items.length) items.push("Indexing signals look broadly healthy. If the page still underperforms, move to Performance or On-Page next.");
  return items;
}

function renderIndexing(data) {
  const inspection = data?.inspectionResult || data;
  if (!inspection) return clearResult("No indexing data returned.");
  const status = inspection.indexStatusResult || {};
  const recommendations = buildRecommendationListForIndexing(status);
  $("result").innerHTML = `
    <div class="card">
      <h4>Indexing Summary</h4>
      ${kv("Verdict", stateBadge(status.verdict || "UNKNOWN"))}
      ${kv("Coverage", escapeHtml(status.coverageState || "Unknown"))}
      ${kv("Last crawl", escapeHtml(status.lastCrawlTime || "—"))}
      ${kv("Robots", escapeHtml(status.robotsTxtState || "—"))}
      ${kv("Referring URLs", escapeHtml((status.referringUrls || []).length ? status.referringUrls.join(", ") : "—"))}
    </div>
    <div class="card">
      <h4>Canonicals</h4>
      ${kv("User canonical", escapeHtml(status.userCanonical || "—"))}
      ${kv("Google canonical", escapeHtml(status.googleCanonical || "—"))}
      ${listHtml(recommendations)}
    </div>
    ${inspection.mobileUsabilityResult ? `
      <div class="card">
        <h4>Mobile Usability</h4>
        ${kv("Status", stateBadge(inspection.mobileUsabilityResult.verdict || "UNKNOWN"))}
      </div>` : ""}
  `;
  setRaw(inspection);
  $("rawPanel").open = false;
}

function ms(value) {
  return typeof value === "number" ? `${(value / 1000).toFixed(2)}s` : (value || "—");
}

function renderPSI(data) {
  const lighthouse = data?.lighthouseResult || {};
  const audits = lighthouse.audits || {};
  const categories = lighthouse.categories || {};
  const metrics = audits.metrics?.details?.items?.[0] || {};
  const screenshot = audits["final-screenshot"]?.details?.data || null;
  const pageField = data?.loadingExperience || {};
  const originField = data?.originLoadingExperience || {};
  const perf = Math.round((categories.performance?.score ?? 0) * 100);
  const seo = Math.round((categories.seo?.score ?? 0) * 100);
  const acc = Math.round((categories.accessibility?.score ?? 0) * 100);
  const bp = Math.round((categories["best-practices"]?.score ?? 0) * 100);

  function cruxBar(container, metricKey) {
    if (!container?.metrics?.[metricKey]) return "—";
    const metric = container.metrics[metricKey];
    const dist = metric.distributions || [];
    const percentile = metric.percentile;
    const category = metric.category || "";
    const value = metricKey.includes("CUMULATIVE_LAYOUT_SHIFT")
      ? (percentile != null ? (percentile / 100).toFixed(3) : "—")
      : (percentile != null ? `${Math.round(percentile)} ms` : "—");
    const seg = (portion, color) => `<span style="display:inline-block;height:100%;width:${Math.max(1, Math.round((portion || 0) * 100))}%;background:${color}"></span>`;
    return `
      <div style="position:relative;height:12px;border-radius:999px;border:1px solid var(--border);overflow:hidden;background:#1b2130">
        ${seg(dist[0]?.proportion, "rgba(25,195,125,.5)")}
        ${seg(dist[1]?.proportion, "rgba(245,165,36,.5)")}
        ${seg(dist[2]?.proportion, "rgba(239,68,68,.5)")}
        <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;opacity:.8">${escapeHtml(category)} • P${escapeHtml(value)}</span>
      </div>`;
  }

  const opportunities = Object.values(audits)
    .filter((audit) => audit?.details?.type === "opportunity")
    .sort((a, b) => (b?.details?.overallSavingsMs || 0) - (a?.details?.overallSavingsMs || 0))
    .slice(0, 6);

  const actions = [];
  if (perf < 50) actions.push("Performance is poor. Prioritize the highest-savings opportunities first.");
  if ((metrics["largest-contentful-paint"] || 0) > 2500) actions.push("Largest Contentful Paint is slow. Review render-blocking assets and image delivery.");
  if ((metrics["total-blocking-time"] || 0) > 200) actions.push("Main-thread blocking is high. Review heavy JavaScript and third-party scripts.");
  if (!actions.length) actions.push("The live test looks stable. Compare this against Search Console data if traffic is still weak.");

  $("result").innerHTML = `
    <div class="card">
      <h4>Live Test Summary</h4>
      <div class="kpi-grid">
        <div class="kpi"><h5>Performance</h5><div class="val">${perf}</div><div class="sub">${stateBadge(`${perf}/100`)}</div></div>
        <div class="kpi"><h5>SEO</h5><div class="val">${seo}</div><div class="sub">${stateBadge(`${seo}/100`)}</div></div>
        <div class="kpi"><h5>Accessibility</h5><div class="val">${acc}</div><div class="sub">${stateBadge(`${acc}/100`)}</div></div>
        <div class="kpi"><h5>Best Practices</h5><div class="val">${bp}</div><div class="sub">${stateBadge(`${bp}/100`)}</div></div>
      </div>
      ${listHtml(actions)}
    </div>
    <div class="card">
      <h4>Lab Metrics</h4>
      ${kv("LCP", ms(metrics["largest-contentful-paint"]))}
      ${kv("TBT", ms(metrics["total-blocking-time"]))}
      ${kv("CLS", typeof metrics["cumulative-layout-shift"] === "number" ? metrics["cumulative-layout-shift"].toFixed(3) : "—")}
      ${kv("FCP", ms(metrics["first-contentful-paint"]))}
      ${kv("TTI", ms(metrics.interactive))}
      ${kv("Speed Index", ms(metrics["speed-index"]))}
    </div>
    <div class="card">
      <h4>CrUX Snapshot</h4>
      ${kv("LCP (page)", cruxBar(pageField, "LARGEST_CONTENTFUL_PAINT_MS"))}
      ${kv("INP (page)", cruxBar(pageField, "INTERACTION_TO_NEXT_PAINT"))}
      ${kv("CLS (page)", cruxBar(pageField, "CUMULATIVE_LAYOUT_SHIFT_SCORE"))}
      ${kv("LCP (origin)", cruxBar(originField, "LARGEST_CONTENTFUL_PAINT_MS"))}
      ${kv("INP (origin)", cruxBar(originField, "INTERACTION_TO_NEXT_PAINT"))}
      ${kv("CLS (origin)", cruxBar(originField, "CUMULATIVE_LAYOUT_SHIFT_SCORE"))}
    </div>
    ${opportunities.length ? `
      <div class="card">
        <h4>Top Opportunities</h4>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 8px;color:var(--muted);font-weight:600;border-top:1px solid var(--border)">Audit</th>
              <th style="text-align:right;padding:6px 8px;color:var(--muted);font-weight:600;border-top:1px solid var(--border)">Est. Savings</th>
            </tr>
          </thead>
          <tbody>
            ${opportunities.map((opportunity) => `
              <tr>
                <td style="padding:6px 8px;border-top:1px solid var(--border)">${escapeHtml(opportunity.title || opportunity.id)}</td>
                <td style="padding:6px 8px;border-top:1px solid var(--border);text-align:right">${ms(opportunity?.details?.overallSavingsMs || 0)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>` : ""}
    ${screenshot ? `
      <div class="card">
        <h4>Rendered Screenshot</h4>
        <img alt="Final screenshot" src="${screenshot}" style="width:100%;border-radius:10px;border:1px solid var(--border)" />
      </div>` : ""}
  `;
  setRaw(data);
  $("rawPanel").open = false;
}

function renderPerf(data, meta) {
  const row = data?.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const actions = [];
  if ((row.impressions || 0) > 0 && (row.ctr || 0) < 0.02) actions.push("CTR is low for the amount of impressions. Review title tags, meta descriptions, and query intent.");
  if ((row.position || 0) > 10) actions.push("Average position is off page one. This is likely a relevance or authority issue, not only a snippet issue.");
  if (!actions.length) actions.push("This range looks stable. Compare it with Indexing and On-Page if conversions or visibility are still weak.");

  $("result").innerHTML = `
    <div class="card">
      <h4>Performance Summary</h4>
      <div class="kpi-grid">
        <div class="kpi"><h5>Clicks</h5><div class="val">${gaNumber(row.clicks)}</div><div class="sub">${escapeHtml(meta.wholeProperty ? "Whole property" : "Selected page")}</div></div>
        <div class="kpi"><h5>Impressions</h5><div class="val">${gaNumber(row.impressions)}</div><div class="sub">${escapeHtml(`${meta.start} → ${meta.end}`)}</div></div>
        <div class="kpi"><h5>CTR</h5><div class="val">${((row.ctr || 0) * 100).toFixed(2)}%</div><div class="sub">Click-through rate</div></div>
        <div class="kpi"><h5>Avg Position</h5><div class="val">${Number(row.position || 0).toFixed(2)}</div><div class="sub">Search ranking</div></div>
      </div>
      ${listHtml(actions)}
    </div>
  `;
  setRaw(data);
  $("rawPanel").open = false;
}

function renderOnPage(data) {
  const issues = [];
  if (!data.title) issues.push("Missing title tag.");
  if (!data.metaDesc) issues.push("Missing meta description.");
  if ((data.h1Count || 0) === 0) issues.push("Missing H1.");
  if ((data.h1Count || 0) > 1) issues.push("Multiple H1 tags found.");
  if (data.canonicalCrossDomain) issues.push("Canonical points to another domain.");
  if ((data.imgMissingAlt || 0) > 0) issues.push(`${data.imgMissingAlt} images are missing alt text.`);
  if (!issues.length) issues.push("No obvious structural issues were found in the current DOM.");

  $("result").innerHTML = `
    <div class="card">
      <h4>On-Page Summary</h4>
      ${kv("Title", escapeHtml(data.title || "—"))}
      ${kv("Meta description", escapeHtml(data.metaDesc || "—"))}
      ${kv("Robots meta", escapeHtml(data.robotsMeta || "—"))}
      ${kv("Canonical", escapeHtml(data.canonical || "—"))}
      ${kv("H1 count", escapeHtml(data.h1Count ?? "—"))}
      ${kv("Word count", escapeHtml(data.wordCount ?? "—"))}
      ${kv("Links", escapeHtml(`${data.internalLinks ?? 0} internal / ${data.externalLinks ?? 0} external`))}
      ${kv("Images", escapeHtml(`${data.imgCount ?? 0} total / ${data.imgMissingAlt ?? 0} missing alt`))}
      ${kv("Schema", escapeHtml((data.ldTypes || []).join(", ") || "—"))}
    </div>
    <div class="card">
      <h4>Action List</h4>
      ${listHtml(issues)}
    </div>
  `;
  setRaw(data || {});
  $("rawPanel").open = false;
}

function openGSCInspect(siteUrl, url) {
  const base = "https://search.google.com/search-console/inspect";
  const qs = `?resource_id=${encodeURIComponent(siteUrl)}&url=${encodeURIComponent(url)}`;
  chrome.tabs.create({ url: base + qs });
}

const PANEL_CONFIG = {
  navOverview: "panelOverview",
  navIndex: "panelIndex",
  navLive: "panelLive",
  navAnalytics: "panelAnalytics",
  navPerf: "panelPerf",
  navOnPage: "panelOnPage"
};

const PANEL_ENTER = {
  async panelOverview() {
    updateOverview();
  },
  async panelAnalytics() {
    try {
      await loadGaPropsOnce();
      const detection = await detectGaPropertyForTab();
      if (detection?.propertyId) {
        clearResult(`Matched GA4 property via <b>${escapeHtml(detection.via)}</b>: ${escapeHtml(detection.propertyName)}`, "gaResult");
      } else if (detection?.foundGIds?.length) {
        clearResult(`Found GA IDs on page: ${escapeHtml(detection.foundGIds.join(", "))}. No matching property was found in your account.`, "gaResult");
      } else {
        clearResult("", "gaResult");
      }
    } catch (error) {
      clearResult(`❌ ${escapeHtml(error.message || String(error))}`, "gaResult");
    }
  }
};

function showPanel(navId) {
  const panelId = PANEL_CONFIG[navId];
  if (!panelId) return;
  state.activePanel = panelId;
  Object.values(PANEL_CONFIG).forEach((id) => $(id)?.classList.add("hidden"));
  $(panelId)?.classList.remove("hidden");
  Object.keys(PANEL_CONFIG).forEach((id) => $(id)?.classList.remove("active"));
  $(navId)?.classList.add("active");

  const top = $("topControls");
  if (top) top.style.display = (panelId === "panelAnalytics") ? "none" : "";

  const enter = PANEL_ENTER[panelId];
  if (enter) enter();
}

async function setAccountLabel() {
  try {
    const response = await send({ type: "getAccount" });
    const idToken = response?.data || null;
    let email = "";
    if (idToken) {
      try {
        const base64Url = idToken.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        const payload = JSON.parse(new TextDecoder().decode(bytes));
        email = payload?.email || "";
      } catch {}
    }
    state.accountEmail = email;
    if ($("accountLabel")) $("accountLabel").textContent = email ? `Signed in as ${email}` : "";
    if ($("accountMini")) $("accountMini").textContent = email ? `Signed in: ${email}` : "Signed in: —";
    updateOverview();
  } catch (error) {
    console.warn(error);
  }
}

async function handleGaLoad() {
  const propertyId = $("gaProps")?.value;
  if (!propertyId) return clearResult("Pick a GA4 property first.", "gaResult");

  let startDate;
  let endDate;
  const range = $("gaRange").value;
  if (range === "custom") {
    startDate = $("gaStart").value;
    endDate = $("gaEnd").value || todayISO();
    if (!startDate) return clearResult("Select a custom start date.", "gaResult");
    if (startDate > endDate) return clearResult("Start date must be before end date.", "gaResult");
  } else {
    const days = Number(range);
    endDate = todayISO();
    startDate = daysAgoISO(days);
  }

  clearResult("Loading GA4…", "gaResult");
  const dimension = $("gaDim").value || "date";
  const current = await send({ type: "gaReport", propertyId, startDate, endDate, dimension });
  if (!current.ok) return clearResult(`❌ ${escapeHtml(current.error || "GA4 error")}`, "gaResult");

  let previousData = null;
  if ($("gaCompare")?.checked) {
    const msPerDay = 86400000;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const spanDays = Math.max(1, Math.round((end - start) / msPerDay) + 1);
    const prevEnd = new Date(start.getTime() - msPerDay);
    const prevStart = new Date(prevEnd.getTime() - (spanDays - 1) * msPerDay);
    const toIso = (value) => value.toISOString().slice(0, 10);
    const previous = await send({ type: "gaReport", propertyId, startDate: toIso(prevStart), endDate: toIso(prevEnd), dimension });
    if (previous.ok) previousData = previous.data;
  }

  renderGaReport(current.data, { start: startDate, end: endDate, dim: dimension }, previousData);
}

function renderGaReport(currentData, meta, previousData) {
  const container = $("gaResult");
  if (!currentData?.rows?.length) {
    container.innerHTML = `<div class="card">No GA4 data for ${escapeHtml(meta.start)} → ${escapeHtml(meta.end)}.</div>`;
    return;
  }

  const metricIndexByName = Object.fromEntries((currentData.metricHeaders || []).map((header, index) => [header.name, index]));
  const sums = {};
  for (const row of currentData.rows) {
    row.metricValues?.forEach((metricValue, index) => {
      const key = currentData.metricHeaders[index].name;
      sums[key] = (sums[key] || 0) + Number(metricValue.value || 0);
    });
  }

  let previousSums = null;
  if (previousData?.rows?.length) {
    previousSums = {};
    for (const row of previousData.rows) {
      row.metricValues?.forEach((metricValue, index) => {
        const key = previousData.metricHeaders[index].name;
        previousSums[key] = (previousSums[key] || 0) + Number(metricValue.value || 0);
      });
    }
  }

  const selectedMetric = $("gaMetric")?.value || "activeUsers";
  const metricIndex = metricIndexByName[selectedMetric] ?? 0;
  const series = currentData.rows.map((row) => Number(row.metricValues?.[metricIndex]?.value || 0));
  const kpi = (label, key) => {
    const value = sums[key] || 0;
    const prev = previousSums ? (previousSums[key] || 0) : null;
    const delta = gaPctDelta(value, prev);
    return `<div class="kpi"><h5>${label}</h5><span class="val">${gaNumber(value)}</span><span class="delta ${delta.cls}">${delta.text}</span></div>`;
  };

  const actions = [];
  if ((sums.sessions || 0) > 0 && (sums.activeUsers || 0) < (sums.sessions || 0) / 2) actions.push("Sessions are notably higher than active users. Review traffic quality and acquisition sources.");
  if ((sums.eventCount || 0) === 0) actions.push("No events were returned for this range. Confirm the selected property and date range.");
  if (!actions.length) actions.push("This report is healthy enough for exploration. Export it if you need to compare outside the extension.");

  const headers = (currentData.dimensionHeaders || []).map((header) => GA_DIM_LABELS[header.name] || header.name)
    .concat((currentData.metricHeaders || []).map((header) => header.name));
  const rows = currentData.rows.map((row) => {
    const dims = (row.dimensionValues || []).map((value) => `<td>${escapeHtml(value.value || "")}</td>`);
    const metrics = (row.metricValues || []).map((value) => `<td style="text-align:right">${gaNumber(value.value || 0)}</td>`);
    return `<tr>${dims.join("")}${metrics.join("")}</tr>`;
  }).join("");

  container.innerHTML = `
    <div class="card">
      <h4>GA4 Summary (${escapeHtml(meta.start)} → ${escapeHtml(meta.end)})</h4>
      <div class="kpi-grid">
        ${kpi("activeUsers", "activeUsers")}
        ${kpi("sessions", "sessions")}
        ${kpi("screenPageViews", "screenPageViews")}
        ${kpi("eventCount", "eventCount")}
      </div>
      ${meta.dim === "date" ? gaSparklineSVG(series) : ""}
      ${listHtml(actions)}
    </div>
    <div class="card">
      <h4>Breakdown by ${escapeHtml(GA_DIM_LABELS[meta.dim] || meta.dim)}</h4>
      <div style="max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:8px">
        <table class="table-compact">
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  $("gaExport").onclick = () => {
    const csv = gaToCSV(currentData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ga4-${meta.dim}-${meta.start}-${meta.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
}

async function runOnPageAudit() {
  const tab = await getActiveTab();
  if (!tab || !/^https?:/i.test(tab.url || "")) return clearResult("Open a public http(s) page to run the On-Page audit.");
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const abs = (href) => {
        try { return new URL(href, location.href).href; } catch { return null; }
      };
      const meta = (selector) => (document.querySelector(selector)?.getAttribute("content") || "").trim();
      const title = (document.title || "").trim();
      const metaDesc = meta('meta[name="description"]') || meta('meta[name="Description"]') || "";
      const robotsMeta = (meta('meta[name="robots"]') || meta('meta[name="ROBOTS"]')).toLowerCase();
      const canonical = abs(document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "") || "";
      let canonicalCrossDomain = false;
      try {
        if (canonical) {
          const canonicalHost = new URL(canonical).hostname.replace(/^www\./, "");
          const pageHost = location.hostname.replace(/^www\./, "");
          canonicalCrossDomain = canonicalHost && pageHost && canonicalHost !== pageHost;
        }
      } catch {}
      const h1Count = document.querySelectorAll("h1").length;
      const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
      const wordCount = bodyText ? bodyText.split(/\s+/).filter((word) => /\w/.test(word)).length : 0;
      const links = Array.from(document.querySelectorAll("a[href]"));
      let internalLinks = 0;
      let externalLinks = 0;
      links.forEach((link) => {
        const href = abs(link.getAttribute("href"));
        if (!href) return;
        try {
          const linkHost = new URL(href).hostname.replace(/^www\./, "");
          const pageHost = location.hostname.replace(/^www\./, "");
          if (linkHost === pageHost) internalLinks += 1;
          else externalLinks += 1;
        } catch {}
      });
      const images = Array.from(document.querySelectorAll("img"));
      const imgMissingAlt = images.filter((img) => !img.hasAttribute("alt") || String(img.getAttribute("alt")).trim() === "").length;
      const ldTypes = [];
      Array.from(document.querySelectorAll('script[type="application/ld+json"]')).forEach((script) => {
        try {
          const json = JSON.parse(script.textContent || "null");
          const collect = (obj) => {
            if (!obj) return;
            if (Array.isArray(obj)) return obj.forEach(collect);
            const type = obj["@type"];
            if (typeof type === "string") ldTypes.push(type);
            else if (Array.isArray(type)) type.forEach((entry) => typeof entry === "string" && ldTypes.push(entry));
            if (obj["@graph"]) collect(obj["@graph"]);
          };
          collect(json);
        } catch {}
      });
      return {
        url: location.href,
        title,
        metaDesc,
        robotsMeta,
        canonical,
        canonicalCrossDomain,
        h1Count,
        wordCount,
        internalLinks,
        externalLinks,
        imgCount: images.length,
        imgMissingAlt,
        ldTypes: Array.from(new Set(ldTypes))
      };
    }
  });
  renderOnPage(result || {});
}

async function init() {
  $("version").textContent = `v${chrome.runtime.getManifest().version || "0"}`;
  clearResult("Sign in if prompted, then pick your property.");

  Object.keys(PANEL_CONFIG).forEach((navId) => {
    $(navId)?.addEventListener("click", () => showPanel(navId));
  });

  $("gaRange").addEventListener("change", () => {
    $("gaCustom").style.display = $("gaRange").value === "custom" ? "grid" : "none";
  });

  $("gaLoad").addEventListener("click", handleGaLoad);

  $("copyRaw").addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const raw = $("raw")?.textContent || "";
    if (!raw) return;
    await navigator.clipboard.writeText(raw);
    $("copyRaw").textContent = "Copied";
    setTimeout(() => {
      if ($("copyRaw")) $("copyRaw").textContent = "Copy JSON";
    }, 1200);
  });

  $("inspectUrl").addEventListener("input", () => {
    updateActionStates();
    updateOverview();
  });
  $("sites").addEventListener("change", () => {
    updateActionStates();
    updateOverview();
  });

  qsa(".pill").forEach((pill) => pill.addEventListener("click", () => {
    qsa(".pill").forEach((entry) => entry.classList.remove("active"));
    pill.classList.add("active");
    state.perf.range = pill.dataset.range;
    const isCustom = state.perf.range === "custom";
    $("customRange").classList.toggle("hidden", !isCustom);
    if (!isCustom) {
      $("dateStart").value = "";
      $("dateEnd").value = "";
    }
    updateActionStates();
  }));

  $("scopeSwitch").addEventListener("click", () => {
    $("scopeSwitch").classList.toggle("on");
    state.perf.wholeProperty = $("scopeSwitch").classList.contains("on");
    updateActionStates();
    updateOverview();
  });

  $("refreshSites").onclick = async () => {
    clearResult("Loading properties…");
    const response = await send({ type: "listSites" });
    if (!response.ok) return clearResult(`Failed to load properties: ${escapeHtml(response.error)}`);
    setSites(response.data);
    const url = normalizeUrl($("inspectUrl")?.value?.trim() || "");
    if (url) {
      const best = chooseBestProperty(response.data, url);
      if (best) $("sites").value = best;
    }
    clearResult("");
    updateOverview();
  };

  $("inspect").onclick = async () => {
    const ctx = getSelectionContext();
    if (!ctx.normalizedUrl) return clearResult("Enter a valid public http(s) URL.");
    if (!ctx.covers) return clearResult("Selected property does not cover this URL.");
    clearResult("Inspecting…");
    const response = await send({ type: "inspect", siteUrl: ctx.siteUrl, url: ctx.normalizedUrl });
    if (!response.ok) return clearResult(`❌ ${escapeHtml(response.error)}`);
    renderIndexing(response.data);
  };

  $("openGSC").onclick = () => {
    const ctx = getSelectionContext();
    if (ctx.siteUrl && ctx.normalizedUrl) openGSCInspect(ctx.siteUrl, ctx.normalizedUrl);
  };

  $("liveTest").onclick = async () => {
    const ctx = getSelectionContext();
    if (!ctx.normalizedUrl) return clearResult("Live Test needs a public http(s) URL.");
    if (!ctx.covers) return clearResult("Live Test requires a property that covers this URL.");
    clearResult("Running Lighthouse live test…");
    const response = await send({ type: "liveTest", siteUrl: ctx.siteUrl, url: ctx.normalizedUrl });
    if (!response.ok) return clearResult(`❌ ${escapeHtml(response.error)}`);
    renderPSI(response.data);
  };

  $("openLiveGSC").onclick = () => {
    const ctx = getSelectionContext();
    if (ctx.siteUrl && ctx.normalizedUrl) openGSCInspect(ctx.siteUrl, ctx.normalizedUrl);
  };

  $("loadPerf").onclick = async () => {
    const ctx = getSelectionContext();
    if (!ctx.siteUrl) return clearResult("Select a property.");
    if (!ctx.wholeProperty) {
      if (!ctx.normalizedUrl) return clearResult("Enter a valid public URL for page-level performance.");
      if (!ctx.covers) return clearResult("Selected property does not cover this URL.");
    }

    const today = new Date();
    const clampTo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
    const clampIso = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    let startDate;
    let endDate;
    if (state.perf.range === "custom") {
      startDate = $("dateStart").value || "";
      endDate = $("dateEnd").value || clampIso(clampTo);
      if (!startDate) return clearResult("Pick a start date.");
      if (startDate > endDate) return clearResult("Start date must be before end date.");
      if (endDate > clampIso(clampTo)) endDate = clampIso(clampTo);
    } else {
      const days = Number(state.perf.range || 30);
      endDate = clampIso(clampTo);
      startDate = daysAgoISO(days + 2);
    }

    clearResult("Loading performance…");
    const response = await send({
      type: "perf",
      siteUrl: ctx.siteUrl,
      url: ctx.wholeProperty ? null : ctx.normalizedUrl,
      startDate,
      endDate,
      pageOnly: !ctx.wholeProperty
    });
    if (!response.ok) return clearResult(`❌ ${escapeHtml(response.error)}`);
    renderPerf(response.data, { start: startDate, end: endDate, wholeProperty: ctx.wholeProperty });
  };

  $("runOnPage").onclick = runOnPageAudit;

  $("logout").onclick = async (event) => {
    event.preventDefault();
    await send({ type: "logout" });
    state.accountEmail = "";
    if ($("accountLabel")) $("accountLabel").textContent = "";
    if ($("accountMini")) $("accountMini").textContent = "Signed in: —";
    clearResult("Signed out. Reload properties to sign in again.");
    updateOverview();
  };

  await setAccountLabel();

  const activeTabUrl = normalizeUrl(await getActiveTabUrl());
  if (activeTabUrl) $("inspectUrl").value = activeTabUrl;

  const sitesResponse = await send({ type: "listSites" }).catch((error) => ({ ok: false, error: String(error) }));
  if (!sitesResponse.ok) {
    clearResult(`Failed to load properties: ${escapeHtml(sitesResponse.error)}`);
  } else {
    setSites(sitesResponse.data);
    if (activeTabUrl) {
      const best = chooseBestProperty(sitesResponse.data, activeTabUrl);
      if (best) $("sites").value = best;
    }
    clearResult("");
  }

  updateOverview();
  updateActionStates();
  showPanel("navOverview");
  detectGaPropertyForTab();
}

const start = () => safe(init);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
