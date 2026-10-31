/* Interactions communes à toutes les pages. */
(function () {
  "use strict";
  var PDS = window.PDS;
  var D = PDS.dates;
  var B = window.PDS_CONFIG.booking;
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var ICON = {
    minus: '<svg viewBox="0 0 12 12" stroke="currentColor" aria-hidden="true"><path d="M1 6h10"/></svg>',
    plus: '<svg viewBox="0 0 12 12" stroke="currentColor" aria-hidden="true"><path d="M1 6h10M6 1v10"/></svg>',
    prev: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" aria-hidden="true"><path d="M11 3 5 9l6 6"/></svg>',
    next: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" aria-hidden="true"><path d="m7 3 6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 16 16" stroke="currentColor" aria-hidden="true"><path d="m2 2 12 12M14 2 2 14"/></svg>'
  };
  PDS.icons = ICON;
  PDS.mobile = function () { return window.matchMedia("(max-width: 720px)").matches; };

  /* Rideau d'entrée et transitions entre pages ---------------------------- */
  function ready() {
    root.classList.add("is-ready");
    try { sessionStorage.setItem("pds:visited", "1"); } catch (e) { /* ignoré */ }
  }
  var firstVisit = !root.classList.contains("is-returning");
  setTimeout(ready, reduced ? 0 : firstVisit ? 900 : 60);
  window.addEventListener("pageshow", function (e) { if (e.persisted) { root.classList.remove("is-leaving"); ready(); } });

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-lightbox")) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (reduced) return;
    e.preventDefault();
    root.classList.add("is-leaving");
    setTimeout(function () { location.href = url.href; }, 420);
  });

  /* En-tête -------------------------------------------------------------- */
  var header = $(".site-header");
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    var hide = y > 480 && y > lastY + 4;
    var show = y < lastY - 4 || y < 480;
    if (hide) header.classList.add("is-hidden");
    else if (show) header.classList.remove("is-hidden");
    root.classList.toggle("header-hidden", header.classList.contains("is-hidden"));
    lastY = y;
    parallax();
    mobileCta(y);
  }
  // Les événements de défilement sont déjà cadencés sur l'affichage : traitement direct, sans file d'attente.
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Menu mobile ------------------------------------------------------------ */
  var menu = $("#menu");
  var toggle = $(".menu-toggle");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    header.classList.toggle("is-menu-open", open);
    document.body.classList.toggle("is-locked", open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add("is-open"); });
      setTimeout(function () { var first = $("a", menu); if (first) first.focus(); }, 300);
    } else {
      menu.classList.remove("is-open");
      setTimeout(function () { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 600);
      toggle.focus();
    }
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false); });
  }

  /* Apparitions au défilement ---------------------------------------------- */
  var revealItems = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* Parallaxe discrète ------------------------------------------------------ */
  var layers = reduced ? [] : $$("[data-parallax]");
  function parallax() {
    var vh = window.innerHeight;
    layers.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var speed = parseFloat(el.dataset.parallax) || 0.1;
      var offset = (r.top + r.height / 2 - vh / 2) * -speed;
      el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
    });
  }

  /* Barre de réservation mobile ------------------------------------------- */
  var cta = $(".mobile-cta");
  var footer = $(".site-footer");
  function mobileCta(y) {
    if (!cta) return;
    var nearFooter = footer && footer.getBoundingClientRect().top < window.innerHeight;
    cta.classList.toggle("is-visible", y > window.innerHeight * 0.7 && !nearFooter);
  }

  /* Diaporama d'accueil ---------------------------------------------------- */
  function heroSlider(hero) {
    var slides = $$(".hero__slide", hero);
    var dots = $$(".hero__dots button", hero);
    var current = $("[data-hero-current]", hero);
    var duration = 7000;
    var index = 0;
    var timer = null;
    hero.style.setProperty("--slide-ms", duration + "ms");
    function go(i) {
      slides[index].classList.remove("is-active");
      dots[index] && dots[index].classList.remove("is-active");
      index = (i + slides.length) % slides.length;
      var img = $("img", slides[index]);
      if (img && img.loading === "lazy") img.loading = "eager";
      slides[index].classList.add("is-active");
      if (dots[index]) { void dots[index].offsetWidth; dots[index].classList.add("is-active"); }
      if (current) current.textContent = String(index + 1).padStart(2, "0");
      clearTimeout(timer);
      if (!reduced) timer = setTimeout(function () { go(index + 1); }, duration);
    }
    dots.forEach(function (dot, i) { dot.addEventListener("click", function () { go(i); }); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearTimeout(timer);
      else go(index);
    });
    go(0);
  }
  var hero = $(".hero");
  if (hero) heroSlider(hero);

  /* Visionneuse plein écran ------------------------------------------------ */
  var lb = null;
  function buildLightbox() {
    var el = document.createElement("div");
    el.className = "lightbox";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Galerie photographique");
    el.innerHTML =
      '<div class="lightbox__bar"><span class="lightbox__count" aria-live="polite"></span>' +
      '<button type="button" class="lightbox__close">Fermer ' + ICON.close + "</button></div>" +
      '<div class="lightbox__stage"><img class="lightbox__img" alt="">' +
      '<button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Photo précédente">' + ICON.prev + "</button>" +
      '<button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Photo suivante">' + ICON.next + "</button></div>" +
      '<div class="lightbox__foot"><p class="lightbox__caption"></p><div class="lightbox__thumbs"></div></div>';
    document.body.appendChild(el);
    lb = {
      el: el, items: [], index: 0, opener: null,
      img: $(".lightbox__img", el), count: $(".lightbox__count", el),
      caption: $(".lightbox__caption", el), thumbs: $(".lightbox__thumbs", el)
    };
    $(".lightbox__close", el).addEventListener("click", closeLightbox);
    $(".lightbox__nav--prev", el).addEventListener("click", function () { show(lb.index - 1); });
    $(".lightbox__nav--next", el).addEventListener("click", function () { show(lb.index + 1); });
    lb.thumbs.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (b) show(+b.dataset.i);
    });
    $(".lightbox__stage", el).addEventListener("click", function (e) { if (e.target.classList.contains("lightbox__stage")) closeLightbox(); });
    var x0 = null;
    el.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    el.addEventListener("pointerup", function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) show(lb.index + (dx < 0 ? 1 : -1));
    });
    document.addEventListener("keydown", function (e) {
      if (!el.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") show(lb.index + 1);
      else if (e.key === "ArrowLeft") show(lb.index - 1);
      else if (e.key === "Tab") {
        var f = $$("button", el).filter(function (b) { return b.offsetParent !== null; });
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }
  function show(i) {
    var n = lb.items.length;
    lb.index = (i + n) % n;
    var item = lb.items[lb.index];
    lb.img.classList.remove("is-loaded");
    var src = item.src;
    var probe = new Image();
    probe.onload = function () {
      if (lb.items[lb.index] !== item) return;
      lb.img.src = src;
      lb.img.alt = item.caption || "";
      requestAnimationFrame(function () { lb.img.classList.add("is-loaded"); });
    };
    probe.src = src;
    lb.count.textContent = String(lb.index + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0");
    lb.caption.textContent = item.caption || "";
    $$("button", lb.thumbs).forEach(function (b, j) {
      b.classList.toggle("is-active", j === lb.index);
      if (j === lb.index) b.scrollIntoView({ block: "nearest", inline: "center" });
    });
    [1, -1].forEach(function (k) { new Image().src = lb.items[(lb.index + k + n) % n].src; });
  }
  function openLightbox(items, index, opener) {
    if (!lb) buildLightbox();
    lb.items = items;
    lb.opener = opener || document.activeElement;
    lb.thumbs.innerHTML = items.map(function (it, i) {
      return '<button type="button" data-i="' + i + '" aria-label="Photo ' + (i + 1) + '"><img src="' + it.thumb + '" alt="" loading="lazy"></button>';
    }).join("");
    lb.el.classList.add("is-open");
    document.body.classList.add("is-locked");
    show(index || 0);
    setTimeout(function () { $(".lightbox__close", lb.el).focus(); }, 50);
  }
  function closeLightbox() {
    lb.el.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    if (lb.opener && lb.opener.focus) lb.opener.focus();
  }
  function groupItems(name) {
    return $$('[data-lightbox="' + name + '"]').filter(function (a) { return !a.closest(".is-hidden"); }).map(function (a) {
      var img = $("img", a);
      return { el: a, src: a.getAttribute("href"), caption: a.dataset.caption || (img && img.alt) || "", thumb: a.dataset.thumb || (img ? img.currentSrc || img.src : a.getAttribute("href")) };
    });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-lightbox]");
    var opener = e.target.closest("[data-lightbox-open]");
    if (a) {
      e.preventDefault();
      var items = groupItems(a.dataset.lightbox);
      openLightbox(items, items.findIndex(function (it) { return it.el === a; }), a);
    } else if (opener) {
      e.preventDefault();
      openLightbox(groupItems(opener.dataset.lightboxOpen), 0, opener);
    }
  });
  PDS.openLightbox = openLightbox;

  /* Filtres de galerie ----------------------------------------------------- */
  $$("[data-filters]").forEach(function (bar) {
    var target = $(bar.dataset.filters);
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      $$("button", bar).forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      var f = btn.dataset.filter;
      $$(".gallery__item", target).forEach(function (item) {
        var match = f === "all" || (item.dataset.cat || "").split(" ").indexOf(f) > -1;
        item.classList.toggle("is-hidden", !match);
        if (match) item.classList.add("is-in");
      });
    });
  });

  /* Rail horizontal (glisser, flèches, progression) ---------------------- */
  $$("[data-rail]").forEach(function (rail) {
    var wrap = rail.closest("[data-rail-wrap]") || document;
    var prev = $("[data-rail-prev]", wrap);
    var next = $("[data-rail-next]", wrap);
    var bar = $("[data-rail-progress] span", wrap);
    function update() {
      var max = rail.scrollWidth - rail.clientWidth;
      var ratio = rail.clientWidth / rail.scrollWidth;
      if (bar) {
        bar.style.width = ratio * 100 + "%";
        bar.style.transform = "translateX(" + (max > 0 ? (rail.scrollLeft / max) * (1 / ratio - 1) * 100 : 0) + "%)";
      }
      if (prev) prev.disabled = rail.scrollLeft < 8;
      if (next) next.disabled = rail.scrollLeft > max - 8;
    }
    function step(dir) {
      var item = $(".rail__item", rail);
      rail.scrollBy({ left: dir * (item ? item.offsetWidth + 24 : 300), behavior: reduced ? "auto" : "smooth" });
    }
    if (prev) prev.addEventListener("click", function () { step(-1); });
    if (next) next.addEventListener("click", function () { step(1); });
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    var down = null;
    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = { x: e.clientX, left: rail.scrollLeft, moved: false };
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - down.x;
      if (Math.abs(dx) > 5) { down.moved = true; rail.classList.add("is-dragging"); }
      rail.scrollLeft = down.left - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = null;
      setTimeout(function () { rail.classList.remove("is-dragging"); }, 0);
    });
    update();
  });

  /* Aperçu d'image au survol (liste des excursions) --------------------- */
  var previewRows = $$("[data-preview]");
  if (previewRows.length && window.matchMedia("(hover: hover)").matches) {
    var pv = document.createElement("div");
    pv.className = "hover-preview";
    pv.innerHTML = "<img alt=\"\">";
    document.body.appendChild(pv);
    var pimg = $("img", pv);
    var pos = { x: 0, y: 0, tx: 0, ty: 0 };
    var raf = null;
    function loop() {
      pos.x += (pos.tx - pos.x) * 0.16;
      pos.y += (pos.ty - pos.y) * 0.16;
      pv.style.left = pos.x + "px";
      pv.style.top = pos.y + "px";
      raf = pv.classList.contains("is-visible") ? requestAnimationFrame(loop) : null;
    }
    previewRows.forEach(function (row) {
      row.addEventListener("mouseenter", function (e) {
        pimg.src = row.dataset.preview;
        pos.x = pos.tx = e.clientX + 32;
        pos.y = pos.ty = e.clientY - 160;
        pv.classList.add("is-visible");
        if (!raf) loop();
      });
      row.addEventListener("mousemove", function (e) { pos.tx = e.clientX + 32; pos.ty = e.clientY - 160; });
      row.addEventListener("mouseleave", function () { pv.classList.remove("is-visible"); });
    });
  }

  /* Sous-navigation des chambres -------------------------------------------- */
  var subnav = $("[data-subnav]");
  if (subnav && "IntersectionObserver" in window) {
    var links = $$("a", subnav);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) {
          var on = l.getAttribute("href") === "#" + entry.target.id;
          l.classList.toggle("is-active", on);
          if (on) l.scrollIntoView({ block: "nearest", inline: "center" });
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (l) { var t = $(l.getAttribute("href")); if (t) spy.observe(t); });
  }

  /* Voyageurs : compteurs partagés ------------------------------------------- */
  PDS.guests = function (container, state, onChange) {
    var limits = {
      adults: function () { return [1, B.maxGuests - state.children]; },
      children: function () { return [0, B.maxGuests - state.adults]; },
      babies: function () { return [0, B.maxBabies]; }
    };
    function sync() {
      $$("[data-stepper]", container).forEach(function (s) {
        var key = s.dataset.stepper;
        var lim = limits[key]();
        $("output", s).textContent = state[key];
        $('[data-step="-1"]', s).disabled = state[key] <= lim[0];
        $('[data-step="1"]', s).disabled = state[key] >= lim[1];
      });
    }
    $$("[data-stepper]", container).forEach(function (s) {
      $$("button", s).forEach(function (b) { b.innerHTML = b.dataset.step === "1" ? ICON.plus : ICON.minus; });
      s.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-step]");
        if (!b) return;
        var key = s.dataset.stepper;
        var lim = limits[key]();
        state[key] = Math.max(lim[0], Math.min(lim[1], state[key] + +b.dataset.step));
        sync();
        onChange(state);
      });
    });
    sync();
    return { sync: sync };
  };

  /* Fenêtre de sélection des dates (barre d'accueil, formulaire de contact) ---- */
  PDS.datePopover = function (pop, opts) {
    var cal = null;
    var draft = { start: opts.start || null, end: opts.end || null };
    var summary = $("[data-summary]", pop);
    function describe() {
      if (!summary) return;
      summary.textContent = draft.start && draft.end
        ? D.short(draft.start) + " → " + D.short(draft.end) + " · " + PDS.plural(D.diff(draft.start, draft.end), "nuit", "nuits")
        : draft.start ? "Arrivée le " + D.short(draft.start) : "";
    }
    function ensure() {
      if (cal) return;
      cal = new PDS.RangeCalendar($("[data-cal]", pop), {
        months: opts.months || "auto",
        legend: false,
        start: draft.start,
        end: draft.end,
        onChange: function (r) {
          draft = r;
          describe();
          if (r.start && r.end) opts.onApply(r, false);
        }
      });
      PDS.availability.load().then(function (res) { cal.setBlocked(res.blocked); });
    }
    var clear = $("[data-clear]", pop);
    if (clear) clear.addEventListener("click", function () { cal.clear(); opts.onApply({ start: null, end: null }, false); });
    var apply = $("[data-apply]", pop);
    if (apply) apply.addEventListener("click", function () { opts.onApply(draft, true); });
    describe();
    return {
      open: function () { ensure(); pop.classList.add("is-open"); },
      close: function () { pop.classList.remove("is-open"); },
      isOpen: function () { return pop.classList.contains("is-open"); },
      set: function (r) { draft = r; if (cal) cal.setRange(r.start, r.end); describe(); }
    };
  };

  /* Popovers : fermeture au clic extérieur / Échap ---------------------------- */
  var popovers = [];
  PDS.registerPopover = function (triggers, api, container) {
    popovers.push({ triggers: triggers, api: api, container: container });
    triggers.forEach(function (t) {
      t.addEventListener("click", function () {
        var wasOpen = api.isOpen();
        popovers.forEach(function (p) { p.api.close(); p.triggers.forEach(function (x) { x.setAttribute("aria-expanded", "false"); }); });
        if (!wasOpen) { api.open(); triggers.forEach(function (x) { x.setAttribute("aria-expanded", "true"); }); }
      });
    });
  };
  function closeAll() {
    popovers.forEach(function (p) { p.api.close(); p.triggers.forEach(function (x) { x.setAttribute("aria-expanded", "false"); }); });
  }
  PDS.closePopovers = closeAll;
  document.addEventListener("click", function (e) {
    popovers.forEach(function (p) {
      if (p.api.isOpen() && !p.container.contains(e.target)) {
        p.api.close();
        p.triggers.forEach(function (x) { x.setAttribute("aria-expanded", "false"); });
      }
    });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });

  /* Barre de réservation de l'accueil ---------------------------------------- */
  var bar = $("[data-booking-bar]");
  if (bar) {
    var stay = PDS.stay.get();
    var out = {
      start: $('[data-out="start"]', bar),
      end: $('[data-out="end"]', bar),
      guests: $('[data-out="guests"]', bar)
    };
    var paintBar = function () {
      out.start.textContent = stay.start ? D.format(stay.start, { weekday: "short", day: "numeric", month: "short" }) : "Choisir";
      out.end.textContent = stay.end ? D.format(stay.end, { weekday: "short", day: "numeric", month: "short" }) : "Choisir";
      out.start.classList.toggle("is-empty", !stay.start);
      out.end.classList.toggle("is-empty", !stay.end);
      out.guests.textContent = PDS.plural(stay.adults + stay.children, "voyageur", "voyageurs") + (stay.babies ? " · " + PDS.plural(stay.babies, "bébé", "bébés") : "");
    };
    var dates = PDS.datePopover($('[data-pop="dates"]', bar), {
      start: stay.start, end: stay.end,
      onApply: function (r, close) {
        stay = PDS.stay.set({ start: r.start, end: r.end });
        paintBar();
        if (close) closeAll();
      }
    });
    PDS.registerPopover($$('[data-open="dates"]', bar), dates, bar);
    var guestsPop = $('[data-pop="guests"]', bar);
    var guestsApi = {
      open: function () { guestsPop.classList.add("is-open"); },
      close: function () { guestsPop.classList.remove("is-open"); },
      isOpen: function () { return guestsPop.classList.contains("is-open"); }
    };
    PDS.registerPopover($$('[data-open="guests"]', bar), guestsApi, bar);
    PDS.guests(guestsPop, stay, function (s) { stay = PDS.stay.set({ adults: s.adults, children: s.children, babies: s.babies }); paintBar(); });
    $$("[data-close]", bar).forEach(function (b) { b.addEventListener("click", closeAll); });
    bar.addEventListener("submit", function (e) {
      e.preventDefault();
      location.href = "reserver.html?" + PDS.stay.query(stay);
    });
    paintBar();
  }

  /* Divers ----------------------------------------------------------------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  onScroll();
})();
