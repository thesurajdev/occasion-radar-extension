// newtab-spark.js — a small, quiet, cursor-reactive particle layer behind
// the new tab content. Purely decorative: never blocks clicks, never reads
// or stores anything, and does nothing at all if the person has
// prefers-reduced-motion set or has turned it off in Options. Uses the
// extension's own brand colors (banger red / gold) so it reads as part of
// the product, not a generic effect.

(function () {
  "use strict";

  const canvas = document.getElementById("ntSpark");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return; // respect the OS-level preference outright — no canvas, no listeners

  // Respect the person's own toggle in Options (default on). getSparkEnabled
  // comes from common.js, loaded before this file in newtab.html.
  getSparkEnabled().then((enabled) => {
    if (enabled) start();
  });

  function start() {
    const ctx = canvas.getContext("2d");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // Matches the --banger / --gold / --banger-deep variables defined in
    // style.css for each theme, so the spark reads as "the same brand" in
    // both modes rather than washing out against a dark page.
    const COLORS = isDark
      ? ["#ff4569", "#ffc23d", "#ff7a93"]
      : ["#fd1f4a", "#f6a700", "#c8123a"];
    const MAX_PARTICLES = 90;
    const SPAWN_PER_MOVE = 2;
    const OPACITY = isDark ? 0.7 : 0.55; // dark mode needs a touch more weight to read against a darker page

    let width = 0, height = 0, dpr = 1;
    let particles = [];
    let pointer = { active: false };
    let idleAngle = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function spawnParticle(x, y) {
      if (particles.length >= MAX_PARTICLES) particles.shift(); // drop oldest instead of growing unbounded
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.6;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15, // slight upward drift, like a spark rising
        size: 1.5 + Math.random() * 2.5,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1, // 1 -> 0 over the particle's lifetime
        decay: 0.008 + Math.random() * 0.01
      });
    }

    // Mouse: spawn a couple of particles per move event, throttled implicitly
    // by how often mousemove actually fires.
    window.addEventListener("mousemove", (e) => {
      pointer.active = true;
      for (let i = 0; i < SPAWN_PER_MOVE; i++) spawnParticle(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener("mouseleave", () => { pointer.active = false; });

    // Touch support: a light trail on drag, so it isn't a desktop-only effect.
    window.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      if (!t) return;
      pointer.active = true;
      spawnParticle(t.clientX, t.clientY);
    }, { passive: true });

    function step() {
      if (document.hidden) { requestAnimationFrame(step); return; } // pause work on a backgrounded tab, but keep the RAF chain alive so it resumes instantly

      ctx.clearRect(0, 0, width, height);

      // Idle state (no recent pointer activity): a faint slow-drifting spark
      // near the center-ish so the page doesn't feel completely static before
      // the person moves their mouse, without being distracting.
      if (!pointer.active && particles.length < 6 && Math.random() < 0.04) {
        idleAngle += 0.02;
        const cx = width / 2 + Math.cos(idleAngle) * width * 0.2;
        const cy = height / 2 + Math.sin(idleAngle * 0.7) * height * 0.15;
        spawnParticle(cx, cy);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        ctx.globalAlpha = Math.max(p.life, 0) * OPACITY; // kept subtle — this sits behind real content
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
})();
