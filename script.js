// Toggle the navigation's scrolled state.
// As soon as the page is scrolled, the active "About" tab transitions
// from the "selected" (folder) state to the "selected+scrolled" (pill) state.

(function () {
  const nav = document.getElementById("nav");
  if (!nav) return;

  const THRESHOLD = 0; // any scroll at all

  function onScroll() {
    const scrolled = window.scrollY > THRESHOLD;
    nav.classList.toggle("is-scrolled", scrolled);
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

// Hero carousel — auto-rotate slides with synced indicator + play/pause.
(function () {
  const root = document.querySelector("[data-hero-root]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll("[data-hero-slide]"));
  const tabs   = Array.from(root.querySelectorAll("[data-hero-tab]"));
  const toggle = root.querySelector("[data-hero-toggle]");
  const iconPause = toggle && toggle.querySelector('[data-hero-icon="pause"]');
  const iconPlay  = toggle && toggle.querySelector('[data-hero-icon="play"]');

  if (slides.length === 0) return;

  const INTERVAL = 5000;
  // Keep CSS bar-fill animation in sync with the JS slide timer
  root.style.setProperty("--hero-interval", INTERVAL + "ms");

  let current = 0;
  let timer = null;
  let playing = true;

  function activate(i) {
    current = ((i % slides.length) + slides.length) % slides.length;
    slides.forEach((el, idx) => el.classList.toggle("is-active", idx === current));
    tabs.forEach((el, idx) => {
      const isActive = idx === current;
      if (isActive) {
        // Re-trigger the progress-bar fill animation from 0 on every activation
        // (including clicks on the already-active tab) by toggling .is-active
        // around a forced reflow.
        el.classList.remove("is-active");
        void el.offsetWidth;
        el.classList.add("is-active");
      } else {
        el.classList.remove("is-active");
      }
    });
  }

  function next() { activate(current + 1); }

  function start() {
    if (timer) { clearInterval(timer); timer = null; }
    timer = setInterval(next, INTERVAL);
    playing = true;
    root.classList.remove("is-paused");
    if (iconPause) iconPause.classList.remove("hidden");
    if (iconPlay)  iconPlay.classList.add("hidden");
    if (toggle) toggle.setAttribute("aria-label", "Pause carousel");
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    playing = false;
    root.classList.add("is-paused");
    if (iconPause) iconPause.classList.add("hidden");
    if (iconPlay)  iconPlay.classList.remove("hidden");
    if (toggle) toggle.setAttribute("aria-label", "Play carousel");
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-hero-tab"));
      activate(idx);
      if (playing) start(); // restart the cycle from this slide
    });
  });

  if (toggle) {
    toggle.addEventListener("click", () => {
      if (playing) stop();
      else start();
    });
  }

  // Respect users who prefer reduced motion: show first slide, no auto-rotate.
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  activate(0);
  if (!reduce) start();
  else if (toggle) {
    // Show the play icon since we're not rotating.
    if (iconPause) iconPause.classList.add("hidden");
    if (iconPlay)  iconPlay.classList.remove("hidden");
    playing = false;
  }
})();

// Invoker Commands API fallback — for browsers that don't yet support
// `command` + `commandfor` (Safari, older Firefox, older Chrome). Emulates
// the built-in behavior by calling dialog.showModal() / .close() manually.
// Native support: HTMLButtonElement supports the "command" IDL attribute.
(function () {
  const supported =
    typeof HTMLButtonElement !== "undefined" &&
    "command" in HTMLButtonElement.prototype;
  if (supported) return;

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[command][commandfor]");
    if (!btn) return;
    const target = document.getElementById(btn.getAttribute("commandfor"));
    if (!target) return;
    const cmd = btn.getAttribute("command");
    e.preventDefault();
    if (cmd === "show-modal" && typeof target.showModal === "function") {
      target.showModal();
    } else if (cmd === "close" && typeof target.close === "function") {
      target.close();
    }
  });
})();

// Approach accordion — toggles aria-expanded (rotates the "+" via CSS).
(function () {
  document.querySelectorAll(".approach-accordion__head").forEach((btn) => {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
    });
  });
})();

// Partners — "Why partner with us?" auto-rotating cards. Each card stays
// open for DURATION_MS while a 4px left-edge bar fills vertically (CSS
// animation in sync via --partner-card-duration). When the timer expires
// the next card opens; clicking a card jumps the cycle to it.
(function () {
  const list = document.querySelector("[data-partner-cards]");
  if (!list) return;
  const cards = Array.from(list.querySelectorAll("[data-partner-card]"));
  if (cards.length === 0) return;

  const DURATION_MS = 7000;
  list.style.setProperty("--partner-card-duration", DURATION_MS + "ms");

  let current = 0;
  let timer = null;

  function openCard(i) {
    if (timer) { clearTimeout(timer); timer = null; }
    current = ((i % cards.length) + cards.length) % cards.length;

    cards.forEach((c, idx) => {
      const active = idx === current;
      // Reset the counting class first so the bar's CSS animation restarts
      // cleanly even if the same card is re-activated.
      c.classList.remove("is-counting");
      c.setAttribute("aria-expanded", active ? "true" : "false");
    });
    // Force reflow so the animation re-triggers on the now-active card.
    void cards[current].offsetWidth;
    cards[current].classList.add("is-counting");

    timer = setTimeout(() => openCard(current + 1), DURATION_MS);
  }

  cards.forEach((card, idx) => {
    const toggle = card.querySelector("[data-partner-card-toggle]");
    if (!toggle) return;
    toggle.addEventListener("click", () => openCard(idx));
  });

  // Respect reduced-motion: keep the first card open, no auto-rotate, no bar.
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    cards.forEach((c, idx) =>
      c.setAttribute("aria-expanded", idx === 0 ? "true" : "false")
    );
  } else {
    openCard(0);
  }
})();

// Pagination organism — dots morph default <-> active, prev/next arrows drive
// the active index. The prev (first icon) button is disabled at index 0 and
// enables once the user advances; next is disabled at the last index.
// Each instance is a [data-pagination] root containing a .pagination (dots)
// and two .pagination-controls__btn (first = prev, last = next). The width
// morph uses Motion (window.Motion, loaded as an ES module) with a CSS-less
// spring; reduced-motion or a missing Motion falls back to an instant set.
(function () {
  const DOT = 8;      // spacing/2 — default dot width
  const ACTIVE = 40;  // spacing/10 — active pill width
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setWidth = (el, w, animate) => {
    const target = w + "px";
    const from = el.getBoundingClientRect().width + "px";
    // Commit the end state synchronously so layout is correct even when
    // rAF is paused (e.g. background tab) and Motion never ticks.
    el.style.width = target;
    if (animate && !reduce && !document.hidden && window.Motion && window.Motion.animate) {
      // Motion then tweens the visual morph from the old width to the new one.
      // Skipped when hidden: a WAAPI tween can't tick with rAF paused and would
      // pin the width mid-morph, so the synchronous set above stands alone.
      window.Motion.animate(
        el,
        { width: [from, target] },
        { duration: 0.35, ease: "easeInOut" }
      );
    }
  };

  document.querySelectorAll("[data-pagination]").forEach((root) => {
    const dotsBox = root.querySelector(".pagination");
    const dots = Array.from(root.querySelectorAll(".pagination-dot"));
    if (dots.length === 0) return;

    const btns = Array.from(root.querySelectorAll(".pagination-controls__btn"));
    const prev =
      root.querySelector("[data-pagination-prev]") || btns[0] || null;
    const next =
      root.querySelector("[data-pagination-next]") ||
      (btns.length > 1 ? btns[btns.length - 1] : null);

    if (dotsBox) dotsBox.classList.add("is-interactive");

    let idx = dots.findIndex((d) => d.getAttribute("aria-current") === "true");
    if (idx < 0) idx = 0;

    // Paint the dots for the current idx (active pill + morph).
    function paintDots(animate) {
      dots.forEach((d, i) => {
        const on = i === idx;
        d.classList.toggle("pagination-dot--active", on);
        if (on) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
        setWidth(d, on ? ACTIVE : DOT, animate);
      });
    }

    // --- Scroll mode: the pagination drives a horizontal scroll container ---
    // (data-pagination-scroll="<selector>"). Dots map 1:1 to the container's
    // card children; prev/next and dot clicks scroll to a card, and the active
    // dot + disabled state follow the real scroll position.
    const scrollSel = root.getAttribute("data-pagination-scroll");
    const track = scrollSel ? document.querySelector(scrollSel) : null;
    const cards = track
      ? Array.from(track.querySelectorAll(":scope > ul > li, :scope > li"))
      : [];

    if (track && cards.length) {
      // Trailing spacer: give the strip enough extra scroll room for the LAST
      // card to left-align, so every card is its own distinct stop (one dot
      // each). Width = viewport minus the last card's width; recomputed on
      // resize. Added after `cards` is captured, so it is never a card itself.
      const lastCard = cards[cards.length - 1];
      const scroller = lastCard.parentElement;
      const spacer = document.createElement("li");
      spacer.setAttribute("aria-hidden", "true");
      spacer.setAttribute("data-pagination-spacer", "");
      spacer.style.flex = "none";
      spacer.style.pointerEvents = "none";
      scroller.appendChild(spacer);
      function updateSpacer() {
        const w = Math.max(
          0,
          track.clientWidth - lastCard.getBoundingClientRect().width
        );
        spacer.style.width = w + "px";
      }
      updateSpacer();

      const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
      // Scroll target = card position RELATIVE to the first card. offsetLeft is
      // measured from the nearest positioned ancestor, which may not be the
      // scroll content's origin, so subtract the first card's offset to get a
      // true scrollLeft. Clamped to maxScroll as a safety bound.
      const targetOf = (i) =>
        Math.min(cards[i].offsetLeft - cards[0].offsetLeft, maxScroll());

      function syncFromScroll(animate) {
        const sl = track.scrollLeft;
        // Active = card whose clamped target is nearest the current scroll.
        // Strict `<` keeps the smallest index on ties (the trailing cards
        // that collapse onto maxScroll), so prev always has somewhere to go.
        let n = 0;
        let best = Infinity;
        cards.forEach((c, i) => {
          const d = Math.abs(targetOf(i) - sl);
          if (d < best) { best = d; n = i; }
        });
        if (n !== idx) { idx = n; paintDots(animate); }
        // Every card is a distinct stop now, so gate the arrows on the index.
        if (prev) prev.disabled = idx === 0;
        if (next) next.disabled = idx === cards.length - 1;
      }

      function goTo(i) {
        const t = Math.max(0, Math.min(cards.length - 1, i));
        // Smooth when visible; instant for reduced-motion or a hidden tab
        // (smooth scroll is rAF-driven and won't run while hidden).
        const smooth = !reduce && !document.hidden;
        track.scrollTo({ left: targetOf(t), behavior: smooth ? "smooth" : "auto" });
      }

      dots.forEach((d, i) => d.addEventListener("click", () => goTo(i)));
      if (prev) prev.addEventListener("click", () => goTo(idx - 1));
      if (next) next.addEventListener("click", () => goTo(idx + 1));

      // Sync synchronously on scroll — the work is a tiny loop, and this keeps
      // the active dot / disabled state correct even when rAF is throttled
      // (e.g. a background tab).
      track.addEventListener("scroll", () => syncFromScroll(true), {
        passive: true,
      });
      window.addEventListener("resize", () => {
        updateSpacer();
        syncFromScroll(false);
      });

      paintDots(false);
      syncFromScroll(false); // initial: prev disabled at the start
      return;
    }

    // --- Self-index mode: the pagination is its own carousel of dots ---
    function render(animate) {
      paintDots(animate);
      if (prev) prev.disabled = idx === 0;
      if (next) next.disabled = idx === dots.length - 1;
    }

    dots.forEach((d, i) =>
      d.addEventListener("click", () => {
        if (i === idx) return;
        idx = i;
        render(true);
      })
    );
    if (prev)
      prev.addEventListener("click", () => {
        if (idx > 0) {
          idx -= 1;
          render(true);
        }
      });
    if (next)
      next.addEventListener("click", () => {
        if (idx < dots.length - 1) {
          idx += 1;
          render(true);
        }
      });

    render(false); // initial state: no animation; prev disabled at index 0
  });
})();

// FAQ accordion — toggle one item at a time.
(function () {
  document.querySelectorAll(".faq-item__head").forEach((btn) => {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
    });
  });
})();

// Projects archive — show the row's image in the preview slot on hover.
// Single mouseleave handler on the list so movement between rows doesn't flicker.
(function () {
  const list    = document.querySelector("[data-project-list]");
  const frame   = document.querySelector("[data-project-preview]");
  const imgEl   = document.querySelector("[data-project-preview-img]");
  if (!list || !frame || !imgEl) return;

  list.querySelectorAll(".project-row[data-hover-image]").forEach((row) => {
    row.addEventListener("mouseenter", () => {
      const src = row.getAttribute("data-hover-image");
      if (!src) return;
      if (imgEl.getAttribute("src") !== src) imgEl.setAttribute("src", src);
      frame.style.opacity = "1";
    });
  });

  list.addEventListener("mouseleave", () => {
    frame.style.opacity = "0";
  });
})();
