const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PERSONAL_TYPES = ["birthday", "anniversary", "custom"];
const FESTIVAL_TYPES = ["festival", "national", "remembrance"];

let editingId = null;
let festFilter = "all";
let festMonthFilter = "all";
let personalMonthFilter = "all";
let festRegionFilter = "mine"; // "mine" = only the regions chosen in the Region section; "all" = every built-in

function fillMonthDay(monthSelId, daySelId) {
  const monthSel = document.getElementById(monthSelId);
  MONTHS.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i + 1; opt.textContent = m;
    monthSel.appendChild(opt);
  });
  const daySel = document.getElementById(daySelId);
  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    daySel.appendChild(opt);
  }
}

// Small pill showing which country an occasion belongs to. Personal occasions
// and anything the person added (no `regions`) get no badge.
function regionBadgeHTML(o) {
  if (!o.regions || !o.regions.length) return "";
  let label;
  if (o.regions.length === 1) label = o.regions[0] === "GLOBAL" ? "International" : o.regions[0];
  else label = o.regions.includes("GLOBAL") ? "International" : `${o.regions.length} countries`;
  const title = o.regions.map(countryName).join(", ");
  return `<span class="region-badge" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
}

function occasionRowHTML(o, isLocked) {
  const lunarBadge = o.recurrence === "lunar"
    ? `<span class="lunar-badge" title="Date shifts yearly on the lunar calendar — update it manually each year">lunar</span>`
    : o.recurrence === "auto-synced"
      ? `<span class="lunar-badge" title="Date kept fresh automatically from Google's public holiday calendar (it can shift year to year)">auto-synced</span>`
      : "";
  const onceBadge = o.occurrence === "once"
    ? `<span class="once-badge" title="One-time event — won't repeat next year">once${o.year ? " · " + o.year : ""}</span>`
    : "";
  // A gcal-* id that's in the "user edited" set no longer gets refreshed by
  // sync — it was hand-edited or removed at some point (possibly by an
  // earlier version of the extension) and is now silently stuck on
  // whatever month/day it last had, which can go stale/disappear for
  // shifting lunar festivals (e.g. Ganesh Chaturthi, Janmashtami). Surface
  // that state and offer a one-click way out instead of leaving it silent.
  const lockedBadge = isLocked
    ? `<span class="lunar-badge locked-badge" title="Won't auto-update from Google's calendar anymore because this was edited or removed at some point. Click Resync to let it auto-update again.">locked</span>`
    : "";
  const resyncBtn = isLocked
    ? `<button class="occ-resync" data-id="${o.id}" data-name="${escapeHtml(o.name)}" title="Let this festival auto-update from Google's calendar again">Resync</button>`
    : "";
  return `
    <div class="occ-card" data-id="${o.id}">
      <div class="occ-body">
        <div class="occ-name">${escapeHtml(o.name)} ${regionBadgeHTML(o)}${lunarBadge}${onceBadge}${lockedBadge}</div>
        <div class="occ-meta">${escapeHtml(OCCASION_TYPES[o.type] || o.type)} · ${MONTHS[o.month - 1]} ${o.day}${o.note ? " · " + escapeHtml(o.note) : ""}</div>
      </div>
      <div class="occ-actions">
        ${resyncBtn}
        <button class="occ-edit" data-id="${o.id}" title="Edit">Edit</button>
        <button class="occ-remove" data-id="${o.id}" data-name="${escapeHtml(o.name)}" title="Remove">Remove</button>
      </div>
    </div>
  `;
}

function occasionEditHTML(o, typeOptionsList) {
  const monthOpts = MONTHS.map((m, i) => `<option value="${i + 1}" ${o.month === i + 1 ? "selected" : ""}>${m}</option>`).join("");
  const dayOpts = Array.from({ length: 31 }, (_, i) => i + 1).map(d => `<option value="${d}" ${o.day === d ? "selected" : ""}>${d}</option>`).join("");
  const typeOpts = typeOptionsList.map(k => `<option value="${k}" ${o.type === k ? "selected" : ""}>${OCCASION_TYPES[k]}</option>`).join("");
  const rec = o.recurrence || "fixed";
  const isPersonal = PERSONAL_TYPES.includes(o.type) || typeOptionsList === PERSONAL_TYPES;
  const occ = o.occurrence || "yearly";
  const dateTypeRow = isPersonal
    ? `
      <div class="recurrence-row">
        <span class="recurrence-label">Repeats</span>
        <label class="radio-pill"><input type="radio" name="editOccurrence-${o.id}" class="edit-occurrence" value="yearly" ${occ === "yearly" ? "checked" : ""} /> Every year</label>
        <label class="radio-pill"><input type="radio" name="editOccurrence-${o.id}" class="edit-occurrence" value="once" ${occ === "once" ? "checked" : ""} /> Just once</label>
      </div>
      <div class="row" ${occ === "once" ? "" : "hidden"} id="editYearRow-${o.id}">
        <input type="number" class="edit-year" value="${o.year || ""}" placeholder="Year — e.g. 2026" min="1900" max="2200" />
      </div>`
    : `
      <div class="recurrence-row">
        <span class="recurrence-label">Date type</span>
        <label class="radio-pill"><input type="radio" name="editRecurrence-${o.id}" class="edit-recurrence" value="fixed" ${rec === "fixed" ? "checked" : ""} /> Fixed — same date every year</label>
        <label class="radio-pill"><input type="radio" name="editRecurrence-${o.id}" class="edit-recurrence" value="lunar" ${rec === "lunar" ? "checked" : ""} /> Lunar — shifts yearly</label>
      </div>`;
  return `
    <div class="occ-card occ-card-editing" data-id="${o.id}">
      <div class="edit-grid">
        <input type="text" class="edit-name" value="${escapeHtml(o.name)}" maxlength="60" />
        <select class="edit-type">${typeOpts}</select>
        <select class="edit-month">${monthOpts}</select>
        <select class="edit-day">${dayOpts}</select>
        <input type="text" class="edit-note" value="${escapeHtml(o.note || "")}" placeholder="Note (optional)" maxlength="60" />
      </div>
      ${dateTypeRow}
      <div class="edit-actions">
        <button class="btn-primary edit-save" data-id="${o.id}" style="max-width:100px;">Save</button>
        <button type="button" class="btn-secondary edit-cancel" data-id="${o.id}">Cancel</button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function wireRowActions(container, typeOptionsList, occasionsById) {
  container.querySelectorAll(".occ-remove").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!btn.classList.contains("confirm-remove")) {
        container.querySelectorAll(".occ-remove.confirm-remove").forEach(b => resetRemoveBtn(b));
        armRemoveBtn(btn);
        return;
      }
      await removeOccasion(btn.dataset.id);
      chrome.runtime.sendMessage({ type: "occasions-updated" });
      renderAll();
    });
  });
  container.querySelectorAll(".occ-edit").forEach(btn => {
    btn.addEventListener("click", () => {
      editingId = btn.dataset.id;
      renderAll();
    });
  });
  container.querySelectorAll(".occ-resync").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      btn.textContent = "Resyncing…";
      await unmarkUserEdited(btn.dataset.id);
      const result = await chrome.runtime.sendMessage({ type: "force-calendar-sync" });
      if (!result?.ok) {
        // Sync failed (offline, feed down, etc.) — the lock is still cleared,
        // so the next successful sync (auto or manual) will pick it up.
        // Leave a visible status message rather than failing silently.
        showCsvStatus(`Unlocked "${btn.dataset.name}" but couldn't reach Google's calendar to refresh it yet — it'll update on the next successful sync.`);
      }
      await renderAll();
    });
  });
  container.querySelectorAll(".edit-cancel").forEach(btn => {
    btn.addEventListener("click", () => { editingId = null; renderAll(); });
  });
  container.querySelectorAll(".edit-save").forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".occ-card-editing");
      const name = card.querySelector(".edit-name").value.trim();
      const type = card.querySelector(".edit-type").value;
      const month = card.querySelector(".edit-month").value;
      const day = card.querySelector(".edit-day").value;
      const note = card.querySelector(".edit-note").value.trim();
      const recurrence = card.querySelector(".edit-recurrence:checked")?.value || "fixed";
      const occurrenceInput = card.querySelector(".edit-occurrence:checked");
      const occurrence = occurrenceInput?.value; // undefined for festival-type edits, which don't show this control
      const year = card.querySelector(".edit-year")?.value;
      if (!name) return;
      if (occurrence === "once" && !year) {
        card.querySelector(".edit-year").focus();
        return;
      }
      await updateOccasion(btn.dataset.id, { name, type, month, day, note, recurrence, occurrence, year });
      editingId = null;
      chrome.runtime.sendMessage({ type: "occasions-updated" });
      renderAll();
    });
  });
  container.querySelectorAll(".edit-occurrence").forEach(radio => {
    radio.addEventListener("change", () => {
      const card = radio.closest(".occ-card-editing");
      const yearRow = card.querySelector('[id^="editYearRow-"]');
      const isOnce = card.querySelector(".edit-occurrence:checked")?.value === "once";
      if (yearRow) yearRow.hidden = !isOnce;
    });
  });
}

function armRemoveBtn(btn) {
  btn.classList.add("confirm-remove");
  btn.textContent = "Confirm?";
}

function resetRemoveBtn(btn) {
  btn.classList.remove("confirm-remove");
  btn.textContent = "Remove";
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".occ-remove")) {
    document.querySelectorAll(".occ-remove.confirm-remove").forEach(b => resetRemoveBtn(b));
  }
});

function fillMonthFilter(selectId) {
  const sel = document.getElementById(selectId);
  MONTHS.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i + 1;
    opt.textContent = m;
    sel.appendChild(opt);
  });
}

async function renderPersonal(all) {
  let list = all.filter(o => PERSONAL_TYPES.includes(o.type));
  if (personalMonthFilter !== "all") list = list.filter(o => o.month === Number(personalMonthFilter));
  list.sort((a, b) => (a.month - b.month) || (a.day - b.day) || a.name.localeCompare(b.name));
  const el = document.getElementById("personalList");
  if (!list.length) {
    el.innerHTML = `<div class="empty-state">${personalMonthFilter === "all" ? "No personal occasions yet — add one below." : `Nothing in ${MONTHS[personalMonthFilter - 1]}.`}</div>`;
    return;
  }
  el.innerHTML = list.map(o => o.id === editingId ? occasionEditHTML(o, PERSONAL_TYPES) : occasionRowHTML(o)).join("");
  wireRowActions(el, PERSONAL_TYPES);
}

function renderFestFilters(all) {
  const festivals = all.filter(o => FESTIVAL_TYPES.includes(o.type));
  const counts = {
    all: festivals.length,
    festival: festivals.filter(o => o.type === "festival").length,
    national: festivals.filter(o => o.type === "national").length,
    remembrance: festivals.filter(o => o.type === "remembrance").length,
    "needs-update": festivals.filter(o => o.recurrence === "lunar").length // manual lunar entries only — auto-synced ones don't need a manual nudge
  };
  const row = document.getElementById("festFilterRow");
  const chips = [
    ["all", "All"],
    ["festival", OCCASION_TYPES.festival],
    ["national", OCCASION_TYPES.national],
    ["remembrance", OCCASION_TYPES.remembrance],
    ["needs-update", "Needs yearly update"]
  ];
  row.innerHTML = chips.map(([key, label]) => `
    <button type="button" class="filter-chip ${festFilter === key ? "active" : ""}" data-key="${key}">
      ${label} <span class="filter-count">${counts[key] ?? 0}</span>
    </button>
  `).join("");
  row.querySelectorAll(".filter-chip").forEach(btn => {
    btn.addEventListener("click", () => { festFilter = btn.dataset.key; renderAll(); });
  });
}

async function renderFestivals(all, prefs) {
  const inScope = festRegionFilter === "mine" ? all.filter(o => occasionVisible(o, prefs)) : all;
  renderFestFilters(inScope);
  let list = inScope.filter(o => FESTIVAL_TYPES.includes(o.type));
  if (festFilter === "festival" || festFilter === "national" || festFilter === "remembrance") list = list.filter(o => o.type === festFilter);
  if (festFilter === "needs-update") list = list.filter(o => o.recurrence === "lunar");
  if (festMonthFilter !== "all") list = list.filter(o => o.month === Number(festMonthFilter));
  list.sort((a, b) => (a.month - b.month) || (a.day - b.day) || a.name.localeCompare(b.name));

  const el = document.getElementById("festList");
  if (!list.length) {
    const hint = festRegionFilter === "mine" && festMonthFilter === "all"
      ? "Nothing here — pick a country in the Region section above, or switch Show to “All regions”."
      : (festMonthFilter === "all" ? "Nothing here." : `Nothing in ${MONTHS[festMonthFilter - 1]}.`);
    el.innerHTML = `<div class="empty-state">${hint}</div>`;
    return;
  }
  const editedIds = await getEditedIds();
  el.innerHTML = list.map(o => o.id === editingId
    ? occasionEditHTML(o, FESTIVAL_TYPES)
    : occasionRowHTML(o, o.id.startsWith("gcal-") && editedIds.has(o.id))
  ).join("");
  wireRowActions(el, FESTIVAL_TYPES);
}

// Locked-but-missing festivals (see getOrphanedLockedFestivals in
// calendar-sync.js): removed at some point, then permanently skipped by
// every sync since because removal locks the id. No occasion row exists
// for these, so occasionRowHTML's per-row "locked" badge never gets a
// chance to render — this banner is the only way to surface and recover
// them, distinct from the still-visible-but-stale case.
async function renderOrphanedFestivals() {
  const el = document.getElementById("orphanedFestivals");
  if (!el) return;
  const orphans = await getOrphanedLockedFestivals();
  if (!orphans.length) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <div class="orphan-banner">
      <div class="orphan-banner-text">
        <strong>${orphans.length} festival${orphans.length === 1 ? "" : "s"} removed earlier ${orphans.length === 1 ? "is" : "are"} no longer syncing:</strong>
        ${orphans.map(o => escapeHtml(o.name)).join(", ")}.
        They won't come back on their own — restore them to resume auto-updates.
      </div>
      <div class="orphan-banner-actions">
        ${orphans.map(o => `<button class="orphan-restore" data-id="${o.id}" data-name="${escapeHtml(o.name)}">Restore ${escapeHtml(o.name)}</button>`).join("")}
      </div>
    </div>
  `;
  el.querySelectorAll(".orphan-restore").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Restoring…";
      await unmarkUserEdited(btn.dataset.id);
      const result = await chrome.runtime.sendMessage({ type: "force-calendar-sync" });
      if (!result?.ok) {
        showCsvStatus(`Unlocked "${btn.dataset.name}" but couldn't reach Google's calendar to restore it yet — it'll come back on the next successful sync.`);
      }
      await renderAll();
    });
  });
}

async function renderAll() {
  const [all, prefs] = await Promise.all([getUserOccasions(), getRegionPrefs()]);
  renderRegionSection(prefs);
  await renderPersonal(all);
  await renderFestivals(all, prefs);
  await renderOrphanedFestivals();
}

// ---- Region section ---------------------------------------------------------

let regionSearchText = "";

function renderRegionSection(prefs) {
  document.querySelectorAll('input[name="regionMode"]').forEach(r => { r.checked = r.value === prefs.mode; });

  const grid = document.getElementById("regionGrid");
  const scrollTop = grid.scrollTop; // keep the list where it was when it re-renders after a click
  grid.classList.toggle("is-disabled", prefs.mode === "all");
  const q = regionSearchText.trim().toLowerCase();
  // Selected countries always stay visible, even when they don't match the search.
  const shown = COUNTRIES.filter(c => !q || prefs.countries.includes(c.code) ||
    `${c.name} ${c.aliases || ""} ${c.code}`.toLowerCase().includes(q));
  grid.innerHTML = shown.map(c => `
    <label class="radio-pill">
      <input type="checkbox" class="region-country" value="${c.code}" ${prefs.countries.includes(c.code) ? "checked" : ""} ${prefs.mode === "all" ? "disabled" : ""} />
      ${escapeHtml(c.name)}
    </label>`).join("") || `<span class="region-empty">No country matches “${escapeHtml(regionSearchText)}”.</span>`;
  grid.scrollTop = scrollTop;

  const globalToggle = document.getElementById("globalToggle");
  globalToggle.checked = prefs.mode === "all" ? true : prefs.includeGlobal;
  globalToggle.disabled = prefs.mode === "all"; // "All countries" already includes international days

  const notes = [`Showing: ${regionSummary(prefs)}${prefs.mode === "selected" && prefs.includeGlobal ? ", plus international days" : ""}.`];
  if (prefs.mode === "selected" && !prefs.countries.length) {
    notes.push(prefs.includeGlobal
      ? "No country selected yet — you'll see international days and your own occasions."
      : "No country selected and international days are off — you'll only see your own occasions.");
  }
  if (!showBtbActivities(prefs)) {
    notes.push("Born To Banger activity ideas are only shown when India is selected.");
  }
  document.getElementById("regionNote").textContent = notes.join(" ");
}

function readRegionPrefsFromDom() {
  const mode = document.querySelector('input[name="regionMode"]:checked')?.value === "all" ? "all" : "selected";
  const countries = Array.from(document.querySelectorAll(".region-country:checked")).map(el => el.value);
  const includeGlobal = document.getElementById("globalToggle").checked;
  return { mode, countries, includeGlobal };
}

async function saveRegionPrefs() {
  await setRegionPrefs(readRegionPrefsFromDom());
  chrome.runtime.sendMessage({ type: "occasions-updated" }); // refresh toolbar badge
  await renderAll();
  // Pull any live feeds the new selection needs (no-op if it needs none).
  const result = await chrome.runtime.sendMessage({ type: "force-calendar-sync", onlyNew: true });
  await renderSyncStatus();
  if (result?.ok && !result.skipped) await renderAll();
}

function initRegionSection() {
  document.querySelectorAll('input[name="regionMode"]').forEach(r => r.addEventListener("change", saveRegionPrefs));
  document.getElementById("regionGrid").addEventListener("change", (e) => {
    if (e.target.classList.contains("region-country")) saveRegionPrefs();
  });
  document.getElementById("globalToggle").addEventListener("change", saveRegionPrefs);
  document.getElementById("regionSearch").addEventListener("input", async (e) => {
    regionSearchText = e.target.value;
    renderRegionSection(await getRegionPrefs());
  });
}

function showCsvStatus(msg) {
  const el = document.getElementById("csvStatus");
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 5000);
}

document.getElementById("exportCsv").addEventListener("click", async () => {
  const occasions = await getUserOccasions();
  const csv = occasionsToCSV(occasions);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "occasion-radar-occasions.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById("importCsvInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const { added, total } = await importOccasionsCSV(text);
  e.target.value = "";
  if (added === 0) {
    showCsvStatus("No valid rows found. Check the CSV format above.");
    return;
  }
  showCsvStatus(`Imported ${added} occasion${added === 1 ? "" : "s"}. ${total} total now.`);
  chrome.runtime.sendMessage({ type: "occasions-updated" });
  renderAll();
});

document.getElementById("personalForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("pName").value.trim();
  const type = document.getElementById("pType").value;
  const month = document.getElementById("pMonth").value;
  const day = document.getElementById("pDay").value;
  const note = document.getElementById("pNote").value.trim();
  const occurrence = document.querySelector('input[name="pOccurrence"]:checked')?.value || "yearly";
  const year = document.getElementById("pYear").value;
  if (!name) return;
  if (occurrence === "once" && !year) {
    document.getElementById("pYear").focus();
    return;
  }
  await addOccasion({ name, month, day, type, note, recurrence: "fixed", occurrence, year });
  document.getElementById("pName").value = "";
  document.getElementById("pNote").value = "";
  document.getElementById("pYear").value = "";
  document.querySelector('input[name="pOccurrence"][value="yearly"]').checked = true;
  document.getElementById("pYearRow").hidden = true;
  chrome.runtime.sendMessage({ type: "occasions-updated" });
  renderAll();
});

document.querySelectorAll('input[name="pOccurrence"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const isOnce = document.querySelector('input[name="pOccurrence"]:checked')?.value === "once";
    document.getElementById("pYearRow").hidden = !isOnce;
  });
});

document.getElementById("festForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("fName").value.trim();
  const type = document.getElementById("fType").value;
  const month = document.getElementById("fMonth").value;
  const day = document.getElementById("fDay").value;
  const note = document.getElementById("fNote").value.trim();
  const recurrence = document.querySelector('input[name="fRecurrence"]:checked')?.value || "fixed";
  if (!name) return;
  await addOccasion({ name, month, day, type, note, recurrence });
  document.getElementById("fName").value = "";
  document.getElementById("fNote").value = "";
  chrome.runtime.sendMessage({ type: "occasions-updated" });
  renderAll();
});

async function initNewTabToggle() {
  const toggle = document.getElementById("newTabToggle");
  toggle.checked = await getUseNewTab();
  toggle.addEventListener("change", async () => {
    await setUseNewTab(toggle.checked);
  });
}

async function initStartupNotifyToggle() {
  const toggle = document.getElementById("startupNotifyToggle");
  toggle.checked = await getStartupNotify();
  toggle.addEventListener("change", async () => {
    await setStartupNotify(toggle.checked);
  });
}

async function initSparkToggle() {
  const toggle = document.getElementById("sparkToggle");
  toggle.checked = await getSparkEnabled();
  toggle.addEventListener("change", async () => {
    await setSparkEnabled(toggle.checked);
  });
}

function formatSyncTime(ms) {
  if (!ms) return "never";
  const diffMin = Math.round((Date.now() - ms) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

async function renderSyncStatus() {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  const btn = document.getElementById("syncNowBtn");
  const feeds = await getFeedCountries();
  if (!feeds.length) {
    // e.g. only the US / UK / etc. selected: nothing needs a network request.
    el.textContent = "Pick a country above and its holidays, festivals and important dates are pulled from Google Calendar automatically.";
    if (btn) btn.hidden = true;
    return;
  }
  if (btn) btn.hidden = false;
  const meta = await getSyncMeta();
  const failedNames = (meta.failedFeeds || []).filter(cc => feeds.includes(cc)).map(countryName);
  if (meta.status === "error" && failedNames.length) {
    el.textContent = `⚠ Couldn't refresh festival dates for ${failedNames.join(", ")} — showing the last known dates (or the built-in defaults). Other regions synced fine.`;
  } else if (meta.status === "error" && meta.lastSync) {
    el.textContent = `⚠ Last sync failed — showing dates from ${formatSyncTime(meta.lastSync)} (or the built-in defaults).`;
  } else if (meta.status === "error") {
    el.textContent = "⚠ Couldn't reach Google Calendar yet — using built-in default dates.";
  } else if (meta.lastSync) {
    const noFeed = (meta.unavailableFeeds || []).filter(cc => feeds.includes(cc)).map(countryName);
    el.textContent = `✓ Synced with Google's public holiday calendars — ${formatSyncTime(meta.lastSync)}.` +
      (noFeed.length ? ` Google has no holiday calendar for ${noFeed.join(", ")}, so those use the built-in dates.` : "");
  } else {
    el.textContent = "Not synced yet.";
  }
}

function initSyncButton() {
  const btn = document.getElementById("syncNowBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Syncing…";
    const result = await chrome.runtime.sendMessage({ type: "force-calendar-sync" });
    btn.disabled = false;
    btn.textContent = "Sync now";
    await renderSyncStatus();
    if (result?.ok) {
      await renderAll();
    }
  });
}

fillMonthDay("pMonth", "pDay");
fillMonthDay("fMonth", "fDay");
fillMonthFilter("personalMonthFilter");
fillMonthFilter("festMonthFilter");
document.getElementById("personalMonthFilter").addEventListener("change", (e) => {
  personalMonthFilter = e.target.value;
  renderAll();
});
document.getElementById("festMonthFilter").addEventListener("change", (e) => {
  festMonthFilter = e.target.value;
  renderAll();
});
document.getElementById("festRegionFilter").addEventListener("change", (e) => {
  festRegionFilter = e.target.value;
  renderAll();
});
initRegionSection();
renderAll();
initNewTabToggle();
initStartupNotifyToggle();
initSparkToggle();
renderSyncStatus();
initSyncButton();
