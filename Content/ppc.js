// content/ppc.js — PPC (Google Ads via GA4) — polished UI, scoped CSS
// No paid APIs. Requires GA4↔Google Ads linking.

(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // ---------- Scoped styles (no conflicts) ----------
  const css = `
#navPpc{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:12px;background:var(--card);color:#b8c7be;border:1px solid var(--hair);cursor:pointer;transition:transform .08s,box-shadow .15s,background .15s,color .15s}
#navPpc:hover{background:rgba(26,34,38,.55);color:var(--text)}
#navPpc.active{color:var(--text);border-color:rgba(31,184,107,.45);box-shadow:0 0 0 1px rgba(31,184,107,.25) inset,0 10px 28px rgba(31,184,107,.10);background:linear-gradient(180deg,rgba(31,184,107,.16),rgba(31,184,107,.06))}
#navPpc svg{width:18px;height:18px;opacity:.95}

#panelPpc .ppc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
#panelPpc .ppc-title{font-size:18px;margin:0}
#panelPpc .ppc-badge{font-size:11px;padding:4px 10px;border-radius:999px;border:1px solid var(--hair);background:linear-gradient(180deg,rgba(31,184,107,.14),rgba(31,184,107,.06));color:var(--text)}

#panelPpc .ppc-card{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02)),var(--card);border:1px solid var(--hair);border-radius:14px;padding:12px;margin-top:10px}
#panelPpc .ppc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#panelPpc .span-2{grid-column:1 / -1}
#panelPpc label{font-size:12px;color:var(--muted);display:block;margin-bottom:6px}
#panelPpc input{height:38px;border-radius:10px;border:1px solid var(--hair);background:var(--card);color:var(--text);padding:0 12px;width:100%}

#panelPpc .ppc-actions{display:flex;gap:10px;align-items:center;margin-top:6px}
#panelPpc .ppc-actions .primary{flex:1 1 auto;background:linear-gradient(180deg,rgba(31,184,107,.22),rgba(31,184,107,.10));border:1px solid rgba(31,184,107,.45);border-radius:12px;height:38px;color:var(--text);cursor:pointer}
#panelPpc .ppc-actions .secondary{border:1px solid var(--hair);border-radius:12px;height:38px;background:var(--card);color:var(--text);padding:0 12px;cursor:pointer}

#panelPpc .ppc-note{font-size:12px;color:var(--muted)}
#panelPpc .loader{height:6px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.05);border:1px solid var(--hair);margin-top:6px}
#panelPpc .loader::after{content:"";display:block;height:100%;width:35%;background:rgba(31,184,107,.55);animation:ppcSlide 1.1s infinite}
@keyframes ppcSlide{0%{margin-left:-35%}50%{margin-left:30%}100%{margin-left:100%}}

#panelPpc table{width:100%;border-collapse:collapse;margin-top:10px}
#panelPpc thead th{position:sticky;top:0;background:rgba(22,30,34,.7);z-index:1;text-align:left;padding:8px 10px;border-bottom:1px solid var(--hair);font-weight:600;color:var(--muted)}
#panelPpc tbody td{padding:8px 10px;border-top:1px solid var(--hair)}
#panelPpc tbody tr:nth-child(odd){background:rgba(255,255,255,.02)}
  `;
  const styleId = "ppc-styles";
  if (!document.getElementById(styleId)) {
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------- Sidebar button (place inside true .nav, not credits) ----------
  function mountTab() {
    const nav = document.querySelector(".sidebar .nav");
    if (!nav || document.getElementById("navPpc")) return;

    const btn = document.createElement("button");
    btn.id = "navPpc";
    btn.title = "PPC (Google Ads via GA4)";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 20h18"></path><path d="M6 20V10"></path><path d="M12 20V6"></path><path d="M18 20v-6"></path>
      </svg>
      <span>PPC</span>`;
    btn.addEventListener("click", () => showPanel("panelPpc"));
    nav.appendChild(btn);
  }

  // ---------- Panel ----------
  function mountPanel() {
    if (document.getElementById("panelPpc")) return;
    const content = document.querySelector(".main .content") || document.querySelector(".main");
    const panel = document.createElement("section");
    panel.id = "panelPpc";
    panel.className = "section hidden";
    panel.innerHTML = `
      <div class="ppc-head">
        <h2 class="ppc-title">Google Ads (via GA4)</h2>
        <span class="ppc-badge">No paid APIs</span>
      </div>

      <div class="ppc-card">
        <div class="ppc-grid">
          <div class="span-2">
            <label>GA4 Property ID</label>
            <input id="ppcProp" placeholder="e.g. 123456789" />
          </div>

          <div>
            <label>Start date</label>
            <input id="ppcFrom" type="date" />
          </div>
          <div>
            <label>End date</label>
            <input id="ppcTo" type="date" />
          </div>

          <div class="span-2">
            <label>Lead events (comma-separated)</label>
            <input id="ppcLeads" value="generate_lead,form_submit,purchase" />
          </div>
        </div>

        <div class="ppc-actions">
          <button id="ppcFetch" class="primary">Fetch Campaigns</button>
          <button id="ppcCsv" class="secondary">Export CSV</button>
        </div>
        <div class="ppc-note">Tip: Property must be linked to Google Ads to see Ads clicks/impressions.</div>
      </div>

      <div id="ppcResult"></div>
    `;
    content.appendChild(panel);

    // Defaults
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    $("#ppcFrom").value = toISO(from);
    $("#ppcTo").value = toISO(to);

    // Restore last values
    chrome.storage.local.get(["ppcProp", "ppcLeads"]).then((st) => {
      if (st.ppcProp) $("#ppcProp").value = st.ppcProp;
      if (st.ppcLeads) $("#ppcLeads").value = st.ppcLeads;
    });

    $("#ppcFetch").addEventListener("click", loadPpc);
    $("#ppcCsv").addEventListener("click", exportCsv);
  }

  // ---------- Navigation helper ----------
  function showPanel(id) {
    $$(".section").forEach((s) => s.classList.add("hidden"));
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
    $$(".sidebar .nav button").forEach((b) => b.classList.remove("active"));
    const tab = document.getElementById("navPpc");
    if (tab) tab.classList.add("active");

    // Hide the GSC top controls if your app does it for Analytics; keep visible otherwise.
    const top = document.getElementById("topControls");
    if (top) top.style.display = ""; // keep as-is for PPC
  }

  // ---------- Data / render ----------
  let lastRows = [];

  async function loadPpc() {
    const propertyId = $("#ppcProp").value.trim();
    const startDate = toISO($("#ppcFrom").value);
    const endDate = toISO($("#ppcTo").value);
    const leadEvents = $("#ppcLeads").value.split(",").map((s) => s.trim()).filter(Boolean);

    if (!propertyId) return paint(`<div class="ppc-card">Enter GA4 Property ID.</div>`);
    paint(`<div class="ppc-card">Loading…<div class="loader"></div></div>`);

    // persist inputs
    chrome.storage.local.set({ ppcProp: propertyId, ppcLeads: $("#ppcLeads").value });

    const msg = { type: "ga.adsCampaigns", propertyId, startDate, endDate, leadEvents };
    const res = await chrome.runtime.sendMessage(msg).catch((e) => ({ ok: false, error: String(e) }));
    if (!res?.ok) return paint(`<div class="ppc-card">❌ ${escapeHtml(res?.error || "Request failed")}</div>`);

    lastRows = res.data.rows || [];
    if (!lastRows.length) {
      return paint(`<div class="ppc-card">No Google Ads data for ${startDate} → ${endDate}. Check GA4↔Ads linking or date range.</div>`);
    }

    const rows = lastRows.map(r => `
      <tr>
        <td>${escapeHtml(r.campaign || "(no name)")}</td>
        <td style="text-align:right">${nf(r.clicks)}</td>
        <td style="text-align:right">${nf(r.impressions)}</td>
        <td style="text-align:right">${pct(r.ctr)}</td>
        <td style="text-align:right">${nf(r.leads)}</td>
      </tr>`).join("");

    paint(`
      <div class="ppc-card">
        <div class="ppc-head"><div class="ppc-note">${startDate} → ${endDate}</div></div>
        <div style="max-height:300px;overflow:auto;border:1px solid var(--hair);border-radius:10px">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th style="text-align:right">Clicks</th>
                <th style="text-align:right">Impressions</th>
                <th style="text-align:right">CTR</th>
                <th style="text-align:right">Leads</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `);
  }

  function exportCsv() {
    if (!lastRows.length) return;
    const head = ["Campaign", "Clicks", "Impressions", "CTR (%)", "Leads"];
    const csv = [head.join(",")].concat(
      lastRows.map((r) => [q(r.campaign), r.clicks, r.impressions, r.ctr, r.leads].join(","))
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ppc_campaigns_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- utils ----------
  function paint(html) { const box = $("#ppcResult"); if (box) box.innerHTML = html; }
  function toISO(d) { if (!d) return ""; const dt = (d instanceof Date) ? d : new Date(d); return dt.toISOString().slice(0,10); }
  function nf(n) { return (Number(n) || 0).toLocaleString(); }
  function pct(n) { return `${(Number(n) || 0).toFixed(2)}%`; }
  function q(s) { return `"${String(s || "").replace(/"/g, '""')}"`; }
  function escapeHtml(s) { return String(s || "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  // ---------- boot ----------
  mountTab();
  mountPanel();
})();
