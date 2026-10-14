// data.js — static reference data shared by popup, newtab, and background.
// Occasions are tagged by region (see COUNTRIES / COUNTRY_PACKS below) so the
// extension can show one country, several, or everything.
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

// ---------------------------------------------------------------------------
// REGIONS
//
// Every built-in festival / national day carries a `regions` array:
//   ["IN"]            — only for people who selected India
//   ["US","CA"]       — shown if ANY of those countries is selected
//   ["GLOBAL"]        — international days (Earth Day, Valentine's Day…),
//                       shown when "Include international days" is on
// Personal occasions (birthdays, anniversaries, custom) and anything the
// person adds themselves have NO `regions` and are always shown.
//
// To add a country: add it to COUNTRIES, then add a pack to COUNTRY_PACKS
// below (see the format notes there). Nothing else needs to change.
// ---------------------------------------------------------------------------
// Countries supported before v1.5 (they have the full hand-curated packs below).
const CORE_COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" }
];

const EXTRA_COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde", aliases: "cape verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo (Republic)", aliases: "congo brazzaville" },
  { code: "CD", name: "Congo (DR)", aliases: "democratic republic of the congo kinshasa drc" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire", aliases: "ivory coast cote d ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia", aliases: "czech republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini", aliases: "swaziland" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "XK", name: "Kosovo" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar", aliases: "burma" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands", aliases: "holland" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "São Tomé and Príncipe", aliases: "sao tome" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea", aliases: "korea republic of" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste", aliases: "east timor" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Türkiye", aliases: "turkey turkiye" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City", aliases: "holy see" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

// Fixed-date national days / public holidays for the countries added in v1.5.
// Same rule-tuple format as COUNTRY_PACKS. Lunar dates (Eid, Diwali, Tet…) are not
// included here — add them by hand or via a per-country feed in calendar-sync.js.
const EXTRA_COUNTRY_PACKS = {
  AD: [
    ["F", 9, 8, "National Day (Andorra)", "national"]
  ],
  AF: [
    ["F", 8, 19, "Independence Day (Afghanistan)", "national"]
  ],
  AG: [
    ["F", 11, 1, "Independence Day (Antigua and Barbuda)", "national"]
  ],
  AL: [
    ["F", 11, 28, "Independence Day (Albania)", "national"]
  ],
  AM: [
    ["F", 9, 21, "Independence Day (Armenia)", "national"]
  ],
  AO: [
    ["F", 11, 11, "Independence Day (Angola)", "national"]
  ],
  AR: [
    ["F", 5, 25, "May Revolution Day (Argentina)", "national"],
    ["F", 7, 9, "Independence Day (Argentina)", "national"]
  ],
  AT: [
    ["F", 10, 26, "National Day (Austria)", "national"]
  ],
  AZ: [
    ["F", 5, 28, "Republic Day (Azerbaijan)", "national"],
    ["F", 10, 18, "Restoration of Independence Day (Azerbaijan)", "national"]
  ],
  BA: [
    ["F", 11, 25, "Statehood Day (Bosnia and Herzegovina)", "national"]
  ],
  BB: [
    ["F", 11, 30, "Independence Day (Barbados)", "national"]
  ],
  BD: [
    ["F", 3, 26, "Independence Day (Bangladesh)", "national"],
    ["F", 12, 16, "Victory Day (Bangladesh)", "national"]
  ],
  BE: [
    ["F", 7, 21, "National Day (Belgium)", "national"]
  ],
  BF: [
    ["F", 8, 5, "Independence Day (Burkina Faso)", "national"]
  ],
  BG: [
    ["F", 3, 3, "Liberation Day (Bulgaria)", "national"]
  ],
  BH: [
    ["F", 12, 16, "National Day (Bahrain)", "national"]
  ],
  BI: [
    ["F", 7, 1, "Independence Day (Burundi)", "national"]
  ],
  BJ: [
    ["F", 8, 1, "Independence Day (Benin)", "national"]
  ],
  BN: [
    ["F", 2, 23, "National Day (Brunei)", "national"]
  ],
  BO: [
    ["F", 8, 6, "Independence Day (Bolivia)", "national"]
  ],
  BR: [
    ["F", 9, 7, "Independence Day (Brazil)", "national"]
  ],
  BS: [
    ["F", 7, 10, "Independence Day (Bahamas)", "national"]
  ],
  BT: [
    ["F", 12, 17, "National Day (Bhutan)", "national"]
  ],
  BW: [
    ["F", 9, 30, "Independence Day (Botswana)", "national"]
  ],
  BY: [
    ["F", 7, 3, "Independence Day (Belarus)", "national"]
  ],
  BZ: [
    ["F", 9, 21, "Independence Day (Belize)", "national"]
  ],
  CD: [
    ["F", 6, 30, "Independence Day (Congo (DR))", "national"]
  ],
  CF: [
    ["F", 12, 1, "Republic Day (Central African Republic)", "national"]
  ],
  CG: [
    ["F", 8, 15, "Independence Day (Congo (Republic))", "national"]
  ],
  CH: [
    ["F", 8, 1, "Swiss National Day (Switzerland)", "national"]
  ],
  CI: [
    ["F", 8, 7, "Independence Day (Côte d'Ivoire)", "national"]
  ],
  CL: [
    ["F", 9, 18, "Independence Day (Chile)", "national"]
  ],
  CM: [
    ["F", 5, 20, "National Day (Cameroon)", "national"]
  ],
  CN: [
    ["F", 10, 1, "National Day (China)", "national"]
  ],
  CO: [
    ["F", 7, 20, "Independence Day (Colombia)", "national"]
  ],
  CR: [
    ["F", 9, 15, "Independence Day (Costa Rica)", "national"]
  ],
  CU: [
    ["F", 1, 1, "Triumph of the Revolution (Cuba)", "national"],
    ["F", 7, 26, "Day of National Rebellion (Cuba)", "national"]
  ],
  CV: [
    ["F", 7, 5, "Independence Day (Cabo Verde)", "national"]
  ],
  CY: [
    ["F", 10, 1, "Independence Day (Cyprus)", "national"]
  ],
  CZ: [
    ["F", 10, 28, "Independent Czechoslovak State Day (Czechia)", "national"]
  ],
  DJ: [
    ["F", 6, 27, "Independence Day (Djibouti)", "national"]
  ],
  DK: [
    ["F", 6, 5, "Constitution Day (Denmark)", "national"]
  ],
  DM: [
    ["F", 11, 3, "Independence Day (Dominica)", "national"]
  ],
  DO: [
    ["F", 2, 27, "Independence Day (Dominican Republic)", "national"]
  ],
  DZ: [
    ["F", 7, 5, "Independence Day (Algeria)", "national"],
    ["F", 11, 1, "Revolution Day (Algeria)", "national"]
  ],
  EC: [
    ["F", 8, 10, "Independence Day (Ecuador)", "national"]
  ],
  EE: [
    ["F", 2, 24, "Independence Day (Estonia)", "national"]
  ],
  EG: [
    ["F", 7, 23, "Revolution Day (Egypt)", "national"]
  ],
  ER: [
    ["F", 5, 24, "Independence Day (Eritrea)", "national"]
  ],
  ES: [
    ["F", 10, 12, "National Day of Spain", "national"],
    ["F", 12, 6, "Constitution Day (Spain)", "national"]
  ],
  ET: [
    ["F", 3, 2, "Adwa Victory Day (Ethiopia)", "national"],
    ["F", 5, 28, "Derg Downfall Day (Ethiopia)", "national"]
  ],
  FI: [
    ["F", 12, 6, "Independence Day (Finland)", "national"]
  ],
  FJ: [
    ["F", 10, 10, "Fiji Day", "national"]
  ],
  FM: [
    ["F", 11, 3, "Independence Day (Micronesia)", "national"]
  ],
  GA: [
    ["F", 8, 17, "Independence Day (Gabon)", "national"]
  ],
  GD: [
    ["F", 2, 7, "Independence Day (Grenada)", "national"]
  ],
  GE: [
    ["F", 5, 26, "Independence Day (Georgia)", "national"]
  ],
  GH: [
    ["F", 3, 6, "Independence Day (Ghana)", "national"]
  ],
  GM: [
    ["F", 2, 18, "Independence Day (Gambia)", "national"]
  ],
  GN: [
    ["F", 10, 2, "Independence Day (Guinea)", "national"]
  ],
  GQ: [
    ["F", 10, 12, "Independence Day (Equatorial Guinea)", "national"]
  ],
  GR: [
    ["F", 3, 25, "Independence Day (Greece)", "national"],
    ["F", 10, 28, "Ochi Day (Greece)", "national"]
  ],
  GT: [
    ["F", 9, 15, "Independence Day (Guatemala)", "national"]
  ],
  GW: [
    ["F", 9, 24, "Independence Day (Guinea-Bissau)", "national"]
  ],
  GY: [
    ["F", 2, 23, "Republic Day (Guyana)", "national"],
    ["F", 5, 26, "Independence Day (Guyana)", "national"]
  ],
  HN: [
    ["F", 9, 15, "Independence Day (Honduras)", "national"]
  ],
  HR: [
    ["F", 5, 30, "Statehood Day (Croatia)", "national"]
  ],
  HT: [
    ["F", 1, 1, "Independence Day (Haiti)", "national"]
  ],
  HU: [
    ["F", 3, 15, "1848 Revolution Day (Hungary)", "national"],
    ["F", 8, 20, "St Stephen's Day (Hungary)", "national"]
  ],
  ID: [
    ["F", 8, 17, "Independence Day (Indonesia)", "national"]
  ],
  IE: [
    ["F", 3, 17, "St. Patrick's Day (Ireland)", "national"]
  ],
  IL: [
    ["F", 5, 14, "Declaration of Independence (Israel)", "national", "Gregorian date of the 1948 declaration; Yom Ha'atzmaut itself is observed by the Hebrew calendar"]
  ],
  IQ: [
    ["F", 10, 3, "National Day (Iraq)", "national"]
  ],
  IR: [
    ["F", 2, 11, "Islamic Revolution Day (Iran)", "national"]
  ],
  IS: [
    ["F", 6, 17, "National Day (Iceland)", "national"]
  ],
  IT: [
    ["F", 6, 2, "Republic Day (Italy)", "national"],
    ["F", 4, 25, "Liberation Day (Italy)", "national"]
  ],
  JM: [
    ["F", 8, 6, "Independence Day (Jamaica)", "national"]
  ],
  JO: [
    ["F", 5, 25, "Independence Day (Jordan)", "national"]
  ],
  JP: [
    ["F", 2, 11, "National Foundation Day (Japan)", "national"],
    ["F", 2, 23, "Emperor's Birthday (Japan)", "national"],
    ["F", 5, 3, "Constitution Memorial Day (Japan)", "national"]
  ],
  KE: [
    ["F", 12, 12, "Jamhuri Day (Kenya)", "national"]
  ],
  KG: [
    ["F", 8, 31, "Independence Day (Kyrgyzstan)", "national"]
  ],
  KH: [
    ["F", 11, 9, "Independence Day (Cambodia)", "national"]
  ],
  KI: [
    ["F", 7, 12, "Independence Day (Kiribati)", "national"]
  ],
  KM: [
    ["F", 7, 6, "Independence Day (Comoros)", "national"]
  ],
  KN: [
    ["F", 9, 19, "Independence Day (Saint Kitts and Nevis)", "national"]
  ],
  KP: [
    ["F", 9, 9, "Foundation Day (North Korea)", "national"]
  ],
  KR: [
    ["F", 8, 15, "Liberation Day (South Korea)", "national"],
    ["F", 10, 3, "National Foundation Day (South Korea)", "national"]
  ],
  KW: [
    ["F", 2, 25, "National Day (Kuwait)", "national"]
  ],
  KZ: [
    ["F", 12, 16, "Independence Day (Kazakhstan)", "national"]
  ],
  LA: [
    ["F", 12, 2, "National Day (Laos)", "national"]
  ],
  LB: [
    ["F", 11, 22, "Independence Day (Lebanon)", "national"]
  ],
  LC: [
    ["F", 2, 22, "Independence Day (Saint Lucia)", "national"]
  ],
  LI: [
    ["F", 8, 15, "National Day (Liechtenstein)", "national"]
  ],
  LK: [
    ["F", 2, 4, "Independence Day (Sri Lanka)", "national"]
  ],
  LR: [
    ["F", 7, 26, "Independence Day (Liberia)", "national"]
  ],
  LS: [
    ["F", 10, 4, "Independence Day (Lesotho)", "national"]
  ],
  LT: [
    ["F", 2, 16, "Restoration of the State Day (Lithuania)", "national"]
  ],
  LU: [
    ["F", 6, 23, "National Day (Luxembourg)", "national"]
  ],
  LV: [
    ["F", 11, 18, "Independence Day (Latvia)", "national"]
  ],
  LY: [
    ["F", 12, 24, "Independence Day (Libya)", "national"]
  ],
  MA: [
    ["F", 7, 30, "Throne Day (Morocco)", "national"],
    ["F", 11, 18, "Independence Day (Morocco)", "national"]
  ],
  MC: [
    ["F", 11, 19, "National Day (Monaco)", "national"]
  ],
  MD: [
    ["F", 8, 27, "Independence Day (Moldova)", "national"]
  ],
  ME: [
    ["F", 5, 21, "Independence Day (Montenegro)", "national"],
    ["F", 7, 13, "Statehood Day (Montenegro)", "national"]
  ],
  MG: [
    ["F", 6, 26, "Independence Day (Madagascar)", "national"]
  ],
  MH: [
    ["F", 5, 1, "Constitution Day (Marshall Islands)", "national"]
  ],
  MK: [
    ["F", 9, 8, "Independence Day (North Macedonia)", "national"]
  ],
  ML: [
    ["F", 9, 22, "Independence Day (Mali)", "national"]
  ],
  MM: [
    ["F", 1, 4, "Independence Day (Myanmar)", "national"]
  ],
  MN: [
    ["F", 7, 11, "Naadam Festival (Mongolia)", "festival"],
    ["F", 12, 29, "Independence Day (Mongolia)", "national"]
  ],
  MR: [
    ["F", 11, 28, "Independence Day (Mauritania)", "national"]
  ],
  MT: [
    ["F", 9, 21, "Independence Day (Malta)", "national"],
    ["F", 12, 13, "Republic Day (Malta)", "national"]
  ],
  MU: [
    ["F", 3, 12, "National Day (Mauritius)", "national"]
  ],
  MV: [
    ["F", 7, 26, "Independence Day (Maldives)", "national"]
  ],
  MW: [
    ["F", 7, 6, "Independence Day (Malawi)", "national"]
  ],
  MX: [
    ["F", 9, 16, "Independence Day (Mexico)", "national"],
    ["F", 11, 20, "Revolution Day (Mexico)", "national"]
  ],
  MY: [
    ["F", 8, 31, "Merdeka (Independence) Day (Malaysia)", "national"],
    ["F", 9, 16, "Malaysia Day", "national"]
  ],
  MZ: [
    ["F", 6, 25, "Independence Day (Mozambique)", "national"]
  ],
  NA: [
    ["F", 3, 21, "Independence Day (Namibia)", "national"]
  ],
  NE: [
    ["F", 12, 18, "Republic Day (Niger)", "national"]
  ],
  NG: [
    ["F", 10, 1, "Independence Day (Nigeria)", "national"],
    ["F", 6, 12, "Democracy Day (Nigeria)", "national"]
  ],
  NI: [
    ["F", 9, 15, "Independence Day (Nicaragua)", "national"]
  ],
  NL: [
    ["F", 4, 27, "King's Day (Netherlands)", "national"],
    ["F", 5, 5, "Liberation Day (Netherlands)", "remembrance"]
  ],
  NO: [
    ["F", 5, 17, "Constitution Day (Norway)", "national"]
  ],
  NP: [
    ["F", 9, 20, "Constitution Day (Nepal)", "national"]
  ],
  NR: [
    ["F", 1, 31, "Independence Day (Nauru)", "national"]
  ],
  OM: [
    ["F", 11, 18, "National Day (Oman)", "national"]
  ],
  PA: [
    ["F", 11, 3, "Separation Day (Panama)", "national"],
    ["F", 11, 28, "Independence from Spain Day (Panama)", "national"]
  ],
  PE: [
    ["F", 7, 28, "Independence Day (Peru)", "national"]
  ],
  PG: [
    ["F", 9, 16, "Independence Day (Papua New Guinea)", "national"]
  ],
  PH: [
    ["F", 6, 12, "Independence Day (Philippines)", "national"]
  ],
  PK: [
    ["F", 3, 23, "Pakistan Day", "national"],
    ["F", 8, 14, "Independence Day (Pakistan)", "national"]
  ],
  PL: [
    ["F", 5, 3, "Constitution Day (Poland)", "national"],
    ["F", 11, 11, "Independence Day (Poland)", "national"]
  ],
  PS: [
    ["F", 11, 15, "Declaration of Independence Day (Palestine)", "national"]
  ],
  PT: [
    ["F", 4, 25, "Freedom Day (Portugal)", "national"],
    ["F", 6, 10, "Portugal Day", "national"]
  ],
  PW: [
    ["F", 10, 1, "Independence Day (Palau)", "national"]
  ],
  PY: [
    ["F", 5, 15, "Independence Day (Paraguay)", "national"]
  ],
  QA: [
    ["F", 12, 18, "National Day (Qatar)", "national"]
  ],
  RO: [
    ["F", 12, 1, "Great Union Day (Romania)", "national"]
  ],
  RS: [
    ["F", 2, 15, "Statehood Day (Serbia)", "national"]
  ],
  RU: [
    ["F", 5, 9, "Victory Day (Russia)", "remembrance"],
    ["F", 6, 12, "Russia Day", "national"]
  ],
  RW: [
    ["F", 7, 1, "Independence Day (Rwanda)", "national"],
    ["F", 7, 4, "Liberation Day (Rwanda)", "national"]
  ],
  SA: [
    ["F", 9, 23, "National Day (Saudi Arabia)", "national"]
  ],
  SB: [
    ["F", 7, 7, "Independence Day (Solomon Islands)", "national"]
  ],
  SC: [
    ["F", 6, 18, "National Day (Seychelles)", "national"],
    ["F", 6, 29, "Independence Day (Seychelles)", "national"]
  ],
  SD: [
    ["F", 1, 1, "Independence Day (Sudan)", "national"]
  ],
  SE: [
    ["F", 6, 6, "National Day (Sweden)", "national"]
  ],
  SI: [
    ["F", 6, 25, "Statehood Day (Slovenia)", "national"]
  ],
  SK: [
    ["F", 9, 1, "Constitution Day (Slovakia)", "national"]
  ],
  SL: [
    ["F", 4, 27, "Independence Day (Sierra Leone)", "national"]
  ],
  SM: [
    ["F", 9, 3, "Founding of the Republic (San Marino)", "national"]
  ],
  SN: [
    ["F", 4, 4, "Independence Day (Senegal)", "national"]
  ],
  SO: [
    ["F", 7, 1, "Independence Day (Somalia)", "national"]
  ],
  SR: [
    ["F", 11, 25, "Independence Day (Suriname)", "national"]
  ],
  SS: [
    ["F", 7, 9, "Independence Day (South Sudan)", "national"]
  ],
  ST: [
    ["F", 7, 12, "Independence Day (São Tomé and Príncipe)", "national"]
  ],
  SV: [
    ["F", 9, 15, "Independence Day (El Salvador)", "national"]
  ],
  SY: [
    ["F", 4, 17, "Evacuation Day (Syria)", "national"]
  ],
  SZ: [
    ["F", 9, 6, "Independence Day (Eswatini)", "national"]
  ],
  TD: [
    ["F", 8, 11, "Independence Day (Chad)", "national"]
  ],
  TG: [
    ["F", 4, 27, "Independence Day (Togo)", "national"]
  ],
  TH: [
    ["F", 4, 6, "Chakri Day (Thailand)", "national"],
    ["F", 4, 13, "Songkran (Thailand)", "festival"],
    ["F", 12, 10, "Constitution Day (Thailand)", "national"]
  ],
  TJ: [
    ["F", 9, 9, "Independence Day (Tajikistan)", "national"]
  ],
  TL: [
    ["F", 5, 20, "Independence Restoration Day (Timor-Leste)", "national"]
  ],
  TM: [
    ["F", 9, 27, "Independence Day (Turkmenistan)", "national"]
  ],
  TN: [
    ["F", 3, 20, "Independence Day (Tunisia)", "national"],
    ["F", 7, 25, "Republic Day (Tunisia)", "national"]
  ],
  TO: [
    ["F", 6, 4, "Emancipation Day (Tonga)", "national"]
  ],
  TR: [
    ["F", 4, 23, "National Sovereignty and Children's Day (Türkiye)", "national"],
    ["F", 8, 30, "Victory Day (Türkiye)", "national"],
    ["F", 10, 29, "Republic Day (Türkiye)", "national"]
  ],
  TT: [
    ["F", 8, 31, "Independence Day (Trinidad and Tobago)", "national"],
    ["F", 9, 24, "Republic Day (Trinidad and Tobago)", "national"]
  ],
  TV: [
    ["F", 10, 1, "Independence Day (Tuvalu)", "national"]
  ],
  TW: [
    ["F", 10, 10, "Double Ten Day (Taiwan)", "national"]
  ],
  TZ: [
    ["F", 4, 26, "Union Day (Tanzania)", "national"],
    ["F", 12, 9, "Independence Day (Tanzania)", "national"]
  ],
  UA: [
    ["F", 6, 28, "Constitution Day (Ukraine)", "national"],
    ["F", 8, 24, "Independence Day (Ukraine)", "national"]
  ],
  UG: [
    ["F", 10, 9, "Independence Day (Uganda)", "national"]
  ],
  UY: [
    ["F", 8, 25, "Independence Day (Uruguay)", "national"]
  ],
  UZ: [
    ["F", 9, 1, "Independence Day (Uzbekistan)", "national"]
  ],
  VA: [
    ["F", 2, 11, "Lateran Treaty Anniversary (Vatican City)", "national"],
    ["F", 6, 29, "Saints Peter and Paul (Vatican City)", "national"]
  ],
  VC: [
    ["F", 10, 27, "Independence Day (Saint Vincent and the Grenadines)", "national"]
  ],
  VE: [
    ["F", 7, 5, "Independence Day (Venezuela)", "national"]
  ],
  VN: [
    ["F", 9, 2, "National Day (Vietnam)", "national"]
  ],
  VU: [
    ["F", 7, 30, "Independence Day (Vanuatu)", "national"]
  ],
  WS: [
    ["F", 6, 1, "Independence Day (Samoa)", "national"]
  ],
  XK: [
    ["F", 2, 17, "Independence Day (Kosovo)", "national"]
  ],
  YE: [
    ["F", 5, 22, "Unity Day (Yemen)", "national"]
  ],
  ZA: [
    ["F", 3, 21, "Human Rights Day (South Africa)", "national"],
    ["F", 4, 27, "Freedom Day (South Africa)", "national"],
    ["F", 6, 16, "Youth Day (South Africa)", "national"],
    ["F", 9, 24, "Heritage Day (South Africa)", "national"]
  ],
  ZM: [
    ["F", 10, 24, "Independence Day (Zambia)", "national"]
  ],
  ZW: [
    ["F", 4, 18, "Independence Day (Zimbabwe)", "national"]
  ],
};

// Every UN member + Vatican City, Palestine, Taiwan and Kosovo, alphabetical.
const COUNTRIES = [...CORE_COUNTRIES, ...EXTRA_COUNTRIES]
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

function countryName(code) {
  if (code === "GLOBAL") return "International";
  const c = COUNTRIES.find(x => x.code === code);
  return c ? c.name : code;
}

// Names (from the original India list above) that are international days
// rather than India-specific ones. Everything else in the original list
// defaults to ["IN"].
const GLOBAL_DAY_NAMES = new Set([
  "Valentine's Day", "International Women's Day", "April Fools' Day",
  "World Health Day", "Siblings Day", "World Heritage Day", "Earth Day",
  "International Labour Day", "World Press Freedom Day", "International Nurses Day",
  "World No Tobacco Day", "World Environment Day", "Best Friends Day",
  "International Day of Yoga", "World Population Day", "International Tiger Day",
  "International Friendship Day", "International Youth Day", "International Literacy Day",
  "International Day of Peace", "World Tourism Day", "World Teachers' Day",
  "World Postal Day", "World Mental Health Day", "International Day of the Girl Child",
  "World Food Day", "Halloween", "International Men's Day", "World AIDS Day",
  "Human Rights Day", "New Year's Eve"
]);

// Mother's / Father's Day fall on different dates in different countries, so
// the original two entries are scoped to the countries that share THEIR date
// (2nd Sunday of May / 3rd Sunday of June). Other countries get their own
// entries in COUNTRY_PACKS / SHARED_DAYS.
const REGION_OVERRIDES = {
  "Mother's Day": ["IN", "US", "CA", "AU", "NZ", "SG", "DE"],
  "Father's Day": ["IN", "US", "CA", "GB", "SG", "FR", "AE"]
};

function regionsFor(name) {
  if (REGION_OVERRIDES[name]) return REGION_OVERRIDES[name];
  return GLOBAL_DAY_NAMES.has(name) ? ["GLOBAL"] : ["IN"];
}

const STATIC_OCCASIONS = [
  ...STATIC_OCCASIONS_RAW.map(o => ({
    id: `static-${staticSlug(o.name)}`,
    name: o.name,
    type: o.type,
    note: "",
    recurrence: "fixed",
    occurrence: "yearly",
    month: o.month,
    day: o.day,
    regions: regionsFor(o.name)
  })),
  ...STATIC_OCCASIONS_FLOATING_RAW.map(o => ({
    id: `static-${staticSlug(o.name)}`,
    name: o.name,
    type: o.type,
    note: "",
    recurrence: "floating",
    rule: "nth",
    occurrence: "yearly",
    floatMonth: o.floatMonth,
    floatWeekday: o.floatWeekday,
    floatNth: o.floatNth,
    regions: regionsFor(o.name)
  }))
];

// ---------------------------------------------------------------------------
// COUNTRY PACKS — offline, zero-maintenance dates for each supported country.
//
// Rule tuples (weekday: 0=Sun … 6=Sat; nth: 1–4, or -1 for "last"):
//   ["F", month, day,          name, type]   fixed date every year
//   ["N", month, weekday, nth, name, type]   e.g. 4th Thursday of November
//   ["E", offsetDays,          name, type]   Easter Sunday + offset (computed)
//   ["B", month, day, weekday, name, type]   the <weekday> strictly BEFORE
//                                            month/day (Victoria Day = the
//                                            Monday before May 25)
// type: "national" (public holiday / observance) | "festival" | "remembrance"
//
// Lunar / moon-sighted dates (Eid, Diwali, Chinese New Year…) can't be
// computed offline — those come from Google's per-country holiday feed, see
// LUNAR_FEEDS in calendar-sync.js.
// ---------------------------------------------------------------------------
const COUNTRY_PACKS = {
  US: [
    ["N", 1, 1, 3, "Martin Luther King Jr. Day", "national"],
    ["N", 2, 1, 3, "Presidents' Day", "national"],
    ["F", 5, 5, "Cinco de Mayo", "festival"],
    ["N", 5, 1, -1, "Memorial Day", "national"],
    ["F", 6, 19, "Juneteenth", "national"],
    ["F", 7, 4, "Independence Day", "national"],
    ["N", 9, 1, 1, "Labor Day", "national"],
    ["F", 9, 11, "Patriot Day", "remembrance"],
    ["N", 10, 1, 2, "Columbus Day / Indigenous Peoples' Day", "national"],
    ["F", 11, 11, "Veterans Day", "national"],
    ["N", 11, 4, 4, "Thanksgiving", "national"],
    ["F", 12, 7, "Pearl Harbor Remembrance Day", "remembrance"]
  ],
  GB: [
    ["E", -47, "Shrove Tuesday (Pancake Day)", "festival"],
    ["E", -21, "Mothering Sunday", "festival"],
    ["F", 3, 1, "St David's Day", "festival"],
    ["F", 4, 23, "St George's Day", "festival"],
    ["N", 5, 1, 1, "Early May Bank Holiday", "national"],
    ["N", 5, 1, -1, "Spring Bank Holiday", "national"],
    ["N", 8, 1, -1, "Summer Bank Holiday", "national"],
    ["F", 11, 5, "Bonfire Night", "festival"],
    ["F", 11, 11, "Armistice Day", "remembrance"],
    ["N", 11, 0, 2, "Remembrance Sunday", "remembrance"],
    ["F", 11, 30, "St Andrew's Day", "festival"]
  ],
  CA: [
    ["N", 2, 1, 3, "Family Day", "national"],
    ["B", 5, 25, 1, "Victoria Day", "national"],
    ["F", 6, 21, "National Indigenous Peoples Day", "national"],
    ["F", 7, 1, "Canada Day", "national"],
    ["N", 9, 1, 1, "Labour Day", "national"],
    ["F", 9, 30, "National Day for Truth and Reconciliation", "remembrance"],
    ["N", 10, 1, 2, "Thanksgiving (Canada)", "national"]
  ],
  AU: [
    ["F", 1, 26, "Australia Day", "national"],
    ["N", 6, 1, 2, "King's Birthday", "national", "Most states"]
  ],
  NZ: [
    ["F", 2, 6, "Waitangi Day", "national"],
    ["N", 6, 1, 1, "King's Birthday (NZ)", "national"],
    ["N", 10, 1, 4, "Labour Day (NZ)", "national"]
  ],
  SG: [
    ["F", 2, 15, "Total Defence Day", "remembrance"],
    ["F", 7, 21, "Racial Harmony Day", "festival"],
    ["F", 8, 9, "National Day (Singapore)", "national"]
  ],
  AE: [
    ["F", 3, 21, "Mother's Day (UAE)", "festival"],
    ["F", 12, 2, "UAE National Day", "national"]
  ],
  DE: [
    ["E", 39, "Father's Day (Vatertag)", "festival"],
    ["F", 10, 3, "German Unity Day", "national"],
    ["F", 12, 6, "St. Nicholas Day", "festival"],
    ["F", 12, 26, "Second Day of Christmas", "national"]
  ],
  FR: [
    ["F", 5, 8, "Victory in Europe Day (France)", "national"],
    ["F", 7, 14, "Bastille Day", "national"],
    ["F", 8, 15, "Assumption Day", "national"],
    ["F", 11, 1, "All Saints' Day", "national"],
    ["F", 11, 11, "Armistice 1918 Commemoration", "national"]
  ]
};

// Days shared by several countries (same name, same rule) — defined once with
// the list of countries they apply to, instead of being repeated per pack.
const WESTERN = ["US", "GB", "CA", "AU", "NZ", "DE", "FR"];
const SHARED_DAYS = [
  { regions: ["US","GB","CA","AU","NZ","DE","FR","SG","AE"], rule: ["F", 1, 1, "New Year's Day", "national"] },
  { regions: ["GB","CA","AU","NZ","DE","SG"], rule: ["E", -2, "Good Friday", "national"] },
  { regions: WESTERN, rule: ["E", 0, "Easter Sunday", "festival"] },
  { regions: ["GB","AU","NZ","DE","FR"], rule: ["E", 1, "Easter Monday", "national"] },
  { regions: ["DE","FR"], rule: ["E", 39, "Ascension Day", "national"] },
  { regions: ["DE","FR"], rule: ["E", 50, "Whit Monday", "national"] },
  { regions: ["US","CA","AU","GB"], rule: ["F", 3, 17, "St. Patrick's Day", "festival"] },
  { regions: ["AU","NZ"], rule: ["F", 4, 25, "ANZAC Day", "remembrance"] },
  { regions: ["AU","NZ"], rule: ["N", 9, 0, 1, "Father's Day (Australia & NZ)", "festival"] },
  { regions: ["CA","AU"], rule: ["F", 11, 11, "Remembrance Day", "remembrance"] },
  { regions: WESTERN, rule: ["F", 12, 24, "Christmas Eve", "festival"] },
  { regions: [...WESTERN, "SG"], rule: ["F", 12, 25, "Christmas Day", "national"] },
  { regions: ["GB","CA","AU","NZ"], rule: ["F", 12, 26, "Boxing Day", "national"] }
];

// Turn a rule tuple into a stored-occasion object.
function ruleToOccasion(rule, regions, id) {
  const kind = rule[0];
  const base = { id, note: "", occurrence: "yearly", regions };
  if (kind === "F") {
    const [, month, day, name, type, note] = rule;
    return { ...base, name, type, note: note || "", recurrence: "fixed", month, day };
  }
  if (kind === "N") {
    const [, floatMonth, floatWeekday, floatNth, name, type, note] = rule;
    return { ...base, name, type, note: note || "", recurrence: "floating", rule: "nth",
             floatMonth, floatWeekday, floatNth, month: floatMonth, day: 1 };
  }
  if (kind === "E") {
    const [, easterOffset, name, type, note] = rule;
    return { ...base, name, type, note: note || "", recurrence: "floating", rule: "easter",
             easterOffset, month: 1, day: 1 }; // month/day filled in on first read (refreshFloatingDates)
  }
  if (kind === "B") {
    const [, beforeMonth, beforeDay, beforeWeekday, name, type, note] = rule;
    return { ...base, name, type, note: note || "", recurrence: "floating", rule: "before",
             beforeMonth, beforeDay, beforeWeekday, month: beforeMonth, day: beforeDay };
  }
  return null;
}

function ruleName(rule) {
  return { F: rule[3], N: rule[4], E: rule[2], B: rule[4] }[rule[0]];
}

// Occasions for the v1.5 countries. Kept separate so existing installs (already
// seeded with the original packs) can have just these inserted once — see
// EXTRA_COUNTRIES_SEED_KEY in common.js.
const EXTRA_COUNTRY_OCCASIONS = Object.entries(EXTRA_COUNTRY_PACKS).flatMap(([cc, rules]) =>
  rules.map(rule => ruleToOccasion(rule, [cc], `static-${staticSlug(ruleName(rule))}-${cc.toLowerCase()}`))
).filter(Boolean);

const COUNTRY_OCCASIONS = [
  ...EXTRA_COUNTRY_OCCASIONS,
  ...Object.entries(COUNTRY_PACKS).flatMap(([cc, rules]) =>
    rules.map(rule => ruleToOccasion(rule, [cc], `static-${staticSlug(ruleName(rule))}-${cc.toLowerCase()}`))
  ),
  ...SHARED_DAYS.map(({ regions, rule }) =>
    ruleToOccasion(rule, regions, `static-${staticSlug(ruleName(rule))}`))
].filter(Boolean);

// Born To Banger is a Delhi-NCR vendor, so its activity suggestions only make
// sense for people in India. Everyone else gets the occasion without the
// vendor chips. Add more codes here if BTB ever serves other markets.
const BTB_ACTIVITY_REGIONS = ["IN"];

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
  module.exports = { BTB_SITE, STATIC_OCCASIONS, COUNTRY_OCCASIONS, COUNTRIES, COUNTRY_PACKS, SHARED_DAYS, ACTIVITIES, BLOG_TIPS, BTB_ACTIVITY_REGIONS, countryName, regionsFor };
}
