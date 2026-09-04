// blog-sync.js — keeps the new-tab "From the blog" section fresh automatically
// by pulling Born To Banger's own RSS feed (borntobanger.in/blog/rss.xml).
//
// Same pattern as calendar-sync.js: fetch in the background on the existing
// daily alarm, parse without a library (RSS 2.0 is simple XML), cache the
// latest N posts in chrome.storage.local, and render from that cache on
// every new-tab open (fast — no network wait, no flicker).
//
// If the fetch ever fails (offline, feed down, host_permission revoked), we
// silently keep whatever's already cached; if nothing has ever been cached
// (fresh install, first sync hasn't run yet), the new-tab page falls back to
// the static BLOG_TIPS list in data.js so the section is never empty.

const BLOG_RSS_URL = "https://www.borntobanger.in/blog/rss.xml";

const BLOG_CACHE_KEY = "btb_blog_posts_cache";     // array of parsed posts
const BLOG_SYNC_LAST_KEY = "btb_blog_last_sync";   // ms epoch of last successful sync
const BLOG_SYNC_STATUS_KEY = "btb_blog_last_status"; // "ok" | "error" | "never"
const BLOG_SYNC_MIN_INTERVAL_MS = 20 * 60 * 60 * 1000; // ~once/day, same cadence as calendar sync
const BLOG_SYNC_RETRY_INTERVAL_MS = 30 * 60 * 1000;    // on failure, retry sooner instead of waiting a full day
const BLOG_SYNC_FAIL_COUNT_KEY = "btb_blog_fail_count"; // consecutive failure count
const BLOG_SYNC_FETCH_TIMEOUT_MS = 15 * 1000;      // don't hang forever if the network stalls
const BLOG_MAX_POSTS = 8; // how many recent posts to keep cached for the slider

// Minimal XML text-node reader: given a parent XML fragment string, return
// the text content of the first <tagName>...</tagName> inside it. Handles
// optional CDATA wrapping and un-escapes the handful of XML entities RSS
// feeds commonly use.
function readTag(xml, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const m = xml.match(re);
  if (!m) return "";
  let val = m[1].trim();
  const cdata = val.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) val = cdata[1].trim();
  return val
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// Read a self-closing tag's attribute, e.g. <media:thumbnail url="..." />
function readAttr(xml, tagName, attr) {
  const re = new RegExp(`<${tagName}[^>]*\\s${attr}=["']([^"']*)["'][^>]*/?>`, "i");
  const m = xml.match(re);
  return m ? m[1] : "";
}

// Parse <item>...</item> blocks out of raw RSS 2.0 XML text into
// { title, link, description, image, pubDate }.
function parseRSSItems(xmlText) {
  const items = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xmlText)) !== null) {
    const block = m[1];
    const title = readTag(block, "title");
    const link = readTag(block, "link");
    if (!title || !link) continue; // skip malformed entries rather than guess
    const description = readTag(block, "description");
    const pubDateRaw = readTag(block, "pubDate");
    const pubDate = pubDateRaw ? Date.parse(pubDateRaw) : NaN;
    const image =
      readAttr(block, "media:thumbnail", "url") ||
      readAttr(block, "media:content", "url") ||
      readAttr(block, "enclosure", "url") ||
      "";
    items.push({ title, link, description, image, pubDate: Number.isNaN(pubDate) ? null : pubDate });
  }
  return items;
}

async function getBlogSyncMeta() {
  const res = await chrome.storage.local.get([BLOG_SYNC_LAST_KEY, BLOG_SYNC_STATUS_KEY]);
  return {
    lastSync: res[BLOG_SYNC_LAST_KEY] || null,
    status: res[BLOG_SYNC_STATUS_KEY] || "never"
  };
}

// Read whatever's cached (possibly stale, possibly empty) without fetching.
async function getCachedBlogPosts() {
  const res = await chrome.storage.local.get(BLOG_CACHE_KEY);
  return res[BLOG_CACHE_KEY] || [];
}

// Fetch + parse + cache. Returns { ok, count, error? }.
async function syncBlogFromRSS({ force = false } = {}) {
  const meta = await getBlogSyncMeta();
  const failState = await chrome.storage.local.get(BLOG_SYNC_FAIL_COUNT_KEY);
  const failCount = failState[BLOG_SYNC_FAIL_COUNT_KEY] || 0;
  const minInterval = failCount > 0 ? BLOG_SYNC_RETRY_INTERVAL_MS : BLOG_SYNC_MIN_INTERVAL_MS;
  if (!force && meta.lastSync && (Date.now() - meta.lastSync) < minInterval) {
    return { ok: true, skipped: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BLOG_SYNC_FETCH_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(BLOG_RSS_URL, { cache: "no-store", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const items = parseRSSItems(text);
    if (!items.length) throw new Error("No items parsed from feed");

    // Newest first (feed is already newest-first in practice, but don't rely on it).
    items.sort((a, b) => (b.pubDate || 0) - (a.pubDate || 0));
    const posts = items.slice(0, BLOG_MAX_POSTS);

    await chrome.storage.local.set({
      [BLOG_CACHE_KEY]: posts,
      [BLOG_SYNC_LAST_KEY]: Date.now(),
      [BLOG_SYNC_STATUS_KEY]: "ok",
      [BLOG_SYNC_FAIL_COUNT_KEY]: 0
    });
    return { ok: true, count: posts.length };
  } catch (err) {
    const isAbort = err && err.name === "AbortError";
    const message = isAbort ? "Timed out reaching the blog feed" : String(err && err.message || err);
    await chrome.storage.local.set({
      [BLOG_SYNC_LAST_KEY]: Date.now(),
      [BLOG_SYNC_STATUS_KEY]: "error",
      [BLOG_SYNC_FAIL_COUNT_KEY]: failCount + 1
    });
    // Whatever's already cached stays exactly as-is — a fetch failure never
    // blanks the slider, it just keeps showing the last good posts.
    return { ok: false, error: message, failCount: failCount + 1 };
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    syncBlogFromRSS,
    getBlogSyncMeta,
    getCachedBlogPosts,
    parseRSSItems
  };
}
