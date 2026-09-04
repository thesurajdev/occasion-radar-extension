importScripts("data.js", "common.js", "calendar-sync.js", "blog-sync.js");

const BADGE_WINDOW_DAYS = 7; // "how many occasions in the next week" on the toolbar icon
const NOTIFY_WINDOW_DAYS = 3; // show a startup notification if something lands within this many days
const LAST_NOTIFY_KEY = "btb_last_startup_notify_date"; // yyyy-mm-dd, so we notify at most once per day

async function refreshBadge() {
  await pruneExpiredOnceOccasions();
  const occasions = await getUserOccasions();
  const upcoming = getUpcoming(occasions, new Date(), BADGE_WINDOW_DAYS);
  const count = upcoming.length;
  chrome.action.setBadgeText({ text: count ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#fd1f4a" });
}

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function occasionLine(item) {
  if (item.daysLeft === 0) return `${item.name} — today!`;
  if (item.daysLeft === 1) return `${item.name} — tomorrow`;
  return `${item.name} — in ${item.daysLeft} days`;
}

async function notifyIfUpcoming() {
  const enabled = await getStartupNotify();
  if (!enabled) return;

  const key = todayKey();
  const stored = await chrome.storage.local.get(LAST_NOTIFY_KEY);
  if (stored[LAST_NOTIFY_KEY] === key) return; // already notified today

  const occasions = await getUserOccasions();
  const upcoming = getUpcoming(occasions, new Date(), NOTIFY_WINDOW_DAYS);
  if (!upcoming.length) return;

  const lines = upcoming.slice(0, 3).map(occasionLine);
  const extra = upcoming.length > 3 ? ` (+${upcoming.length - 3} more)` : "";
  const title = upcoming.length === 1
    ? "1 occasion coming up"
    : `${upcoming.length} occasions coming up`;

  chrome.notifications.create("btb-startup-upcoming", {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message: lines.join("\n") + extra,
    priority: 1
  });

  await chrome.storage.local.set({ [LAST_NOTIFY_KEY]: key });
}

async function runCalendarSync({ force = false } = {}) {
  const result = await syncFestivalsFromGoogle({ force });
  if (result.ok && !result.skipped) {
    await refreshBadge();
    chrome.runtime.sendMessage({ type: "occasions-updated" }).catch(() => {});
  }
  return result;
}

async function runBlogSync({ force = false } = {}) {
  const result = await syncBlogFromRSS({ force });
  if (result.ok && !result.skipped) {
    chrome.runtime.sendMessage({ type: "blog-updated" }).catch(() => {});
  }
  return result;
}

chrome.runtime.onInstalled.addListener((details) => {
  chrome.alarms.create("btb-daily-refresh", { periodInMinutes: 60 * 6 });
  chrome.alarms.create("btb-calendar-sync", { periodInMinutes: 60 }); // check hourly; sync itself still self-throttles to ~once/day (or ~30min if last attempt failed)
  chrome.alarms.create("btb-blog-sync", { periodInMinutes: 60 * 24 });     // ~once/day
  refreshBadge();
  // Always force an immediate resync here, ignoring the normal once-a-day
  // throttle — regardless of install reason ("install", "update", or a
  // dev reload of an unpacked extension, which Chrome may report either
  // way). This matters when a sync-logic fix ships: without forcing, a
  // previously "successfully" synced (but wrong) date would otherwise sit
  // in storage untouched until the next natural throttle window, up to
  // ~20h later.
  runCalendarSync({ force: true });
  runBlogSync({ force: true });
});

chrome.runtime.onStartup.addListener(() => {
  refreshBadge();
  notifyIfUpcoming();
  runCalendarSync();
  runBlogSync();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "btb-daily-refresh") refreshBadge();
  if (alarm.name === "btb-calendar-sync") runCalendarSync();
  if (alarm.name === "btb-blog-sync") runBlogSync();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "occasions-updated") {
    refreshBadge();
    return; // no async response needed
  }
  if (msg?.type === "force-calendar-sync") {
    runCalendarSync({ force: true }).then(sendResponse);
    return true; // keep the message channel open for the async sendResponse
  }
  if (msg?.type === "force-blog-sync") {
    runBlogSync({ force: true }).then(sendResponse);
    return true;
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId === "btb-startup-upcoming") {
    chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
    chrome.notifications.clear(notifId);
  }
});
