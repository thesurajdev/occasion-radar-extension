# 🎉 Occasion Radar

**Never miss a birthday, anniversary, festival, or special day.**

Occasion Radar is a Chrome extension by **[Born To Banger](https://www.borntobanger.in)** that brings upcoming occasions into one simple radar. Track personal dates, discover festivals and public holidays for selected countries, receive timely reminders, and see occasion inspiration whenever you open a new tab.

<p align="center">
  <img src="icons/icon128.png" alt="Occasion Radar icon" width="96">
</p>

## ✨ Features

- **Personal occasion tracking** — add birthdays, anniversaries, and custom occasions.
- **Upcoming occasion radar** — see what’s today, tomorrow, this week, this month, and later.
- **Festivals and public holidays** — choose specific countries or show occasions from all supported country calendars.
- **International days** — optionally include globally observed days such as Earth Day and Valentine's Day.
- **Browser notifications** — enable reminders for occasions coming up in the next few days.
- **New Tab dashboard** — make your Chrome New Tab page a place to check upcoming occasions.
- **Calendar sync** — refresh country festival and holiday dates from Google Calendar feeds.
- **Blog inspiration** — see recent articles from Born To Banger on the New Tab page.
- **Settings and management** — manage personal occasions, region preferences, and display options.
- **Light and dark appearance** — follows the browser’s color-scheme preference.
- **Local-first storage** — your saved personal occasions are stored in Chrome's extension storage.

## 🧭 How it works

1. Open the extension from the Chrome toolbar.
2. Add a birthday, anniversary, or custom occasion.
3. Open **Manage all** to select countries, configure international days, and manage your occasions.
4. Turn on notifications or enable the New Tab page options that suit you.
5. Check Occasion Radar to plan ahead and explore activity ideas from Born To Banger.

## 📦 Installation

### Install locally (Developer mode)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/thesurajdev/occasion-radar-extension.git
   ```
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder containing `manifest.json`.

The extension should now appear in your Chrome toolbar. Pin it for quick access.

## ⚙️ Configuration

Open the extension and choose **Manage all** to configure:

| Setting | What it does |
| --- | --- |
| Region | Select countries or show calendars from all supported countries |
| International days | Include or exclude worldwide observances |
| New Tab page | Show the Occasion Radar dashboard on each new tab |
| Startup notifications | Show a notification on browser start when an occasion is close |
| Spark effect | Toggle the decorative cursor-reactive effect on the New Tab page |
| Personal occasions | Add, edit, filter, or manage birthdays, anniversaries, and custom dates |

Availability and dates for country calendar feeds depend on the calendars provided by Google.

## 🗂️ Project structure

| File | Purpose |
| --- | --- |
| `manifest.json` | Chrome Extension Manifest V3 configuration and permissions |
| `popup.html`, `popup.js` | Toolbar popup and quick occasion entry |
| `options.html`, `options.js` | Settings, region preferences, and occasion management |
| `newtab.html`, `newtab.js` | New Tab dashboard |
| `newtab-spark.js` | Optional spark effect on the New Tab page |
| `background.js` | Background tasks, alarms, and notifications |
| `common.js` | Shared storage, date, and occasion utilities |
| `data.js` | Built-in occasion data and supporting constants |
| `calendar-sync.js` | Google Calendar festival and holiday feed syncing |
| `blog-sync.js` | Born To Banger RSS feed syncing |
| `style.css` | Shared styles |
| `icons/` | Extension icons |

## 🔐 Permissions and privacy

Occasion Radar requests these Chrome permissions:

- `storage` — save settings, personal occasions, and cached feed data.
- `alarms` — schedule periodic background refreshes.
- `notifications` — display reminders when enabled.
- `unlimitedStorage` — allow the extension to keep its local occasion and feed data.

Host access is requested for Google Calendar and Born To Banger so the extension can refresh public calendar feeds and the site's blog RSS feed.

Personal occasions are stored locally in Chrome extension storage. Calendar and blog features fetch data from their respective services. Review `manifest.json` and the source files if you want to inspect exactly what the extension requests and how it operates.

## 🛠️ Built with

- HTML
- CSS
- JavaScript
- Chrome Extensions Manifest V3
- Chrome Extension APIs
- Google Calendar ICS feeds
- Born To Banger RSS feed

No build step or package installation is required for local installation.

## 💡 About Born To Banger

**[Born To Banger](https://www.borntobanger.in)** creates memorable experiences through activities, workshops, entertainment, and event services.

Explore activities: [borntobanger.in/activities](https://www.borntobanger.in/activities)

## 🤝 Contributing

Suggestions, bug reports, and improvements are welcome. Open an issue describing the problem or proposed change, or submit a pull request.

## 📄 License

No license file is currently included in this repository. Unless a license is added, reuse and redistribution are not explicitly granted.

---

<p align="center">
  Made with ❤️ by <a href="https://www.borntobanger.in">Born To Banger</a>
</p>
