function tickClock() {
  const now = new Date();
  // Use the browser's own locale (12/24h clock, date order) rather than a
  // fixed one, so the page reads naturally anywhere in the world.
  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  for (const id of ["ntClock", "ntClockOff"]) { const el = document.getElementById(id); if (el) el.textContent = time; }
  for (const id of ["ntDate", "ntDateOff"]) { const el = document.getElementById(id); if (el) el.textContent = date; }
}
tickClock();
setInterval(tickClock, 15000);

function daysLabel(n) {
  if (n === 0) return "Today";
  if (n === 1) return "1d";
  return `${n}d`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Occasions that aren't "remembrance"-typed but are still dark, negative, or
// sad in tone (e.g. Anti-Valentine's week days, tragedy/attack anniversaries
// that got mis-tagged, breakup-adjacent days). We match on name because
// `type` alone isn't a reliable mood signal — plenty of `festival`/`national`
// entries are actually somber. Keep this list to genuinely negative/somber
// occasions, not just "not a party" ones.
const SOMBER_NAME_PATTERNS = [
  /\bslap day\b/i,
  /\bkick day\b/i,
  /\bmissing day\b/i,
  /\bbreakup day\b/i,
  /\battack(s)? anniversary\b/i,
  /\btragedy\b/i,
  /\bmartyr/i,
  /\bcommemoration\b/i,
  /\bcondolence\b/i,
  /\bmourning\b/i,
  /\bdisaster\b/i,
  /\bmemorial\b/i
];

function isSomberOccasion(item) {
  if (item.type === "remembrance") return true;
  return SOMBER_NAME_PATTERNS.some(re => re.test(item.name || ""));
}

function activitiesDetails(name, type) {
  const picks = suggestActivities(type, ACTIVITIES, 3);
  const chips = picks.map(a => `
    <a class="nt-chip" href="${a.url}" target="_blank" rel="noopener">
      <span class="nt-chip-name">${escapeHtml(a.name)}</span>
    </a>
  `).join("");
  return `
    <details class="nt-idea">
      <summary>Activity ideas for ${escapeHtml(name)}</summary>
      <div class="nt-suggestions">${chips}</div>
    </details>
  `;
}

async function renderOccasions() {
  const [occasions, prefs] = await Promise.all([getVisibleOccasions(), getRegionPrefs()]);
  const showBtb = showBtbActivities(prefs); // Born To Banger is a Delhi-NCR vendor
  const upcoming = getUpcoming(occasions, new Date(), 30).slice(0, 3);
  const wrap = document.getElementById("ntOccasions");
  const block = document.getElementById("ntOccasionsBlock");

  if (!upcoming.length) {
    block.style.display = "none";
    return;
  }
  block.style.display = "";
  wrap.innerHTML = upcoming.map(item => `
    <div class="nt-card">
      <div class="nt-badge">${daysLabel(item.daysLeft)}<small>away</small></div>
      <div class="nt-card-body">
        <div class="nt-card-name">${escapeHtml(item.name)}${item.type === "birthday" || item.type === "anniversary" ? "'s " + item.type : ""}${item.recurrence === "lunar" ? ` <span class="lunar-badge">lunar</span>` : item.recurrence === "auto-synced" ? ` <span class="lunar-badge">synced</span>` : ""}${item.occurrence === "once" ? ` <span class="once-badge">once</span>` : ""}</div>
        <div class="nt-card-meta">${item.date.toLocaleDateString(undefined, { day: "numeric", month: "long" })}${item.note ? " · " + escapeHtml(item.note) : ""}</div>
        ${(isSomberOccasion(item) || !showBtb) ? "" : activitiesDetails(item.name, item.type)}
      </div>
    </div>
  `).join("");
}

// ---- Blog slider (auto-fetched RSS posts, falls back to static BLOG_TIPS) ----

const BLOG_SLIDE_INTERVAL_MS = 6000;
let blogSlideTimer = null;
let blogSlideIndex = 0;
let blogSlidePosts = [];

function truncate(str, max) {
  if (!str || str.length <= max) return str || "";
  return str.slice(0, max - 1).trimEnd() + "…";
}

// Normalize either a live RSS post ({title, link, description, image}) or a
// static BLOG_TIPS fallback entry ({title, url}) into the same shape.
function normalizeBlogPost(p) {
  return {
    title: p.title,
    url: p.url || p.link,
    description: p.description || "",
    image: p.image || ""
  };
}

function blogSlideHTML(post, i) {
  const safeImageUrl = post.image ? escapeHtml(post.image).replace(/"/g, "%22") : "";
  const bg = safeImageUrl ? `style="background-image:url(&quot;${safeImageUrl}&quot;)"` : "";
  return `
    <a class="nt-blog-slide${post.image ? " nt-blog-slide-has-img" : ""}" href="${escapeHtml(post.url)}" target="_blank" rel="noopener" data-index="${i}" ${bg}>
      <div class="nt-blog-slide-overlay">
        <div class="nt-blog-slide-title">${escapeHtml(post.title)}</div>
        ${post.description ? `<div class="nt-blog-slide-desc">${escapeHtml(truncate(post.description, 110))}</div>` : ""}
      </div>
    </a>
  `;
}

function showBlogSlide(index) {
  if (!blogSlidePosts.length) return;
  blogSlideIndex = ((index % blogSlidePosts.length) + blogSlidePosts.length) % blogSlidePosts.length;
  const track = document.getElementById("ntBlogTrack");
  track.style.transform = `translateX(-${blogSlideIndex * 100}%)`;
  document.querySelectorAll("#ntBlogDots .nt-blog-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === blogSlideIndex);
  });
}

function startBlogAutoSlide() {
  stopBlogAutoSlide();
  if (blogSlidePosts.length <= 1) return;
  blogSlideTimer = setInterval(() => showBlogSlide(blogSlideIndex + 1), BLOG_SLIDE_INTERVAL_MS);
}

function stopBlogAutoSlide() {
  if (blogSlideTimer) { clearInterval(blogSlideTimer); blogSlideTimer = null; }
}

async function renderBlogSlider() {
  const wrap = document.getElementById("ntBlogSlider");
  if (!wrap) return;

  // Prefer live-synced posts; fall back to the static list if nothing has
  // synced yet (fresh install, or the background fetch hasn't run/succeeded).
  let posts = [];
  if (typeof getCachedBlogPosts === "function") {
    posts = await getCachedBlogPosts();
  }
  if (!posts.length) posts = BLOG_TIPS;
  blogSlidePosts = posts.map(normalizeBlogPost).filter(p => p.title && p.url);

  if (!blogSlidePosts.length) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;

  const track = document.getElementById("ntBlogTrack");
  track.innerHTML = blogSlidePosts.map((p, i) => blogSlideHTML(p, i)).join("");

  const dotsWrap = document.getElementById("ntBlogDots");
  dotsWrap.innerHTML = blogSlidePosts.length > 1
    ? blogSlidePosts.map((_, i) => `<button type="button" class="nt-blog-dot" data-index="${i}" aria-label="Go to post ${i + 1}"></button>`).join("")
    : "";
  dotsWrap.querySelectorAll(".nt-blog-dot").forEach(dot => {
    dot.addEventListener("click", () => { showBlogSlide(Number(dot.dataset.index)); startBlogAutoSlide(); });
  });

  const prevBtn = document.getElementById("ntBlogPrev");
  const nextBtn = document.getElementById("ntBlogNext");
  const hasMultiple = blogSlidePosts.length > 1;
  prevBtn.hidden = !hasMultiple;
  nextBtn.hidden = !hasMultiple;
  prevBtn.onclick = () => { showBlogSlide(blogSlideIndex - 1); startBlogAutoSlide(); };
  nextBtn.onclick = () => { showBlogSlide(blogSlideIndex + 1); startBlogAutoSlide(); };

  showBlogSlide(0);
  startBlogAutoSlide();

  wrap.addEventListener("mouseenter", stopBlogAutoSlide);
  wrap.addEventListener("mouseleave", startBlogAutoSlide);
}

async function renderRegionLabel() {
  const btn = document.getElementById("ntRegion");
  if (!btn) return;
  btn.textContent = `Region: ${regionSummary(await getRegionPrefs())} · change`;
  btn.onclick = () => { location.href = chrome.runtime.getURL("options.html#region"); };
}

async function init() {
  const useNewTab = await getUseNewTab();
  document.getElementById("ntFull").hidden = !useNewTab;
  document.getElementById("ntOff").hidden = useNewTab;

  if (useNewTab) {
    renderOccasions();
    renderRegionLabel();
    renderBlogSlider();
    document.getElementById("ntTurnOff").addEventListener("click", async () => {
      await setUseNewTab(false);
      location.reload();
    });
  } else {
    document.getElementById("ntTurnOn").addEventListener("click", async () => {
      await setUseNewTab(true);
      location.reload();
    });
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "occasions-updated") renderOccasions();
  if (msg?.type === "blog-updated") renderBlogSlider();
});

init();
