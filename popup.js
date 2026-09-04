const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Clean line-icons (no emoji) for each occasion type — inherits currentColor.
const TYPE_ICON_SVG = {
  birthday: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 9.5V16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 9.5h13a1 1 0 0 0 1-1V8a1.6 1.6 0 0 0-1.6-1.6H4.1A1.6 1.6 0 0 0 2.5 8v.5a1 1 0 0 0 1 1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 6.4V4.2M10 4.2c-.7 0-1.3-.55-1.3-1.3 0-.6.9-1.7 1.3-2.15.4.45 1.3 1.55 1.3 2.15 0 .75-.6 1.3-1.3 1.3Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 13.2c.5.5 1 .8 1.5.8s1-.3 1.5-.8 1-.8 1.5-.8 1 .3 1.5.8 1 .8 1.5.8 1-.3 1.5-.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  anniversary: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7.3" cy="12.5" r="3.1" stroke="currentColor" stroke-width="1.5"/><circle cx="12.7" cy="12.5" r="3.1" stroke="currentColor" stroke-width="1.5"/><path d="M6.3 8.2 8.2 3.6h3.6l1.9 4.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.2" cy="3.6" r=".9" fill="currentColor"/><circle cx="11.8" cy="3.6" r=".9" fill="currentColor"/></svg>`,
  custom: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2.2 12 7l5.2.5-3.9 3.5 1.2 5.1L10 13.4l-4.5 2.7 1.2-5.1-3.9-3.5L8 7l2-4.8Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  festival: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4.2" width="14" height="12.6" rx="1.8" stroke="currentColor" stroke-width="1.4"/><path d="M3 7.8h14" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="7.2" cy="11.6" r=".9" fill="currentColor"/><circle cx="10" cy="11.6" r=".9" fill="currentColor"/><circle cx="12.8" cy="11.6" r=".9" fill="currentColor"/></svg>`,
  national: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 17V3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M5 4.2h9.6c.7 0 1.05.85.55 1.35l-2.1 2.1 2.1 2.1c.5.5.15 1.35-.55 1.35H5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  remembrance: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3v8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M7.3 6.4a2.7 2.7 0 1 1 5.4 0c0 1.8-2.7 3.6-2.7 3.6s-2.7-1.8-2.7-3.6Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.5 16.5c1.4-1 3-1.5 4.5-1.5s3.1.5 4.5 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`
};
const TYPE_ICON_DEFAULT = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4.2" width="14" height="12.6" rx="1.8" stroke="currentColor" stroke-width="1.4"/><path d="M3 7.8h14" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

function typeIcon(type) {
  return TYPE_ICON_SVG[type] || TYPE_ICON_DEFAULT;
}

function fillSelects() {
  const monthSel = document.getElementById("occMonth");
  const today = new Date();
  MONTHS.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i + 1;
    opt.textContent = m;
    if (i === today.getMonth()) opt.selected = true;
    monthSel.appendChild(opt);
  });
  fillDays(Number(monthSel.value), today.getDate());
  monthSel.addEventListener("change", () => fillDays(Number(monthSel.value)));
}

function fillDays(month, preferredDay) {
  const daySel = document.getElementById("occDay");
  const prevValue = preferredDay || Number(daySel.value) || 1;
  daySel.innerHTML = "";
  const daysInMonth = month ? new Date(2026, month, 0).getDate() : 31;
  for (let d = 1; d <= daysInMonth; d++) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    if (d === Math.min(prevValue, daysInMonth)) opt.selected = true;
    daySel.appendChild(opt);
  }
}

function daysLabel(n) {
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n <= 6) return `In ${n}d`;
  return `${n}d`;
}

function urgencyClass(n) {
  if (n === 0) return "urgency-today";
  if (n <= 6) return "urgency-soon";
  return "";
}

function groupLabel(n) {
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n <= 6) return "This week";
  if (n <= 30) return "This month";
  return "Later";
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-in"));
  setTimeout(() => {
    toast.classList.remove("toast-in");
    setTimeout(() => toast.remove(), 200);
  }, 1800);
}

async function render() {
  const occasions = await getUserOccasions();
  const upcoming = getUpcoming(occasions, new Date(), 60).slice(0, 8);
  const list = document.getElementById("upcomingList");
  list.innerHTML = "";

  if (!upcoming.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="12" width="22" height="19" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M9 18h22" stroke="currentColor" stroke-width="1.6"/><path d="M15 8v6M25 8v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M15.5 23.5c.6.6 1.2.9 1.8.9s1.2-.3 1.8-.9 1.2-.9 1.8-.9 1.2.3 1.8.9 1.2.9 1.8.9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </div>
        <div class="empty-state-title">Nothing on the radar yet</div>
        <div class="empty-state-copy">Add a birthday or anniversary below and we'll remind you before it sneaks up on you.</div>
      </div>`;
    return;
  }

  let lastGroup = null;
  for (const item of upcoming) {
    const group = groupLabel(item.daysLeft);
    if (group !== lastGroup) {
      const heading = document.createElement("div");
      heading.className = "list-group-heading";
      heading.textContent = group;
      list.appendChild(heading);
      lastGroup = group;
    }

    const card = document.createElement("div");
    card.className = `occ-card ${urgencyClass(item.daysLeft)}`;
    card.dataset.id = item.id;
    const dateStr = item.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const icon = typeIcon(item.type);
    const typeLabel = item.type === "custom" && item.note ? item.note : (OCCASION_TYPES[item.type] || item.type);
    card.innerHTML = `
      <div class="occ-days">
        <span class="occ-days-num">${daysLabel(item.daysLeft)}</span>
      </div>
      <div class="occ-body">
        <div class="occ-name"><span class="occ-icon" aria-hidden="true">${icon}</span>${escapeHtml(item.name)}</div>
        <div class="occ-meta">${escapeHtml(typeLabel)} · ${dateStr}</div>
      </div>
    `;
    list.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const occTypeSelect = document.getElementById("occType");
const customLabelRow = document.getElementById("customLabelRow");
const customLabelInput = document.getElementById("occCustomLabel");

occTypeSelect.addEventListener("change", () => {
  const isCustom = occTypeSelect.value === "custom";
  customLabelRow.hidden = !isCustom;
  if (isCustom) customLabelInput.focus();
});

document.getElementById("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("occName");
  const name = nameInput.value.trim();
  const type = occTypeSelect.value;
  const month = document.getElementById("occMonth").value;
  const day = document.getElementById("occDay").value;
  const customLabel = customLabelInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  if (type === "custom" && !customLabel) {
    customLabelInput.focus();
    return;
  }
  const submitBtn = e.target.querySelector(".btn-primary");
  submitBtn.disabled = true;
  await addOccasion({ name, month, day, type, note: type === "custom" ? customLabel : "" });
  nameInput.value = "";
  customLabelInput.value = "";
  customLabelRow.hidden = true;
  occTypeSelect.value = "birthday";
  document.getElementById("addFormWrap").open = false;
  render();
  chrome.runtime.sendMessage({ type: "occasions-updated" });
  showToast(`${name} added to your radar`);
  submitBtn.disabled = false;
  nameInput.focus();
});

document.getElementById("openOptions").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  window.close();
});

fillSelects();
render();
