// common.js — storage helpers + occasion math, shared by popup/newtab/background.

const STORAGE_KEY = "btb_occasions"; // ALL occasions: birthdays, anniversaries, festivals, national days, custom
const NEWTAB_PREF_KEY = "btb_use_newtab"; // boolean: show Occasion Radar on new tab
const STARTUP_NOTIFY_PREF_KEY = "btb_startup_notify"; // boolean: notify on browser startup if something's upcoming
const SPARK_PREF_KEY = "btb_spark_enabled"; // boolean: cursor-reactive spark effect on the new tab page
// Storage key must match SYNC_EDITED_KEY in calendar-sync.js — duplicated as a
// literal here (rather than imported) so this file has no load-order dependency.
const LEGACY_EDITED_KEY_NAME = "btb_gcal_user_edited";
const LEGACY_SEED_PURGE_KEY = "btb_legacy_seed_purged_v1";
const STATIC_SEED_KEY = "btb_static_seeded_v1"; // one-time: has STATIC_OCCASIONS (data.js) been inserted?

const OCCASION_TYPES = {
  birthday:    "Birthday",
  anniversary: "Anniversary",
  festival:    "Festival",
  national:    "National / long weekend",
  remembrance: "Remembrance",
  custom:      "Custom"
};

async function getUseNewTab() {
  const res = await chrome.storage.local.get(NEWTAB_PREF_KEY);
  // Default: on. Person can turn it off from Options or right on the new tab page.
  return res[NEWTAB_PREF_KEY] === undefined ? true : !!res[NEWTAB_PREF_KEY];
}

async function setUseNewTab(value) {
  await chrome.storage.local.set({ [NEWTAB_PREF_KEY]: !!value });
}

async function getStartupNotify() {
  const res = await chrome.storage.local.get(STARTUP_NOTIFY_PREF_KEY);
  // Default: on. Person can turn it off from Options.
  return res[STARTUP_NOTIFY_PREF_KEY] === undefined ? true : !!res[STARTUP_NOTIFY_PREF_KEY];
}

async function setStartupNotify(value) {
  await chrome.storage.local.set({ [STARTUP_NOTIFY_PREF_KEY]: !!value });
}

async function getSparkEnabled() {
  const res = await chrome.storage.local.get(SPARK_PREF_KEY);
  // Default: on. Person can turn it off from Options if it's distracting.
  return res[SPARK_PREF_KEY] === undefined ? true : !!res[SPARK_PREF_KEY];
}

async function setSparkEnabled(value) {
  await chrome.storage.local.set({ [SPARK_PREF_KEY]: !!value });
}

function uid() {
  return "o-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// One-time migrations, run at most once per page/service-worker lifetime
// (cached in memory below) and consolidated into a single chrome.storage
// round trip the first time they're needed — keeps every getUserOccasions()
// call fast instead of chaining several separate reads/writes.
//
// 1. Legacy cleanup: festivals & national days used to be seeded from an
//    old hardcoded list with "f-*" ids and manual lunar upkeep. Any of
//    those left over (from before the "gcal-*"/live-sync era) are removed
//    here. Entries the user hand-edited are kept as-is.
// 2. Static seed: insert every hardcoded F/G-tier occasion from
//    STATIC_OCCASIONS (data.js), keyed by its stable "static-*" id so this
//    is always safe/idempotent. After this runs once, the person can freely
//    edit or remove any of these from Options and it sticks — nothing
//    re-seeds over a removed entry.
let _migrationsDone = false; // in-memory only — the real source of truth is the two flags in storage

async function ensureOccasionsMigrated() {
  if (_migrationsDone) {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    return res[STORAGE_KEY] || [];
  }

  const res = await chrome.storage.local.get([
    STORAGE_KEY, LEGACY_EDITED_KEY_NAME, LEGACY_SEED_PURGE_KEY, STATIC_SEED_KEY
  ]);
  let list = res[STORAGE_KEY] || [];
  const toSet = {};

  if (!res[LEGACY_SEED_PURGE_KEY]) {
    const edited = new Set(res[LEGACY_EDITED_KEY_NAME] || []);
    list = list.filter(o => !(String(o.id).startsWith("f-") && !edited.has(o.id)));
    toSet[LEGACY_SEED_PURGE_KEY] = true;
  }

  if (!res[STATIC_SEED_KEY]) {
    if (typeof STATIC_OCCASIONS !== "undefined") {
      const existingIds = new Set(list.map(o => o.id));
      for (const entry of STATIC_OCCASIONS) {
        if (existingIds.has(entry.id)) continue;
        list.push({ ...entry });
      }
    }
    toSet[STATIC_SEED_KEY] = true;
  }

  if (Object.keys(toSet).length) {
    toSet[STORAGE_KEY] = list;
    await chrome.storage.local.set(toSet);
  }

  _migrationsDone = true;
  return list;
}

// Date of the nth weekday of a given month/year — e.g. nthWeekdayOfMonth(2026, 5, 0, 2)
// is the 2nd Sunday of May 2026 (Mother's Day). weekday: 0=Sun..6=Sat.
// nth: 1st/2nd/3rd/4th/5th occurrence, or -1 for "last <weekday> of the month".
function nthWeekdayOfMonth(year, month, weekday, nth) {
  if (nth === -1) {
    const lastOfMonth = new Date(year, month, 0); // day 0 of next month = last day of this month
    const diff = (lastOfMonth.getDay() - weekday + 7) % 7;
    return new Date(year, month - 1, lastOfMonth.getDate() - diff);
  }
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + offset + (nth - 1) * 7);
}

// G-tier occasions (Mother's/Father's/Friendship Day) store a *rule*
// (floatMonth/floatWeekday/floatNth), not a fixed date — the actual
// day-of-month is different every year. This resolves that rule into a
// concrete month/day/year for the current cycle and writes it back onto the
// occasion, rolling forward to next year once this year's date has passed.
// Called on every read (cheap — no network, just date math, and a no-op
// once resolved for the current cycle) so month/day is always correct with
// zero manual upkeep, and everything downstream (getUpcoming, the Options
// list, CSV export) can just treat it like a normal fixed-date occasion.
function refreshFloatingDates(list, today = new Date()) {
  const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
  let changed = false;
  for (const o of list) {
    if (o.recurrence !== "floating") continue;
    if (!o.floatMonth || o.floatWeekday === undefined || o.floatWeekday === null || !o.floatNth) continue;
    let year = t0.getFullYear();
    let d = nthWeekdayOfMonth(year, o.floatMonth, o.floatWeekday, o.floatNth);
    d.setHours(0, 0, 0, 0);
    if (d < t0) {
      year += 1;
      d = nthWeekdayOfMonth(year, o.floatMonth, o.floatWeekday, o.floatNth);
    }
    if (o.month !== o.floatMonth || o.day !== d.getDate() || o.year !== year) {
      o.month = o.floatMonth;
      o.day = d.getDate();
      o.year = year;
      changed = true;
    }
  }
  return changed;
}

async function getUserOccasions() {
  const list = await ensureOccasionsMigrated();
  if (refreshFloatingDates(list)) {
    await chrome.storage.local.set({ [STORAGE_KEY]: list });
  }
  return list;
}

async function saveUserOccasions(list) {
  await chrome.storage.local.set({ [STORAGE_KEY]: list });
}

async function addOccasion({ name, month, day, type, note, recurrence, occurrence, year }) {
  const list = await getUserOccasions();
  list.push({
    id: uid(),
    name,
    month: Number(month),
    day: Number(day),
    type: type || "custom",
    note: note || "",
    recurrence: recurrence || "fixed",
    occurrence: occurrence === "once" ? "once" : "yearly", // "yearly" (default) or "once"
    year: occurrence === "once" ? Number(year) : undefined  // only meaningful for one-time events
  });
  await saveUserOccasions(list);
  return list;
}

async function updateOccasion(id, changes) {
  const list = await getUserOccasions();
  const idx = list.findIndex(o => o.id === id);
  if (idx === -1) return list;
  const nextOccurrenceType = changes.occurrence === "once" ? "once" : (changes.occurrence === "yearly" ? "yearly" : (list[idx].occurrence || "yearly"));
  list[idx] = {
    ...list[idx],
    ...changes,
    month: Number(changes.month ?? list[idx].month),
    day: Number(changes.day ?? list[idx].day),
    recurrence: changes.recurrence ?? list[idx].recurrence ?? "fixed",
    occurrence: nextOccurrenceType,
    year: nextOccurrenceType === "once" ? Number(changes.year ?? list[idx].year) : undefined
  };
  await saveUserOccasions(list);
  // A manual edit to a festival/national entry means the person wants THIS
  // date kept — never let the daily Google Calendar sync overwrite it again.
  if (typeof markUserEdited === "function") await markUserEdited(id);
  return list;
}

async function removeOccasion(id) {
  const list = await getUserOccasions();
  const next = list.filter(o => o.id !== id);
  await saveUserOccasions(next);
  // Prevent a deleted synced festival from silently reappearing on the next
  // daily Google Calendar sync.
  if (typeof markUserEdited === "function") await markUserEdited(id);
  return next;
}

// Given "today", return the next occurrence date (this year or next) for a
// recurring {month, day} occasion, as a Date at local midnight.
function nextOccurrence(month, day, today = new Date()) {
  const y = today.getFullYear();
  let d = new Date(y, month - 1, day);
  d.setHours(0, 0, 0, 0);
  const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
  if (d < t0) d = new Date(y + 1, month - 1, day);
  return d;
}

// For a one-time occasion, return its fixed date at local midnight — no
// year rolling. Returns null if the year is missing/invalid.
function onceOccurrenceDate(month, day, year) {
  if (!year) return null;
  const d = new Date(Number(year), month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(date, today = new Date()) {
  const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
  const d0 = new Date(date); d0.setHours(0, 0, 0, 0);
  return Math.round((d0 - t0) / 86400000);
}

// Normalize a unified occasions list into sorted, upcoming-first items.
// Each item: { id, name, type, note?, date: Date, daysLeft }
// One-time ("once") occasions use their fixed year and drop off the list
// (and out of storage) once their date has passed — they never roll to next
// year the way yearly-recurring ones do.
//
// IMPORTANT — "auto-synced" occasions (festivals pulled from Google's
// Indian Holidays feed, see calendar-sync.js) must NOT use the generic
// "same month/day next year" rollover that nextOccurrence() does for
// ordinary fixed-date entries. Many of these festivals (Onam, Diwali, Eid,
// etc.) shift to a genuinely different Gregorian month/day every year —
// the calendar feed handles that by re-fetching the real next date, not by
// repeating a fixed month/day. If today has passed this year's stored
// occurrence, naively assuming "same date next year" produces a fabricated,
// almost-certainly-wrong date. Instead, once an auto-synced occasion's
// stored date has passed, we hide it from the upcoming list rather than
// guess — the next calendar sync will overwrite month/day with the real
// next occurrence (which then becomes "upcoming" again naturally).
function getUpcoming(occasions, today = new Date(), windowDays = 60) {
  const items = [];
  for (const o of occasions) {
    let date;
    if (o.occurrence === "once") {
      date = onceOccurrenceDate(o.month, o.day, o.year);
      if (!date) continue; // malformed one-time entry with no year — skip rather than guess
    } else if (o.recurrence === "auto-synced") {
      // Auto-synced festivals carry the exact calendar year the sync
      // resolved for this month/day (see calendar-sync.js) — required
      // because many of these shift to a different Gregorian date every
      // year, so "this year" can't be assumed the way it can for a fixed
      // holiday. Trust the stored year rather than recomputing one.
      if (!o.year) continue; // pre-fix data with no year stored — wait for next sync rather than guess
      const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
      const storedDate = new Date(o.year, o.month - 1, o.day);
      storedDate.setHours(0, 0, 0, 0);
      if (storedDate < t0) continue; // stale until the next sync refreshes it — never guess a rollover date
      date = storedDate;
    } else {
      date = nextOccurrence(o.month, o.day, today);
    }
    const daysLeft = daysUntil(date, today);
    if (daysLeft >= 0 && daysLeft <= windowDays) {
      items.push({ id: o.id, name: o.name, type: o.type, note: o.note || "", recurrence: o.recurrence || "fixed", occurrence: o.occurrence || "yearly", date, daysLeft });
    }
  }
  items.sort((a, b) => a.daysLeft - b.daysLeft);
  return collapseSameDayVariants(items);
}

// If two upcoming items land on the exact same date and one's name is just
// the other's name plus a trailing "(...)" qualifier — e.g. "Janmashtami"
// and "Janmashtami (Smarta)" — keep only the shorter/base one. This is a
// generic text-pattern check (any parenthetical suffix, any date match), not
// a hardcoded list of festival names, so it applies to whatever the calendar
// feed sends without needing manual upkeep.
function collapseSameDayVariants(items) {
  const drop = new Set();
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (i === j || drop.has(items[j].id)) continue;
      const a = items[i], b = items[j];
      if (a.daysLeft !== b.daysLeft) continue;
      const m = b.name.match(/^(.*?)\s*\([^()]+\)\s*$/);
      if (m && m[1].trim().toLowerCase() === a.name.trim().toLowerCase()) {
        drop.add(b.id); // b is "a (variant)" on the same date — drop the variant
      }
    }
  }
  return drop.size ? items.filter(it => !drop.has(it.id)) : items;
}

function suggestActivities(type, catalog, count = 3) {
  const key = (type === "national" || type === "custom") ? "festival" : type;
  const pool = catalog.filter(a => a.fit.includes(key));
  const list = pool.length ? pool : catalog;
  return list.slice(0, count);
}

function occasionsToCSV(occasions) {
  const header = "name,type,month,day,note,recurrence,occurrence,year";
  const rows = occasions.map(o => {
    const esc = (v) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
    return [esc(o.name), o.type, o.month, o.day, esc(o.note || ""), o.recurrence || "fixed", o.occurrence || "yearly", o.year || ""].join(",");
  });
  return [header, ...rows].join("\n");
}

// Small, dependency-free CSV parser for our 8-column format
// (name, type, month, day, note, recurrence, occurrence, year). Handles
// quoted fields with embedded commas. The last two columns are optional for
// backward compatibility with older exports — missing = yearly-recurring.
function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && /^name\s*,\s*type\s*,\s*month\s*,\s*day/i.test(line)) continue; // skip header
    const fields = [];
    let cur = "", inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (inQuotes) {
        if (ch === '"' && line[c + 1] === '"') { cur += '"'; c++; }
        else if (ch === '"') { inQuotes = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") { fields.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    fields.push(cur);
    if (fields.length < 4) continue;
    const [name, type, month, day, note, recurrence, occurrence, year] = fields.map(f => (f || "").trim());
    const m = Number(month), d = Number(day);
    if (!name || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) continue;
    const validType = Object.keys(OCCASION_TYPES).includes(type) ? type : "custom";
    const validRecurrence = recurrence === "lunar" ? "lunar" : "fixed";
    const validOccurrence = occurrence === "once" ? "once" : "yearly";
    const validYear = validOccurrence === "once" ? (Number(year) || undefined) : undefined;
    rows.push({ name, type: validType, month: m, day: d, note: note || "", recurrence: validRecurrence, occurrence: validOccurrence, year: validYear });
  }
  return rows;
}

async function importOccasionsCSV(text) {
  const parsed = parseCSV(text);
  if (!parsed.length) return { added: 0, total: (await getUserOccasions()).length };
  const list = await getUserOccasions();
  for (const row of parsed) {
    list.push({ id: uid(), name: row.name, month: row.month, day: row.day, type: row.type, note: row.note, recurrence: row.recurrence, occurrence: row.occurrence, year: row.year });
  }
  await saveUserOccasions(list);
  return { added: parsed.length, total: list.length };
}
// Remove one-time ("once") occasions whose date has fully passed, so they
// don't accumulate forever in storage or clutter the Options list. Yearly
// occasions are untouched — they're meant to repeat indefinitely.
async function pruneExpiredOnceOccasions(today = new Date()) {
  const list = await getUserOccasions();
  const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
  const kept = list.filter(o => {
    if (o.occurrence !== "once") return true;
    const date = onceOccurrenceDate(o.month, o.day, o.year);
    if (!date) return true; // malformed — leave it for the user to fix rather than silently delete
    return date >= t0;
  });
  if (kept.length !== list.length) await saveUserOccasions(kept);
  return kept;
}

if (typeof module !== "undefined") {
  module.exports = { getUserOccasions, saveUserOccasions, addOccasion, updateOccasion, removeOccasion, nextOccurrence, onceOccurrenceDate, daysUntil, getUpcoming, pruneExpiredOnceOccasions, suggestActivities, getUseNewTab, setUseNewTab, getStartupNotify, setStartupNotify, getSparkEnabled, setSparkEnabled, occasionsToCSV, parseCSV, importOccasionsCSV, OCCASION_TYPES, ensureOccasionsMigrated, nthWeekdayOfMonth, refreshFloatingDates };
}
