// data.js — static reference data shared by popup, newtab, and background.
//
// OCCASION DATES — three tiers:
//   F (fixed)    — same Gregorian date every year. Hardcoded below with a
//                  literal month/day. Never needs updating.
//   G (floating) — a rule like "2nd Sunday of May", not a fixed date.
//                  Hardcoded below as a rule (floatMonth/floatWeekday/
//                  floatNth); common.js works out the actual date for the
//                  current year automatically (see nthWeekdayOfMonth /
//                  refreshFloatingDates) — zero manual upkeep.
//   L (lunar)    — shifts on the lunar calendar with no fixed rule (Hanuman
//                  Jayanti, Akshaya Tritiya, Guru Purnima, Gita Jayanti).
//                  These four are NOT hardcoded here — they're the only
//                  occasions still pulled live from Google's public Indian
//                  Holidays calendar feed (see calendar-sync.js).
//
// Every entry here is seeded into storage once on first run (see
// seedStaticOccasions in common.js). After that it behaves like any other
// occasion — the person can edit or remove it from Options and that choice
// sticks, since there's no daily re-sync to overwrite it.

const BTB_SITE = "https://www.borntobanger.in";

function staticSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// type: "festival" | "national" | "remembrance" (R-tier — no activity
// suggestions, see newtab.js).
const STATIC_OCCASIONS_RAW = [
  // ---- January ----
  { name: "Pravasi Bharatiya Divas", month: 1, day: 9, type: "national" },
  { name: "World Hindi Day", month: 1, day: 10, type: "national" },
  { name: "National Youth Day", month: 1, day: 12, type: "national" },
  { name: "Army Day", month: 1, day: 15, type: "national" },
  { name: "Netaji Subhas Chandra Bose Jayanti", month: 1, day: 23, type: "national" },
  { name: "National Girl Child Day", month: 1, day: 24, type: "national" },
  { name: "National Voters' Day", month: 1, day: 25, type: "national" },
  { name: "Martyrs' Day", month: 1, day: 30, type: "remembrance" },

  // ---- February ----
  { name: "Rose Day", month: 2, day: 7, type: "festival" },
  { name: "Propose Day", month: 2, day: 8, type: "festival" },
  { name: "Chocolate Day", month: 2, day: 9, type: "festival" },
  { name: "Teddy Day", month: 2, day: 10, type: "festival" },
  { name: "Promise Day", month: 2, day: 11, type: "festival" },
  { name: "Hug Day", month: 2, day: 12, type: "festival" },
  { name: "Kiss Day", month: 2, day: 13, type: "festival" },
  { name: "Sarojini Naidu Jayanti", month: 2, day: 13, type: "national" },
  { name: "Valentine's Day", month: 2, day: 14, type: "festival" },
  { name: "Pulwama Attack anniversary", month: 2, day: 14, type: "remembrance" },
  { name: "Slap Day", month: 2, day: 15, type: "festival" },
  { name: "Kick Day", month: 2, day: 16, type: "festival" },
  { name: "Perfume Day", month: 2, day: 17, type: "festival" },
  { name: "Flirting Day", month: 2, day: 18, type: "festival" },
  { name: "Confession Day", month: 2, day: 19, type: "festival" },
  { name: "Missing Day", month: 2, day: 20, type: "festival" },
  { name: "Breakup Day", month: 2, day: 21, type: "festival" },
  { name: "National Science Day", month: 2, day: 28, type: "national" },

  // ---- March ----
  { name: "International Women's Day", month: 3, day: 8, type: "national" },
  { name: "Shaheed Diwas", month: 3, day: 23, type: "remembrance" },
  { name: "Rajasthan Day", month: 3, day: 30, type: "national" },

  // ---- April ---- (Hanuman Jayanti 2nd, Akshaya Tritiya 20th are lunar — see calendar-sync.js)
  { name: "April Fools' Day", month: 4, day: 1, type: "festival" },
  { name: "National Maritime Day", month: 4, day: 5, type: "national" },
  { name: "World Health Day", month: 4, day: 7, type: "national" },
  { name: "Siblings Day", month: 4, day: 10, type: "festival" },
  { name: "Himachal Pradesh Day", month: 4, day: 15, type: "national" },
  { name: "World Heritage Day", month: 4, day: 18, type: "national" },
  { name: "National Civil Service Day", month: 4, day: 21, type: "national" },
  { name: "Earth Day", month: 4, day: 22, type: "national" },
  { name: "National Panchayati Raj Day", month: 4, day: 24, type: "national" },

  // ---- May ---- (Mother's Day is floating — see below)
  { name: "International Labour Day", month: 5, day: 1, type: "national" },
  { name: "World Press Freedom Day", month: 5, day: 3, type: "national" },
  { name: "National Technology Day", month: 5, day: 11, type: "national" },
  { name: "International Nurses Day", month: 5, day: 12, type: "national" },
  { name: "National Anti-Terrorism Day", month: 5, day: 21, type: "national" },
  { name: "World No Tobacco Day", month: 5, day: 31, type: "national" },

  // ---- June ---- (Father's Day is floating — see below)
  { name: "World Environment Day", month: 6, day: 5, type: "national" },
  { name: "Best Friends Day", month: 6, day: 8, type: "festival" },
  { name: "International Day of Yoga", month: 6, day: 21, type: "national" },
  { name: "National Statistics Day", month: 6, day: 29, type: "national" },

  // ---- July ---- (Guru Purnima 29th is lunar — see calendar-sync.js)
  { name: "National Doctor's Day", month: 7, day: 1, type: "national" },
  { name: "World Population Day", month: 7, day: 11, type: "national" },
  { name: "Chandrashekhar Azad Jayanti", month: 7, day: 23, type: "national" },
  { name: "Kargil Vijay Diwas", month: 7, day: 26, type: "national" },
  { name: "International Tiger Day", month: 7, day: 29, type: "national" },
  { name: "International Friendship Day", month: 7, day: 30, type: "festival" },

  // ---- August ---- (Friendship Day (India) is floating — see below)
  { name: "National Handloom Day", month: 8, day: 7, type: "national" },
  { name: "Quit India Movement Day", month: 8, day: 8, type: "national" },
  { name: "International Youth Day", month: 8, day: 12, type: "national" },
  { name: "Sadbhavna Diwas", month: 8, day: 20, type: "national" },
  { name: "National Sports Day", month: 8, day: 29, type: "national" },

  // ---- September ----
  { name: "Teachers' Day", month: 9, day: 5, type: "national" },
  { name: "International Literacy Day", month: 9, day: 8, type: "national" },
  { name: "National Forest Martyrs Day", month: 9, day: 11, type: "national" },
  { name: "Hindi Diwas", month: 9, day: 14, type: "national" },
  { name: "Engineer's Day", month: 9, day: 15, type: "national" },
  { name: "International Day of Peace", month: 9, day: 21, type: "national" },
  { name: "World Tourism Day", month: 9, day: 27, type: "national" },

  // ---- October ----
  { name: "Lal Bahadur Shastri Jayanti", month: 10, day: 2, type: "national" },
  { name: "World Teachers' Day", month: 10, day: 5, type: "national" },
  { name: "Indian Air Force Day", month: 10, day: 8, type: "national" },
  { name: "World Postal Day", month: 10, day: 9, type: "national" },
  { name: "World Mental Health Day", month: 10, day: 10, type: "national" },
  { name: "International Day of the Girl Child", month: 10, day: 11, type: "national" },
  { name: "World Students' Day", month: 10, day: 15, type: "national" },
  { name: "World Food Day", month: 10, day: 16, type: "national" },
  { name: "Police Commemoration Day", month: 10, day: 21, type: "remembrance" },
  { name: "National Unity Day", month: 10, day: 31, type: "national" },
  { name: "Halloween", month: 10, day: 31, type: "festival" },

  // ---- November ----
  { name: "Haryana Day / Punjab Day", month: 11, day: 1, type: "national" },
  { name: "National Cancer Awareness Day", month: 11, day: 7, type: "national" },
  { name: "National Education Day", month: 11, day: 11, type: "national" },
  { name: "Children's Day", month: 11, day: 14, type: "festival" },
  { name: "International Men's Day", month: 11, day: 19, type: "festival" },
  { name: "Indira Gandhi Jayanti", month: 11, day: 19, type: "national" },
  { name: "Constitution Day", month: 11, day: 26, type: "national" },
  { name: "26/11 Mumbai attacks anniversary", month: 11, day: 26, type: "remembrance" },

  // ---- December ---- (Gita Jayanti 20th is lunar — see calendar-sync.js)
  { name: "World AIDS Day", month: 12, day: 1, type: "national" },
  { name: "Bhopal Gas Tragedy anniversary", month: 12, day: 2, type: "remembrance" },
  { name: "Indian Navy Day", month: 12, day: 4, type: "national" },
  { name: "Armed Forces Flag Day", month: 12, day: 7, type: "national" },
  { name: "Human Rights Day", month: 12, day: 10, type: "national" },
  { name: "Parliament Attack anniversary", month: 12, day: 13, type: "remembrance" },
  { name: "National Energy Conservation Day", month: 12, day: 14, type: "national" },
  { name: "Vijay Diwas", month: 12, day: 16, type: "national" },
  { name: "National Mathematics Day", month: 12, day: 22, type: "national" },
  { name: "Kisan Diwas", month: 12, day: 23, type: "national" },
  { name: "National Good Governance Day", month: 12, day: 25, type: "national" },
  { name: "New Year's Eve", month: 12, day: 31, type: "festival" }
];

// G-tier: floating rule, resolved automatically each year by
// refreshFloatingDates() in common.js. floatWeekday: 0=Sun..6=Sat.
// floatNth: 1st/2nd/3rd/4th occurrence of that weekday in the month
// (-1 would mean "last", not needed here).
const STATIC_OCCASIONS_FLOATING_RAW = [
  { name: "Mother's Day", floatMonth: 5, floatWeekday: 0, floatNth: 2, type: "festival" },
  { name: "Father's Day", floatMonth: 6, floatWeekday: 0, floatNth: 3, type: "festival" },
  { name: "Friendship Day (India)", floatMonth: 8, floatWeekday: 0, floatNth: 1, type: "festival" }
];

const STATIC_OCCASIONS = [
  ...STATIC_OCCASIONS_RAW.map(o => ({
    id: `static-${staticSlug(o.name)}`,
    name: o.name,
    type: o.type,
    note: "",
    recurrence: "fixed",
    occurrence: "yearly",
    month: o.month,
    day: o.day
  })),
  ...STATIC_OCCASIONS_FLOATING_RAW.map(o => ({
    id: `static-${staticSlug(o.name)}`,
    name: o.name,
    type: o.type,
    note: "",
    recurrence: "floating",
    occurrence: "yearly",
    floatMonth: o.floatMonth,
    floatWeekday: o.floatWeekday,
    floatNth: o.floatNth
  }))
];

// Small slice of BTB's real activity catalog, used for suggestions.
// (Prices/links as published on borntobanger.in at time of writing.)
const ACTIVITIES = [
  { name: "B&W Caricature",       price: 3799, url: `${BTB_SITE}/activities/artists-live-activities/black-and-white-caricature`, fit: ["birthday","anniversary","festival","corporate"] },
  { name: "Face Painting",        price: 2699, url: `${BTB_SITE}/activities/artists-live-activities/face-painting`, fit: ["birthday","festival"] },
  { name: "Balloon Twisting",     price: 3399, url: `${BTB_SITE}/activities/games-entertainment/balloon-twisting`, fit: ["birthday","festival"] },
  { name: "Temporary Tattoos",    price: 1799, url: `${BTB_SITE}/activities/artists-live-activities/temporary-tattoos`, fit: ["birthday","festival"] },
  { name: "Hair Braiding",        price: 3399, url: `${BTB_SITE}/activities/artists-live-activities/hair-braiding`, fit: ["birthday","anniversary"] },
  { name: "Canvas Painting",      price: 5999, url: `${BTB_SITE}/activities/diy-creative-activities/canvas-painting`, fit: ["anniversary","corporate"] },
  { name: "Beaded Sunglasses",    price: 4999, url: `${BTB_SITE}/activities/diy-creative-activities/beaded-sunglasses`, fit: ["birthday"] }
];

// Blog posts to surface contextually.
const BLOG_TIPS = [
  { match: "small-space", title: "Small-space party guide", url: `${BTB_SITE}/blog/party-entertainment-small-apartment-delhi-ncr` },
  { match: "red-flags",   title: "Questions to ask before booking a vendor", url: `${BTB_SITE}/blog/questions-ask-before-booking-party-entertainment-vendor` },
  { match: "headcount",   title: "How many activity stations do you need?", url: `${BTB_SITE}/blog/how-many-activity-artists-stations-needed-event` },
  { match: "cost",        title: "Real pricing by activity", url: `${BTB_SITE}/blog/party-entertainment-activities-cost-delhi-ncr` },
  { match: "monsoon",     title: "Monsoon indoor backup plan", url: `${BTB_SITE}/blog/monsoon-indoor-event-backup-plan-delhi-ncr` },
  { match: "friendship",  title: "Friendship Day ideas beyond the bracelet", url: `${BTB_SITE}/blog/friendship-day-celebration-ideas-delhi-ncr` }
];

if (typeof module !== "undefined") {
  module.exports = { BTB_SITE, STATIC_OCCASIONS, ACTIVITIES, BLOG_TIPS };
}
