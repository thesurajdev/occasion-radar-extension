<div align="center">

# 🎉 Occasion Radar

### Keep every important date on your radar.

A Chrome extension to track birthdays, anniversaries, festivals, public holidays, and special days — with reminders and a helpful New Tab dashboard.

**Created by [Suraj Dev](https://www.surajdev.com) for [Born To Banger](https://www.borntobanger.in)**

</div>

---

## ✨ What is Occasion Radar?

Occasion Radar helps you remember the moments that matter. Add personal occasions, choose which countries’ festivals and public holidays you want to follow, and check upcoming dates from the Chrome toolbar or your New Tab page.

It also connects occasion planning with inspiration from Born To Banger, where you can explore activities and experiences for celebrations.

## 🚀 Features

- **Personal occasions:** Add birthdays, anniversaries, and custom dates.
- **Upcoming dates:** See occasions grouped by urgency, including today, tomorrow, this week, and later.
- **Country-based calendars:** Choose selected countries or view occasions from all supported countries.
- **International days:** Optionally include worldwide observances.
- **Browser notifications:** Enable notifications for occasions approaching soon.
- **New Tab dashboard:** See upcoming occasions whenever you open a new tab.
- **Calendar refresh:** Sync festival and public-holiday information from available Google Calendar feeds.
- **Born To Banger blog:** Display recent blog posts on the New Tab page.
- **Flexible settings:** Manage occasions, region preferences, notifications, and visual effects.
- **No build step:** The extension uses plain HTML, CSS, and JavaScript.

## 🧭 Get started

1. Install the extension using the instructions below.
2. Click the Occasion Radar icon in the Chrome toolbar.
3. Add a birthday, anniversary, or custom occasion.
4. Select your preferred countries and international-day settings under **Manage all**.
5. Enable notifications and the New Tab dashboard if you want to use them.

## 📦 Installation

### Load the extension in Chrome

1. Download this repository by clicking **Code → Download ZIP**, then extract it. Or clone it:

   ```bash
   git clone https://github.com/thesurajdev/occasion-radar-extension.git
   ```

2. Open `chrome://extensions` in Google Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted repository folder — the folder containing `manifest.json`.

Occasion Radar should now appear in your extensions list. Pin it to the toolbar for quick access.

> This is the manual installation method for development and testing. Follow the Chrome Web Store listing if a published version becomes available.

## ⚙️ Settings

Open **Manage all** in the extension to configure available options.

| Setting | Description |
| --- | --- |
| Region | Choose selected countries or all supported countries for festivals and public holidays. |
| International days | Include or exclude worldwide observances. |
| Personal occasions | Add and manage birthdays, anniversaries, and custom occasions. |
| New Tab page | Show the Occasion Radar dashboard when opening a new tab. |
| Startup notifications | Show a browser notification on startup when an occasion is approaching, if enabled. |
| Spark effect | Turn the decorative cursor-reactive effect on the New Tab page on or off. |

Calendar coverage depends on the feeds available for the countries you select. Dates and availability may vary by calendar source.

## 🗂️ Project structure

| File or folder | Purpose |
| --- | --- |
| `manifest.json` | Chrome Extension Manifest V3 configuration, permissions, popup, and New Tab override. |
| `popup.html` / `popup.js` | Toolbar popup and quick occasion entry. |
| `options.html` / `options.js` | Settings, region selection, and occasion management. |
| `newtab.html` / `newtab.js` | New Tab dashboard. |
| `newtab-spark.js` | Optional visual spark effect. |
| `background.js` | Background tasks, alarms, and notifications. |
| `common.js` | Shared occasion, date, and storage utilities. |
| `data.js` | Built-in occasion data and supporting constants. |
| `calendar-sync.js` | Google Calendar feed parsing and synchronization. |
| `blog-sync.js` | Born To Banger RSS feed synchronization. |
| `style.css` | Shared styles. |
| `icons/` | Extension icons. |

## 🔐 Permissions and data

The extension declares these Chrome permissions in `manifest.json`:

- `storage` — stores preferences, personal occasions, and cached information.
- `alarms` — schedules background refresh tasks.
- `notifications` — allows the extension to display browser notifications.
- `unlimitedStorage` — requests expanded storage capacity for extension data.

It also requests host access for Google Calendar and Born To Banger to retrieve calendar feeds and the website’s blog RSS feed.

Personal occasions and preferences are saved in Chrome extension storage on your browser. Calendar and blog content is fetched from the relevant services and cached for display. This README is not a substitute for a full privacy policy; inspect the source code and permissions before installing if you need to assess the extension for your own use.

## 🛠️ Built with

- HTML
- CSS
- JavaScript
- Chrome Extensions Manifest V3
- Chrome Extension APIs
- Google Calendar ICS feeds
- Born To Banger RSS feed

No package manager, framework, or compilation step is required for the manual installation described above.

## 🎈 Made for Born To Banger

Occasion Radar was created by **[Suraj Dev](https://www.surajdev.com)** for **[Born To Banger](https://www.borntobanger.in)**.

Born To Banger helps people celebrate with activities, workshops, entertainment, and event experiences.

- 🌐 Website: [borntobanger.in](https://www.borntobanger.in)
- 🎨 Explore activities: [borntobanger.in/activities](https://www.borntobanger.in/activities)
- 👨‍💻 Creator: [Suraj Dev](https://www.surajdev.com)

## 🤝 Feedback and contributions

Found a bug or have an idea to improve Occasion Radar?

1. Check the existing repository issues.
2. Open an issue with clear steps to reproduce the problem or describe your suggestion.
3. If you want to contribute code, submit a pull request with a concise explanation of the change.

## 📄 License

No `LICENSE` file is currently included in this repository. Until a license is added, the source code is not explicitly licensed for reuse, modification, or redistribution.

---

<div align="center">

**Made with ❤️ by [Suraj Dev](https://www.surajdev.com)**  
**Created for [Born To Banger](https://www.borntobanger.in)**

</div>
