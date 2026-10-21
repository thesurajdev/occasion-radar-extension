# Occasion Radar

A Chrome extension that remembers birthdays, anniversaries, festivals and public holidays so you don't have to. Add your own dates, pick the countries you care about, and the next few weeks are always one click away in the toolbar.

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/fojkklgdnmnnppkdmbmhjobnihfjhomm)** · Current version: 1.5.0 · Built by [Suraj Dev](https://www.surajdev.com) for [Born To Banger](https://www.borntobanger.in)

<!-- Add 3-4 screenshots here: toolbar popup, options page, new-tab dashboard -->

## What it does

The toolbar popup lists up to 8 occasions coming up in the next 60 days and marks which ones fall today or tomorrow. A badge on the icon shows how many land within the week.

You add your own birthdays and anniversaries, set each one to repeat yearly or happen once, and attach a note. Everything is editable from the options page, and CSV import and export lets you back up the list or move it between browsers.

For festivals and holidays there's a built-in set covering 197 countries. Pick one country, several, or all of them. Fixed dates (Independence Day) and floating ones ("2nd Sunday of May") are calculated offline. Lunar festivals like Diwali, Eid and Chinese New Year can't be computed without a calendar, so those are pulled from Google's public holiday calendars. You can edit or delete any entry and a later sync won't overwrite your change.

There's also an optional new-tab dashboard with a clock, the date, your upcoming occasions, and a carousel of posts from the Born To Banger blog. Turn it off in options and your new tab goes back to normal.

If you enable startup notifications, Chrome tells you once a day when something lands within 3 days.

## Privacy

Your occasions and settings live in `chrome.storage.local`. Nothing you enter is sent to a server.

The extension makes two kinds of network requests, both read-only:

- Google's public holiday calendar feeds (`calendar.google.com`), for the shifting festivals
- The Born To Banger blog RSS feed (`borntobanger.in`), for the new-tab carousel

Permissions requested: `storage`, `alarms`, `notifications`, `unlimitedStorage`, plus host access to those two domains. Privacy policy: https://www.borntobanger.in/legal/privacy-policy

## How it's built

Manifest V3, plain JavaScript, no build step and no dependencies. The calendar and RSS parsers are hand-written because .ics and RSS 2.0 are simple enough that a library would cost more than it saves.

```
manifest.json       extension config
background.js       service worker: badge, alarms, startup notification
popup.html/js       toolbar popup
newtab.html/js      optional new-tab dashboard
options.html/js     manage occasions, regions, CSV import/export
common.js           storage, date logic, CSV parsing
data.js             built-in occasions and country packs
calendar-sync.js    Google holiday feed sync (.ics)
blog-sync.js        Born To Banger RSS sync
```

Sync runs on install, on browser startup, and on an hourly alarm that throttles itself to about once a day. If a fetch fails, the existing data stays as it is and the retry comes sooner.

## Run it locally

1. Clone the repo.
2. Open `chrome://extensions` and switch on Developer mode.
3. Click **Load unpacked** and select the project folder.

## Contributing

Missing a holiday for your country, or a date that's wrong? Open an issue with the country, the occasion and the correct date. Fixes to `data.js` are the easiest pull requests.

## License

No license file yet. Add one (MIT is the usual choice) if you want others to reuse the code.
