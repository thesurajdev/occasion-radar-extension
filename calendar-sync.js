// calendar-sync.js — keeps the occasions whose dates can't be computed offline
// (lunar / moon-sighted festivals: Diwali, Eid, Chinese New Year, Vesak…) fresh
// automatically by pulling Google's public per-country holiday calendar feeds
// (no login required).
//
// Every other occasion (fixed-date, floating rules like "2nd Sunday of May",
// Easter-based days) is hardcoded in data.js and needs no fetching.
//
// v1.5: EVERY supported country has a Google holiday calendar (see
// GCAL_SLUG_EXCEPTIONS). Which feeds are fetched follows the person's region
// choice (see getFeedCountries): each selected country's calendar is pulled and
// ALL of its holidays / observances are imported automatically; "All countries"
// pulls every calendar. Entries that the built-in packs in data.js already
// cover (same name, same country) are not duplicated.
//
// Feed URL pattern (Google's own public calendars — same ones people add via
// "Other calendars" in Google Calendar):
//   https://calendar.google.com/calendar/ical/<lang>.<name>%23holiday%40group.v.calendar.google.com/public/basic.ics
// We fetch the raw .ics text, parse VEVENT blocks ourselves (no library needed
// — the format is simple), and store results directly.
//
// Design choices:
// - Every synced occasion gets a stable id derived from its own feed name
//   (gcal-<slug> for India, gcal-<cc>-<slug> for other countries), so a name
//   always maps to the same card and re-syncs update it in place rather than
//   duplicating it. Each synced occasion is tagged with its country's region.
// - We never touch anything the user has manually edited or removed
//   (tracked via SYNC_EDITED_KEY).
// - Sync runs automatically: on install, on every browser startup, and on
//   an hourly alarm (self-throttled to ~once/day on success, ~30min retry
//   on failure) — see background.js. No manual action is ever required.
// - If a fetch fails (offline, feed down, network permission revoked),
//   whatever's already in storage is left completely untouched. One country's
//   feed failing never blocks the others.

// Country -> Google calendar name + the shifting festivals to pull from it.
// `cal` is the "<lang>.<name>" part of the calendar id. Names are matched
// case-insensitively against the feed's SUMMARY, ignoring any trailing
// "(...)" sect/regional qualifier (see isTrackedLunarName below).
const LUNAR_FEEDS = {
  IN: {
    cal: "en.indian",
    names: [
      "Hanuman Jayanti", "Akshaya Tritiya", "Guru Purnima", "Gita Jayanti",
      "Janmashtami", "Diwali", "Holi", "Dussehra", "Navratri", "Durga Puja",
      "Raksha Bandhan", "Maha Shivratri", "Ram Navami", "Karva Chauth",
      "Govardhan Puja", "Bhai Dooj", "Ganesh Chaturthi", "Onam", "Pongal",
      "Makar Sankranti", "Chhath Puja", "Vasant Panchami", "Eid al-Fitr",
      "Eid al-Adha", "Milad un-Nabi", "Buddha Purnima", "Mahavir Jayanti",
      "Good Friday"
    ]
  },
  SG: {
    cal: "en.singapore",
    names: ["Chinese New Year", "Hari Raya Puasa", "Hari Raya Haji", "Deepavali", "Vesak Day"]
  },
  // NOTE: the UAE calendar id is the least certain of the three — if Google's
  // feed for it is empty or renamed, this feed simply reports a failure in
  // Options and the rest of the extension carries on (add Eid dates by hand).
  AE: {
    cal: "en.ae",
    names: ["Eid al-Fitr", "Eid al-Adha", "Islamic New Year", "Arafat", "Prophet", "Mawlid"]
  }
};

// Google's public holiday calendars are named "<lang>.<slug>#holiday@group.v.calendar.google.com".
// For most countries the slug is the lowercase ISO code ("br" would be en.br); some
// use a nationality / name instead (en.indian, en.usa, en.uk…). Exceptions below;
// anything not listed uses its lowercase ISO code. Google also publishes a newer
// "<slug>.official" variant for many countries, which we try as a fallback.
const GCAL_SLUG_EXCEPTIONS = {
  AT: "austrian", AU: "australian", BG: "bulgarian", BR: "brazilian", CA: "canadian", CN: "china",
  CZ: "czech", DE: "german", DK: "danish", ES: "spain", FI: "finnish", FR: "french", GB: "uk",
  GR: "greek", HR: "croatian", HU: "hungarian", ID: "indonesian", IE: "irish", IL: "jewish",
  IN: "indian", IT: "italian", JP: "japanese", KR: "south_korea", LT: "lithuanian", LV: "latvian",
  MX: "mexican", MY: "malaysia", NL: "dutch", NO: "norwegian", NZ: "new_zealand", PH: "philippines",
  PL: "polish", PT: "portuguese", RO: "romanian", RU: "russian", SA: "saudiarabian", SE: "swedish",
  SG: "singapore", SI: "slovenian", SK: "slovak", TR: "turkish", TW: "taiwan", UA: "ukrainian",
  US: "usa", VN: "vietnamese", ZA: "sa"
};
// Countries Google has no holiday calendar for at all.
const GCAL_NO_FEED = new Set(["PS"]);

function gcalSlug(cc) {
  return GCAL_SLUG_EXCEPTIONS[cc] || cc.toLowerCase();
}

// Calendar ids to try, in order.
function gcalCalendarIds(cc) {
  const slug = gcalSlug(cc);
  return [`en.${slug}`, `en.${slug}.official`];
}

function gcalIcsUrlForId(calId) {
  return `https://calendar.google.com/calendar/ical/${calId}%23holiday%40group.v.calendar.google.com/public/basic.ics`;
}

function gcalIcsUrl(cc) {
  return gcalIcsUrlForId(gcalCalendarIds(cc)[0]);
}

// Kept for backward compatibility (older code/tests referenced it).
const GCAL_INDIAN_HOLIDAYS_ICS = gcalIcsUrl("IN");

const SYNC_LAST_KEY = "btb_gcal_last_sync";       // ms epoch of last successful sync
const SYNC_STATUS_KEY = "btb_gcal_last_status";   // "ok" | "error" | "never"
const SYNC_FAILED_FEEDS_KEY = "btb_gcal_failed_feeds"; // country codes whose feed failed on the last attempt
const SYNC_EDITED_KEY = "btb_gcal_user_edited";   // array of occasion ids the user hand-edited/removed — never auto-overwritten
const SYNC_MIN_INTERVAL_MS = 20 * 60 * 60 * 1000; // don't re-fetch more than once/~20h even if alarm fires more often
const SYNC_RETRY_INTERVAL_MS = 30 * 60 * 1000;    // on failure, allow retry after 30 min instead of waiting a full day
const SYNC_FAIL_COUNT_KEY = "btb_gcal_fail_count"; // consecutive failure count
const SYNC_FETCH_TIMEOUT_MS = 15 * 1000;          // don't hang forever if the network stalls

// Which countries' feeds should we fetch right now, given the region choice?
async function getFeedCountries() {
  const all = (typeof COUNTRIES !== "undefined" ? COUNTRIES : []).map(c => c.code).filter(cc => !GCAL_NO_FEED.has(cc));
  const prefs = await getRegionPrefs();
  if (prefs.mode === "all") return all;
  return all.filter(cc => prefs.countries.includes(cc));
}

function isTrackedLunarName(name, names = LUNAR_FEEDS.IN.names) {
  const base = name.replace(/\s*\([^()]*\)\s*$/, "").trim().toLowerCase();
  return names.some(n => {
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
            events.push({ name: cur.name, month: m, day: d, year: y1, yearly: true });
            events.push({ name: cur.name, month: m, day: d, year: y1 + 1, yearly: true });
            events.push({ name: cur.name, month: m, day: d, year: y, yearly: true });
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
      byName.set(ev.name, { month: ev.month, day: ev.day, year: candidate.resolvedYear, diff: candidate.diff, upcoming: candidate.upcoming, yearly: !!ev.yearly });
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
      byName.set(ev.name, { month: ev.month, day: ev.day, year: candidate.resolvedYear, diff: candidate.diff, upcoming: candidate.upcoming, yearly: !!ev.yearly });
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
// India keeps the original "gcal-<slug>" ids so everything synced before
// regions existed keeps matching; other countries are namespaced.
function resolveId(name, cc = "IN") {
  return cc === "IN" ? `gcal-${slug(name)}` : `gcal-${cc.toLowerCase()}-${slug(name)}`;
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
  for (const [cc, feed] of Object.entries(LUNAR_FEEDS)) {
    for (const name of feed.names) {
      const id = resolveId(name, cc);
      if (edited.has(id) && !presentIds.has(id)) {
        orphans.push({ id, name: cc === "IN" ? name : `${name} (${countryName(cc)})` });
      }
    }
  }
  return orphans;
}

async function getSyncMeta() {
  const res = await chrome.storage.local.get([SYNC_LAST_KEY, SYNC_STATUS_KEY, SYNC_FAILED_FEEDS_KEY, "btb_gcal_unavailable_feeds"]);
  return {
    lastSync: res[SYNC_LAST_KEY] || null,
    status: res[SYNC_STATUS_KEY] || "never",
    failedFeeds: res[SYNC_FAILED_FEEDS_KEY] || [],
    unavailableFeeds: res["btb_gcal_unavailable_feeds"] || []
  };
}

// ---------------------------------------------------------------------------
// Importing a country's whole Google calendar
// ---------------------------------------------------------------------------

// Feed entries that aren't really occasions (clock changes, observed-day shifts…).
function isNoiseFeedName(name) {
  return name.length > 90 ||
    /daylight saving|summer time|winter time|clocks? (go|change)|\bobserved\b|substitute|day off|bridge day|\bstarts\b|\bends\b/i.test(name);
}

// Google doesn't say what kind of day an entry is, so classify by wording.
function classifyFeedType(name) {
  if (/remembrance|memorial|anzac|armistice|veterans?|martyrs?|victims?|genocide|holocaust|fallen|war dead|pearl harbor|9\/11|patriot day/i.test(name)) return "remembrance";
  if (/independence|national|republic|constitution|liberation|revolution|unity|labou?r|statehood|freedom|heritage|victory|armed forces|army|flag|founding|foundation|sovereignty|democracy|union|president|king|queen|emperor|new year'?s day|public holiday|bank holiday/i.test(name)) return "national";
  return "festival";
}

// "Independence Day (Brazil)" / "Diwali (Smarta)" -> "independence day" / "diwali"
function normFeedName(name) {
  return String(name).toLowerCase().replace(/\s*\([^()]*\)\s*$/, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function regionsCover(o, cc) {
  return !o.regions || !o.regions.length || o.regions.includes(cc) || o.regions.includes("GLOBAL");
}

// Build a lookup of everything already stored that is NOT itself a synced entry
// (built-in packs, user-added), so the feed doesn't add a second copy of a day
// the extension already knows about.
function buildDuplicateIndex(list) {
  const byName = new Map();   // normalized name -> occasions
  const byDate = new Map();   // "m-d" -> occasions
  for (const o of list) {
    if (String(o.id).startsWith("gcal-")) continue;
    if (o.type === "birthday" || o.type === "anniversary") continue;
    const k = normFeedName(o.name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(o);
    const d = `${o.month}-${o.day}`;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push({ o, k });
  }
  return { byName, byDate };
}

function isDuplicateOfExisting(index, name, info, cc) {
  const k = normFeedName(name);
  if ((index.byName.get(k) || []).some(o => regionsCover(o, cc))) return true;
  // Same day and one name contains the other ("Labour Day" vs "Labour Day (NZ)" is
  // already covered above; this catches "Christmas" vs "Christmas Day").
  return (index.byDate.get(`${info.month}-${info.day}`) || []).some(({ o, k: ok }) =>
    regionsCover(o, cc) && ok.length > 3 && k.length > 3 && (ok.includes(k) || k.includes(ok)));
}

// Merge one or more countries' freshly-fetched calendars into storage in a
// single read/write. Skips anything the user hand-edited and preserves ids so
// existing cards update in place rather than duplicating.
//   results: [{ cc, byName: Map(name -> {month, day, year, yearly}) }]
async function mergeFeedResults(results) {
  const edited = await getEditedIds();
  const list = await getUserOccasions();
  const byId = new Map(list.map(o => [o.id, o]));
  const dupIndex = buildDuplicateIndex(list);
  let changed = false;

  for (const { cc, byName } of results) {
    const trackedNames = (LUNAR_FEEDS[cc] && LUNAR_FEEDS[cc].names) || [];
    for (const [name, info] of byName.entries()) {
      if (isNoiseFeedName(name)) continue;
      const id = resolveId(name, cc);
      if (edited.has(id)) continue; // respect user edits — never overwritten

      // Moon-dependent festivals we've always tracked keep the "auto-synced" behaviour;
      // everything else follows the feed: a yearly rule is a plain fixed date.
      const tracked = isTrackedLunarName(name, trackedNames);
      const fixedDate = !!info.yearly && !tracked;

      const existing = byId.get(id);
      if (existing) {
        existing.month = info.month;
        existing.day = info.day;
        if (fixedDate) {
          existing.recurrence = "fixed";
          delete existing.year;
        } else {
          existing.year = info.year; // the actual calendar year this month/day belongs to — required for shifting festivals (see getUpcoming)
          existing.recurrence = "auto-synced";
        }
        if (!existing.regions) existing.regions = [cc];
        changed = true;
        continue;
      }

      if (!tracked && isDuplicateOfExisting(dupIndex, name, info, cc)) continue;

      const entry = {
        id,
        name,
        month: info.month,
        day: info.day,
        ...(fixedDate ? {} : { year: info.year }),
        type: tracked ? "festival" : classifyFeedType(name),
        note: "",
        recurrence: fixedDate ? "fixed" : "auto-synced",
        occurrence: "yearly",
        regions: [cc]
      };
      list.push(entry);
      byId.set(id, entry);
      changed = true;
    }
  }

  if (changed) await saveUserOccasions(list);
}

// Kept for older callers: merge a single country's map.
async function mergeFestivals(byName, cc = "IN") {
  await mergeFeedResults([{ cc, byName }]);
}

// Fetch one country's calendar (trying each candidate id) and parse it.
// Resolves { byName } on success, { unavailable: true } if Google has no calendar
// for it (404 / empty on every candidate), and throws on network trouble.
async function fetchCountryFeed(cc) {
  let sawMissing = false;
  for (const calId of gcalCalendarIds(cc)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SYNC_FETCH_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(gcalIcsUrlForId(calId), { cache: "no-store", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (resp.status === 404 || resp.status === 410 || resp.status === 400) { sawMissing = true; continue; }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const events = parseICSEvents(text, new Date());
    if (!events.length) { sawMissing = true; continue; }
    return { byName: pickClosestPerName(events) };
  }
  if (sawMissing) return { unavailable: true };
  throw new Error("No events parsed from feed");
}

// Kept for older callers / tests: fetch one country and merge it.
async function syncOneFeed(cc) {
  const r = await fetchCountryFeed(cc);
  if (r.unavailable) return 0;
  await mergeFeedResults([{ cc, byName: r.byName }]);
  return r.byName.size;
}

const SYNC_CC_TIMES_KEY = "btb_gcal_cc_synced";          // { CC: ms } per-country last successful fetch
const SYNC_UNAVAILABLE_KEY = "btb_gcal_unavailable_feeds"; // country codes Google has no calendar for
const SYNC_CHUNK_SIZE = 6;                                // feeds fetched in parallel, then merged to storage

// Fetch + parse + merge for every feed the current region choice needs.
//   force:   ignore the once-a-day throttle
//   onlyNew: only fetch countries that haven't been fetched in the last ~20h
//            (used when the person changes their region selection, so ticking one
//            more country doesn't re-download everything)
// Returns { ok, count, error?, failed?: [cc…], unavailable?: [cc…], skipped?, noFeeds? }.
async function syncFestivalsFromGoogle({ force = false, onlyNew = false } = {}) {
  let countries = await getFeedCountries();
  if (!countries.length) {
    return { ok: true, skipped: true, noFeeds: true };
  }

  const meta = await getSyncMeta();
  const stored = await chrome.storage.local.get([SYNC_FAIL_COUNT_KEY, SYNC_CC_TIMES_KEY, SYNC_UNAVAILABLE_KEY]);
  const failCount = stored[SYNC_FAIL_COUNT_KEY] || 0;
  const ccTimes = stored[SYNC_CC_TIMES_KEY] || {};
  const unavailableBefore = new Set(stored[SYNC_UNAVAILABLE_KEY] || []);

  // Normally wait a full day between syncs. But if the last attempt failed,
  // allow a much shorter retry window instead of leaving stale/missing data
  // for up to 24h on a transient network blip.
  const minInterval = failCount > 0 ? SYNC_RETRY_INTERVAL_MS : SYNC_MIN_INTERVAL_MS;
  if (!force && meta.lastSync && (Date.now() - meta.lastSync) < minInterval) {
    // ...unless a country was selected that has never been fetched.
    countries = countries.filter(cc => !ccTimes[cc]);
    if (!countries.length) return { ok: true, skipped: true };
  } else if (onlyNew) {
    countries = countries.filter(cc => !ccTimes[cc] || (Date.now() - ccTimes[cc]) >= SYNC_MIN_INTERVAL_MS);
    if (!countries.length) return { ok: true, skipped: true };
  }

  let count = 0;
  const failed = [];
  const errors = [];
  const unavailable = new Set(unavailableBefore);
  const fetchedAt = { ...ccTimes };

  for (let i = 0; i < countries.length; i += SYNC_CHUNK_SIZE) {
    const chunk = countries.slice(i, i + SYNC_CHUNK_SIZE);
    const settled = await Promise.allSettled(chunk.map(fetchCountryFeed));
    const toMerge = [];
    settled.forEach((r, j) => {
      const cc = chunk[j];
      if (r.status === "fulfilled") {
        if (r.value.unavailable) { unavailable.add(cc); }
        else { unavailable.delete(cc); toMerge.push({ cc, byName: r.value.byName }); count += r.value.byName.size; }
        fetchedAt[cc] = Date.now();
      } else {
        const err = r.reason;
        const isAbort = err && err.name === "AbortError";
        failed.push(cc);
        errors.push(isAbort ? "Timed out reaching Google Calendar" : String((err && err.message) || err));
        // Whatever was already in storage for a failed feed stays exactly as-is —
        // a fetch failure never blanks or corrupts existing festival data.
      }
    });
    if (toMerge.length) await mergeFeedResults(toMerge);
  }

  const common = { [SYNC_CC_TIMES_KEY]: fetchedAt, [SYNC_UNAVAILABLE_KEY]: Array.from(unavailable) };

  if (!failed.length) {
    await chrome.storage.local.set({
      ...common,
      [SYNC_LAST_KEY]: Date.now(),
      [SYNC_STATUS_KEY]: "ok",
      [SYNC_FAIL_COUNT_KEY]: 0,
      [SYNC_FAILED_FEEDS_KEY]: []
    });
    return { ok: true, count, unavailable: Array.from(unavailable) };
  }

  // Record the attempt time too, so the retry backoff above actually applies
  // (otherwise meta.lastSync stays null/old and we'd hammer the feed).
  await chrome.storage.local.set({
    ...common,
    [SYNC_LAST_KEY]: Date.now(),
    [SYNC_STATUS_KEY]: "error",
    [SYNC_FAIL_COUNT_KEY]: failCount + 1,
    [SYNC_FAILED_FEEDS_KEY]: failed
  });
  // Partial success still counts as ok:true for callers that only care whether
  // anything changed; `failed` tells the UI which countries to flag.
  return { ok: failed.length < countries.length, count, error: errors[0], failed, failCount: failCount + 1 };
}

if (typeof module !== "undefined") {
  module.exports = {
    unfoldICS, parseICSEvents, pickClosestPerName, nextOccurrenceFromYMD,
    slug, resolveId, mergeFestivals, mergeFeedResults, syncFestivalsFromGoogle, markUserEdited,
    unmarkUserEdited, getEditedIds, getOrphanedLockedFestivals, getSyncMeta,
    LUNAR_FEEDS, gcalIcsUrl, getFeedCountries, isTrackedLunarName
  };
}
