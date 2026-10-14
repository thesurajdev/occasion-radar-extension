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
const REGION_SEED_KEY = "btb_region_seeded_v2";
const EXTRA_COUNTRIES_SEED_KEY = "btb_extra_countries_seeded_v1"; // one-time (v1.5): insert the packs for all the added countries // one-time: regions backfilled + COUNTRY_OCCASIONS (data.js) inserted?
const REGION_PREF_KEY = "btb_regions";          // { mode: "all"|"selected", countries: ["IN",…], includeGlobal: bool }

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

// ---------------------------------------------------------------------------
// Region preferences — which countries' festivals / national days to show.
// Personal occasions are never filtered.
// ---------------------------------------------------------------------------
const TIMEZONE_TO_COUNTRY = {
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  "Asia/Singapore": "SG", "Asia/Dubai": "AE",
  "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Paris": "FR",
  "Pacific/Auckland": "NZ",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
  "America/Winnipeg": "CA", "America/Halifax": "CA", "America/St_Johns": "CA", "America/Regina": "CA",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Anchorage": "US", "Pacific/Honolulu": "US",
  "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Shanghai": "CN", "Asia/Taipei": "TW", "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD", "Asia/Colombo": "LK", "Asia/Kathmandu": "NP", "Asia/Manila": "PH", "Asia/Jakarta": "ID",
  "Asia/Kuala_Lumpur": "MY", "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN", "Asia/Riyadh": "SA", "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW", "Asia/Tehran": "IR", "Asia/Jerusalem": "IL", "Europe/Istanbul": "TR", "Europe/Moscow": "RU",
  "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Zurich": "CH",
  "Europe/Vienna": "AT", "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI",
  "Europe/Dublin": "IE", "Europe/Lisbon": "PT", "Europe/Athens": "GR", "Europe/Warsaw": "PL", "Europe/Kyiv": "UA",
  "Africa/Lagos": "NG", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA", "Africa/Cairo": "EG", "Africa/Accra": "GH",
  "America/Mexico_City": "MX", "America/Sao_Paulo": "BR", "America/Argentina/Buenos_Aires": "AR", "America/Bogota": "CO",
  "America/Lima": "PE", "America/Santiago": "CL"
};

// Best-effort guess of the person's country. Timezone first (it reflects where
// they actually are — plenty of people in India run a US-English browser),
// then the browser language's region subtag. Returns null if unsupported.
function detectCountryCode() {
  const supported = new Set((typeof COUNTRIES !== "undefined" ? COUNTRIES : []).map(c => c.code));
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const byTz = TIMEZONE_TO_COUNTRY[tz] || (tz.startsWith("Australia/") ? "AU" : null);
    if (byTz && supported.has(byTz)) return byTz;
  } catch (e) { /* fall through */ }
  try {
    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
    for (const l of langs) {
      const m = String(l || "").match(/[-_]([A-Za-z]{2})$/);
      if (m && supported.has(m[1].toUpperCase())) return m[1].toUpperCase();
    }
  } catch (e) { /* fall through */ }
  return null;
}

function defaultRegionPrefsForNewInstall() {
  const cc = detectCountryCode();
  return { mode: "selected", countries: cc ? [cc] : [], includeGlobal: true };
}

function normalizeRegionPrefs(p) {
  const supported = new Set((typeof COUNTRIES !== "undefined" ? COUNTRIES : []).map(c => c.code));
  const mode = p && p.mode === "all" ? "all" : "selected";
  const countries = Array.isArray(p && p.countries) ? p.countries.filter(c => supported.has(c)) : [];
  const includeGlobal = !(p && p.includeGlobal === false);
  return { mode, countries, includeGlobal };
}

async function getRegionPrefs() {
  await ensureOccasionsMigrated(); // guarantees the default has been written
  const res = await chrome.storage.local.get(REGION_PREF_KEY);
  return normalizeRegionPrefs(res[REGION_PREF_KEY]);
}

async function setRegionPrefs(prefs) {
  await chrome.storage.local.set({ [REGION_PREF_KEY]: normalizeRegionPrefs(prefs) });
}

// An occasion with no `regions` (birthdays, anniversaries, custom, anything the
// person added themselves) is always visible.
function occasionVisible(o, prefs) {
  const r = o.regions;
  if (!r || !r.length) return true;
  if (prefs.mode === "all") return true;
  return r.some(c => c === "GLOBAL" ? prefs.includeGlobal : prefs.countries.includes(c));
}

async function getVisibleOccasions() {
  const [list, prefs] = await Promise.all([getUserOccasions(), getRegionPrefs()]);
  return list.filter(o => occasionVisible(o, prefs));
}

// Short human label for the current selection, e.g. "India", "India + United States",
// "India + 2 more", "All countries", "International days only".
function regionSummary(prefs) {
  if (prefs.mode === "all") return "All countries";
  const names = prefs.countries.map(c => (typeof countryName === "function" ? countryName(c) : c));
  if (!names.length) return prefs.includeGlobal ? "International days only" : "No regions selected";
  if (names.length <= 2) return names.join(" + ");
  return `${names[0]} + ${names.length - 1} more`;
}

// Should Born To Banger's (Delhi-NCR) activity ideas be shown for this selection?
function showBtbActivities(prefs) {
  if (prefs.mode === "all") return true;
  const allowed = (typeof BTB_ACTIVITY_REGIONS !== "undefined") ? BTB_ACTIVITY_REGIONS : [];
  return prefs.countries.some(c => allowed.includes(c));
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
    STORAGE_KEY, LEGACY_EDITED_KEY_NAME, LEGACY_SEED_PURGE_KEY, STATIC_SEED_KEY,
    REGION_SEED_KEY, REGION_PREF_KEY, EXTRA_COUNTRIES_SEED_KEY
  ]);
  let list = res[STORAGE_KEY] || [];
  const toSet = {};
  // Captured BEFORE this run touches anything: true for anyone who installed a
  // pre-region version (they were seeded with the India list), false for a
  // brand-new install. Decides their default region below.
  const wasExistingInstall = !!res[STATIC_SEED_KEY];

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

  // 3. Regions (v1.4): tag the built-in occasions that were seeded before
  //    regions existed, add the other countries' packs, and pick a default
  //    region. Idempotent via REGION_SEED_KEY. Anything the person already
  //    removed stays removed — only the NEW country-pack ids are inserted,
  //    and existing entries only gain a `regions` field (nothing else about
  //    them, including user edits, is touched).
  if (!res[REGION_SEED_KEY]) {
    if (typeof STATIC_OCCASIONS !== "undefined") {
      const staticById = new Map(STATIC_OCCASIONS.map(o => [o.id, o]));
      for (const o of list) {
        if (o.regions) continue;
        if (staticById.has(o.id)) o.regions = [...staticById.get(o.id).regions];
        else if (String(o.id).startsWith("gcal-")) o.regions = ["IN"]; // the only feed before v1.4 was India's
      }
    }
    if (typeof COUNTRY_OCCASIONS !== "undefined") {
      const existingIds = new Set(list.map(o => o.id));
      for (const entry of COUNTRY_OCCASIONS) {
        if (!existingIds.has(entry.id)) list.push({ ...entry });
      }
    }
    if (res[REGION_PREF_KEY] === undefined) {
      // Existing users keep exactly what they had (India). New installs get
      // their own country, detected from timezone/locale.
      toSet[REGION_PREF_KEY] = wasExistingInstall
        ? { mode: "selected", countries: ["IN"], includeGlobal: true }
        : defaultRegionPrefsForNewInstall();
    }
    toSet[REGION_SEED_KEY] = true;
  }

  // 4. All-countries (v1.5): insert the packs for the countries added in this
  //    version. Existing installs were seeded before these existed, so nothing
  //    here can have been removed by the person yet; by-id check keeps it
  //    idempotent and never touches an existing entry.
  if (!res[EXTRA_COUNTRIES_SEED_KEY]) {
    if (typeof EXTRA_COUNTRY_OCCASIONS !== "undefined") {
      const existingIds = new Set(list.map(o => o.id));
      for (const entry of EXTRA_COUNTRY_OCCASIONS) {
        if (!existingIds.has(entry.id)) list.push({ ...entry });
      }
    }
    toSet[EXTRA_COUNTRIES_SEED_KEY] = true;
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

// Easter Sunday for a given year (Anonymous Gregorian algorithm). Western
// (Gregorian) Easter — Orthodox Easter is not covered.
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// The given weekday strictly BEFORE month/day — e.g. the Monday before May 25
// (Victoria Day in Canada). weekday: 0=Sun..6=Sat.
function weekdayBefore(year, month, day, weekday) {
  const ref = new Date(year, month - 1, day);
  const back = ((ref.getDay() - weekday + 6) % 7) + 1; // 1..7 days back
  return new Date(year, month - 1, day - back);
}

// Resolve a "floating" occasion's rule into a concrete date for `year`.
// Rule kinds: "nth" (default, legacy shape: floatMonth/floatWeekday/floatNth),
// "easter" (easterOffset days from Easter Sunday), "before" (beforeMonth/
// beforeDay/beforeWeekday). Returns null if the stored rule is incomplete.
function dynamicDateForYear(o, year) {
  const rule = o.rule || "nth";
  if (rule === "easter") {
    if (typeof o.easterOffset !== "number") return null;
    const e = easterSunday(year);
    return new Date(year, e.getMonth(), e.getDate() + o.easterOffset);
  }
  if (rule === "before") {
    if (!o.beforeMonth || !o.beforeDay || o.beforeWeekday === undefined || o.beforeWeekday === null) return null;
    return weekdayBefore(year, o.beforeMonth, o.beforeDay, o.beforeWeekday);
  }
  if (!o.floatMonth || o.floatWeekday === undefined || o.floatWeekday === null || !o.floatNth) return null;
  return nthWeekdayOfMonth(year, o.floatMonth, o.floatWeekday, o.floatNth);
}

// "Floating" occasions (Mother's Day, Thanksgiving, Easter, Victoria Day…)
// store a *rule*, not a fixed date — the actual day-of-month is different every
// year. This resolves that rule into a concrete month/day/year for the current
// cycle and writes it back onto the occasion, rolling forward to next year once
// this year's date has passed. Called on every read (cheap — no network, just
// date math, and a no-op once resolved for the current cycle) so month/day is
// always correct with zero manual upkeep, and everything downstream
// (getUpcoming, the Options list, CSV export) can treat it like a fixed-date
// occasion.
function refreshFloatingDates(list, today = new Date()) {
  const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
  let changed = false;
  for (const o of list) {
    if (o.recurrence !== "floating") continue;
    let year = t0.getFullYear();
    let d = dynamicDateForYear(o, year);
    if (!d) continue;
    d.setHours(0, 0, 0, 0);
    if (d < t0) {
      year += 1;
      d = dynamicDateForYear(o, year);
    }
    if (o.month !== d.getMonth() + 1 || o.day !== d.getDate() || o.year !== year) {
      o.month = d.getMonth() + 1;
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
  const header = "name,type,month,day,note,recurrence,occurrence,year,regions";
  const rows = occasions.map(o => {
    const esc = (v) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
    return [esc(o.name), o.type, o.month, o.day, esc(o.note || ""), o.recurrence || "fixed", o.occurrence || "yearly", o.year || "", (o.regions || []).join("|")].join(",");
  });
  return [header, ...rows].join("\n");
}

// Small, dependency-free CSV parser for our 9-column format
// (name, type, month, day, note, recurrence, occurrence, year, regions). Handles
// quoted fields with embedded commas. The last three columns are optional for
// backward compatibility with older exports — missing = yearly-recurring, and
// missing regions = always shown. regions is pipe-separated, e.g. IN|US|GLOBAL.
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
    const [name, type, month, day, note, recurrence, occurrence, year, regionsRaw] = fields.map(f => (f || "").trim());
    const m = Number(month), d = Number(day);
    if (!name || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) continue;
    const validType = Object.keys(OCCASION_TYPES).includes(type) ? type : "custom";
    const validRecurrence = recurrence === "lunar" ? "lunar" : "fixed";
    const validOccurrence = occurrence === "once" ? "once" : "yearly";
    const validYear = validOccurrence === "once" ? (Number(year) || undefined) : undefined;
    const validCodes = new Set(["GLOBAL", ...(typeof COUNTRIES !== "undefined" ? COUNTRIES.map(c => c.code) : [])]);
    const regions = (regionsRaw || "").split("|").map(r => r.trim().toUpperCase()).filter(r => validCodes.has(r));
    rows.push({ name, type: validType, month: m, day: d, note: note || "", recurrence: validRecurrence, occurrence: validOccurrence, year: validYear, regions: regions.length ? regions : undefined });
  }
  return rows;
}

async function importOccasionsCSV(text) {
  const parsed = parseCSV(text);
  if (!parsed.length) return { added: 0, total: (await getUserOccasions()).length };
  const list = await getUserOccasions();
  for (const row of parsed) {
    list.push({ id: uid(), name: row.name, month: row.month, day: row.day, type: row.type, note: row.note, recurrence: row.recurrence, occurrence: row.occurrence, year: row.year, ...(row.regions ? { regions: row.regions } : {}) });
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
  module.exports = { getUserOccasions, saveUserOccasions, addOccasion, updateOccasion, removeOccasion, nextOccurrence, onceOccurrenceDate, daysUntil, getUpcoming, pruneExpiredOnceOccasions, suggestActivities, getUseNewTab, setUseNewTab, getStartupNotify, setStartupNotify, getSparkEnabled, setSparkEnabled, occasionsToCSV, parseCSV, importOccasionsCSV, OCCASION_TYPES, ensureOccasionsMigrated, nthWeekdayOfMonth, refreshFloatingDates, easterSunday, weekdayBefore, dynamicDateForYear, getRegionPrefs, setRegionPrefs, occasionVisible, getVisibleOccasions, regionSummary, showBtbActivities, detectCountryCode, normalizeRegionPrefs };
}
