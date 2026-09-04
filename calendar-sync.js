// calendar-sync.js — keeps the handful of genuinely LUNAR occasions fresh
// automatically by pulling Google's public "Indian Holidays" calendar feed
// (no login required).
//
// Every other occasion (fixed-date, and floating rules like "2nd Sunday of
// May") is hardcoded in data.js (STATIC_OCCASIONS) and needs no fetching —
// see the comment at the top of that file. This feed is now only used for
// the small set of occasions whose date genuinely can't be expressed as a
// fixed date or a simple weekday rule: it moves on the lunar calendar and
// shifts by a different amount every year. That list is LUNAR_TRACKED_NAMES
// below — currently Hanuman Jayanti, Akshaya Tritiya, Guru Purnima, and
// Gita Jayanti.
//
// Feed: https://calendar.google.com/calendar/ical/en.indian%23holiday.../basic.ics
// This is Google's own public holiday calendar for India — free, no API key,
// no OAuth. It's the same feed people add via "Other calendars" in Google
// Calendar. We fetch the raw .ics text, parse VEVENT blocks ourselves (no
// library needed — the format is simple), and store results directly.
//
// Design choices:
// - Every synced occasion gets a stable id derived from its own feed name
//   (gcal-<slug>), so a name always maps to the same card and re-syncs
//   update it in place rather than duplicating it.
// - We never touch anything the user has manually edited or removed
//   (tracked via SYNC_EDITED_KEY).
// - Sync runs automatically: on install, on every browser startup, and on
//   an hourly alarm (self-throttled to ~once/day on success, ~30min retry
//   on failure) — see background.js. No manual action is ever required.
// - If the fetch fails (offline, feed down, network permission revoked),
//   whatever's already in storage is left completely untouched.

const GCAL_INDIAN_HOLIDAYS_ICS =
  "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics";

const SYNC_LAST_KEY = "btb_gcal_last_sync";       // ms epoch of last successful sync
const SYNC_STATUS_KEY = "btb_gcal_last_status";   // "ok" | "error" | "never"
const SYNC_EDITED_KEY = "btb_gcal_user_edited";   // array of occasion ids the user hand-edited/removed — never auto-overwritten
const SYNC_MIN_INTERVAL_MS = 20 * 60 * 60 * 1000; // don't re-fetch more than once/~20h even if alarm fires more often
const SYNC_RETRY_INTERVAL_MS = 30 * 60 * 1000;    // on failure, allow retry after 30 min instead of waiting a full day
const SYNC_FAIL_COUNT_KEY = "btb_gcal_fail_count"; // consecutive failure count
const SYNC_FETCH_TIMEOUT_MS = 15 * 1000;          // don't hang forever if the network stalls

// The occasions resolved via the live feed — everything else now lives in
// data.js as a hardcoded fixed date or floating rule. Matched
// case-insensitively against the feed's SUMMARY, ignoring any trailing
// "(...)" sect/regional qualifier (see isTrackedLunarName below).
const LUNAR_TRACKED_NAMES = [
  "Hanuman Jayanti", "Akshaya Tritiya", "Guru Purnima", "Gita Jayanti",
  "Janmashtami", "Diwali", "Holi", "Dussehra", "Navratri", "Durga Puja",
  "Raksha Bandhan", "Maha Shivratri", "Ram Navami", "Karva Chauth",
  "Govardhan Puja", "Bhai Dooj", "Ganesh Chaturthi", "Onam", "Pongal",
  "Makar Sankranti", "Chhath Puja", "Vasant Panchami", "Eid al-Fitr",
  "Eid al-Adha", "Milad un-Nabi", "Buddha Purnima", "Mahavir Jayanti",
  "Good Friday"
];

function isTrackedLunarName(name) {
  const base = name.replace(/\s*\([^()]*\)\s*$/, "").trim().toLowerCase();
  return LUNAR_TRACKED_NAMES.some(n => {
    const key = n.toLowerCase();
    // Exact match after stripping a trailing "(...)" qualifier, or the feed
    // name contains our tracked name as a whole word/phrase (handles feed
    // variants like "Diwali/Deepavali" or "Janmashtami (Smarta)" that don't
    // reduce to an exact match after paren-stripping alone).
    return key === base || base.includes(key);
  });
}

// Unfold ICS lines (continuation lines start with a space) and split into raw lines.
function unfoldICS(text) {
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines = [];
  for (const line of rawLines) {
    if (line.startsWith(" ") && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

// Parse VEVENT blocks out of raw .ics text into { name, month, day, year }.
// Google's holiday feed uses all-day events with DTSTART;VALUE=DATE:YYYYMMDD
// and SUMMARY:<name>. Two different shapes appear in the feed:
//
// 1) Fixed-date holidays (New Year's Day, Independence Day, etc.) are a
//    SINGLE VEVENT with RRULE:FREQ=YEARLY — one literal anchor date plus a
//    rule meaning "repeat every year on this month/day, forever". There is
//    no separate VEVENT for other years, so relying only on the literal
//    DTSTART (as the previous version of this function did) means an old
//    anchor date can end up being the only candidate the picker ever sees.
// 2) Lunar/solar-shifting holidays (Onam, Diwali, Eid, etc.) whose date
//    moves year to year can't be expressed as a simple yearly rule, so
//    Google lists a SEPARATE literal VEVENT per year instead, with no
//    RRULE at all.
//
// We handle both: literal VEVENTs are taken as-is (case 2), and an
// RRULE:FREQ=YEARLY VEVENT (case 1) is expanded into this year's and next
// year's occurrence of its month/day, in addition to its own literal
// anchor, so pickClosestPerName always has an up-to-date candidate to
// compare against "today" regardless of how old the feed's anchor date is.
function parseICSEvents(icsText, today = new Date()) {
  const lines = unfoldICS(icsText);
  const events = [];
  let cur = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
    } else if (line === "END:VEVENT") {
      if (cur && cur.name && cur.dateStr) {
        const y = Number(cur.dateStr.slice(0, 4));
        const m = Number(cur.dateStr.slice(4, 6));
        const d = Number(cur.dateStr.slice(6, 8));
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          if (cur.rruleYearly) {
            const y1 = today.getFullYear();
            events.push({ name: cur.name, month: m, day: d, year: y1 });
            events.push({ name: cur.name, month: m, day: d, year: y1 + 1 });
            events.push({ name: cur.name, month: m, day: d, year: y });
          } else {
            events.push({ name: cur.name, month: m, day: d, year: y });
          }
        }
      }
      cur = null;
    } else if (cur) {
      if (line.startsWith("SUMMARY:")) {
        cur.name = line.slice("SUMMARY:".length).trim().replace(/\\,/g, ",").replace(/\\;/g, ";");
      } else if (line.startsWith("DTSTART")) {
        const idx = line.indexOf(":");
        if (idx !== -1) cur.dateStr = line.slice(idx + 1).trim();
      } else if (line.startsWith("RRULE:")) {
        if (/FREQ=YEARLY/i.test(line)) cur.rruleYearly = true;
      }
    }
  }
  return events;
}

// Google's feed repeats each holiday every year. We want the *next upcoming*
// occurrence of each named holiday's month/day (today or later) — never a
// date that's already passed — so lunar-shifting festivals (Diwali, Holi,
// etc.) show this year's or next year's real date instead of last year's.
// This is exactly what makes lunar dates "automatic": we never store a
// fixed date, we always resolve it fresh against today.
// A "recently passed" occurrence is still more relevant than a distant future
// one from a different calendar year of the same feed entry (e.g. Google's
// feed rolling a lunar/solar festival like Onam forward to next year's date
// once this year's has passed by a few days). We only let an "upcoming"
// candidate beat a "past" one when the past one is no longer recent — this
// stops the picker from jumping a full year ahead just because today is a
// few days past this year's real date.
const RECENT_PAST_GRACE_DAYS = 14;

function pickClosestPerName(events, today = new Date()) {
  const byName = new Map();
  for (const ev of events) {
    const candidate = nextOccurrenceFromYMD(ev.year, ev.month, ev.day, today);
    const existing = byName.get(ev.name);
    if (!existing) {
      byName.set(ev.name, { month: ev.month, day: ev.day, year: candidate.resolvedYear, diff: candidate.diff, upcoming: candidate.upcoming });
      continue;
    }

    const existingDays = existing.diff / (24 * 60 * 60 * 1000);
    const existingIsRecentPast = !existing.upcoming && existingDays <= RECENT_PAST_GRACE_DAYS;

    let candidateIsBetter;
    if (candidate.upcoming && !existing.upcoming) {
      // Only let an upcoming candidate override a past one if the past one
      // has genuinely gone stale (older than the grace window). A just-passed
      // occurrence (e.g. Onam 3 days ago) beats a far-future one (next year's).
      candidateIsBetter = !existingIsRecentPast;
    } else if (!candidate.upcoming && existing.upcoming) {
      candidateIsBetter = false;
    } else {
      // Same kind (both upcoming or both past): closer wins.
      candidateIsBetter = candidate.diff < existing.diff;
    }

    if (candidateIsBetter) {
      byName.set(ev.name, { month: ev.month, day: ev.day, year: candidate.resolvedYear, diff: candidate.diff, upcoming: candidate.upcoming });
    }
  }
  return dedupeSameDayVariants(byName);
}

// Google's Indian Holidays feed sometimes lists regional/sect variants of the
// same festival as separate SUMMARY entries that land on the same date, e.g.
// "Janmashtami" and "Janmashtami (Smarta)". We don't hardcode a list of which
// festivals do this — we detect it generically: if a name has a parenthetical
// suffix (any "(...)" at the end) and stripping it yields another name in the
// same map that resolves to the exact same date, treat them as one entry and
// keep only the base (non-parenthetical) name. This is a text-pattern rule
// about the feed's naming convention, not a rule about specific festivals —
// it works for any name the feed happens to format this way, present or future.
function dedupeSameDayVariants(byName) {
  const toDrop = new Set();
  for (const [name, info] of byName.entries()) {
    const m = name.match(/^(.*?)\s*\([^()]+\)\s*$/);
    if (!m) continue;
    const baseName = m[1].trim();
    const base = byName.get(baseName);
    if (base && base.month === info.month && base.day === info.day) {
      toDrop.add(name); // keep the base entry, drop the parenthetical variant
    }
  }
  for (const name of toDrop) byName.delete(name);
  return byName;
}

// diff: days between the event date and today (always >= 0).
// upcoming: true if the event date is today or in the future, false if it's in the past.
function nextOccurrenceFromYMD(year, month, day, today) {
  const d = new Date(year, month - 1, day);
  const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const rawDiff = d - t0;
  return { diff: Math.abs(rawDiff), upcoming: rawDiff >= 0, resolvedYear: year };
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Every feed name gets a stable id derived only from its own text — no
// lookup table to maintain. The same SUMMARY string always produces the
// same id, so a re-sync updates the existing card instead of duplicating it.
function resolveId(name) {
  return `gcal-${slug(name)}`;
}

async function getEditedIds() {
  const res = await chrome.storage.local.get(SYNC_EDITED_KEY);
  return new Set(res[SYNC_EDITED_KEY] || []);
}

// Call this whenever the user manually edits or removes a festival/national
// entry, so future syncs never silently overwrite their change again.
async function markUserEdited(id) {
  const edited = await getEditedIds();
  edited.add(id);
  await chrome.storage.local.set({ [SYNC_EDITED_KEY]: Array.from(edited) });
}

// Reverse of markUserEdited: removes the "don't auto-overwrite" lock for a
// single id so the next sync can refresh it again. Used when a festival
// (typically a gcal- auto-synced one, e.g. Ganesh Chaturthi) got hand-edited
// or removed at some point and is now silently stuck on a stale/past date —
// this lets the person opt back into automatic updates without having to
// touch chrome.storage directly.
async function unmarkUserEdited(id) {
  const edited = await getEditedIds();
  if (!edited.has(id)) return false;
  edited.delete(id);
  await chrome.storage.local.set({ [SYNC_EDITED_KEY]: Array.from(edited) });
  return true;
}

// Finds tracked lunar festivals that are BOTH locked (in the edited set)
// AND missing from storage entirely — i.e. someone removed the card at some
// point, and mergeFestivals's "respect user edits" rule (see mergeFestivals
// below) has been silently refusing to ever re-add it since, with no card
// left in the UI to react to. These are invisible by construction: there's
// no occasion row to show a "locked" badge or Resync button on. Surfaced
// separately in Options as re-addable items with a "Restore & resync"
// action, distinct from the visible-but-stale case that occasionRowHTML's
// locked badge already covers.
async function getOrphanedLockedFestivals() {
  const [edited, list] = await Promise.all([getEditedIds(), getUserOccasions()]);
  const presentIds = new Set(list.map(o => o.id));
  const orphans = [];
  for (const name of LUNAR_TRACKED_NAMES) {
    const id = resolveId(name);
    if (edited.has(id) && !presentIds.has(id)) {
      orphans.push({ id, name });
    }
  }
  return orphans;
}

async function getSyncMeta() {
  const res = await chrome.storage.local.get([SYNC_LAST_KEY, SYNC_STATUS_KEY]);
  return {
    lastSync: res[SYNC_LAST_KEY] || null,
    status: res[SYNC_STATUS_KEY] || "never"
  };
}

// Merge freshly-fetched festival/national-day month/day info into the
// stored occasions list, skipping anything the user has hand-edited, and
// preserving ids so existing cards update in place rather than duplicating.
async function mergeFestivals(byName) {
  const edited = await getEditedIds();
  const list = await getUserOccasions();
  const byId = new Map(list.map(o => [o.id, o]));

  for (const [name, info] of byName.entries()) {
    const id = resolveId(name);
    if (edited.has(id)) continue; // respect user edits — never overwritten

    const existing = byId.get(id);
    if (existing) {
      existing.month = info.month;
      existing.day = info.day;
      existing.year = info.year; // the actual calendar year this month/day belongs to — required for shifting festivals (see getUpcoming)
      existing.recurrence = "auto-synced"; // kept fresh automatically, including lunar-calendar shifts, with zero manual upkeep
    } else {
      const entry = {
        id,
        name,
        month: info.month,
        day: info.day,
        year: info.year,
        type: "festival",
        note: "",
        recurrence: "auto-synced"
      };
      list.push(entry);
      byId.set(id, entry);
    }
  }

  await saveUserOccasions(list);
}

// Fetch + parse + merge. Returns { ok, count, error? }.
async function syncFestivalsFromGoogle({ force = false } = {}) {
  const meta = await getSyncMeta();
  const failState = await chrome.storage.local.get(SYNC_FAIL_COUNT_KEY);
  const failCount = failState[SYNC_FAIL_COUNT_KEY] || 0;

  // Normally wait a full day between syncs. But if the last attempt failed,
  // allow a much shorter retry window instead of leaving stale/missing data
  // for up to 24h on a transient network blip.
  const minInterval = failCount > 0 ? SYNC_RETRY_INTERVAL_MS : SYNC_MIN_INTERVAL_MS;
  if (!force && meta.lastSync && (Date.now() - meta.lastSync) < minInterval) {
    return { ok: true, skipped: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SYNC_FETCH_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(GCAL_INDIAN_HOLIDAYS_ICS, { cache: "no-store", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const nowForExpansion = new Date();
    const events = parseICSEvents(text, nowForExpansion);
    if (!events.length) throw new Error("No events parsed from feed");

    const byName = pickClosestPerName(events);
    // Drop everything except the tracked lunar occasions — the feed carries
    // hundreds of entries, but only these few still need a live source.
    const lunarOnly = new Map([...byName].filter(([name]) => isTrackedLunarName(name)));
    await mergeFestivals(lunarOnly);

    await chrome.storage.local.set({
      [SYNC_LAST_KEY]: Date.now(),
      [SYNC_STATUS_KEY]: "ok",
      [SYNC_FAIL_COUNT_KEY]: 0
    });
    return { ok: true, count: lunarOnly.size };
  } catch (err) {
    const isAbort = err && err.name === "AbortError";
    const message = isAbort ? "Timed out reaching Google Calendar" : String(err && err.message || err);
    // Record the failed attempt time too, so the retry backoff above
    // actually applies (otherwise meta.lastSync stays null/old and we'd
    // hammer the feed).
    await chrome.storage.local.set({
      [SYNC_LAST_KEY]: Date.now(),
      [SYNC_STATUS_KEY]: "error",
      [SYNC_FAIL_COUNT_KEY]: failCount + 1
    });
    // Whatever was already in storage stays exactly as-is — a fetch failure
    // never blanks or corrupts existing festival data.
    return { ok: false, error: message, failCount: failCount + 1 };
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    unfoldICS, parseICSEvents, pickClosestPerName, nextOccurrenceFromYMD,
    slug, resolveId, mergeFestivals, syncFestivalsFromGoogle, markUserEdited,
    unmarkUserEdited, getEditedIds, getOrphanedLockedFestivals, getSyncMeta
  };
}
