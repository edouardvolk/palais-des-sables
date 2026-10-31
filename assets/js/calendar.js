/* Calendrier de sélection d'un séjour (arrivée → départ).
   Une nuit est « bloquée » si quelqu'un dort au riad la nuit du jour indiqué ;
   le jour d'arrivée d'une réservation reste donc possible comme jour de départ. */
(function () {
  "use strict";
  var PDS = window.PDS;
  var D = PDS.dates;
  var B = window.PDS_CONFIG.booking;
  var CHEVRON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>';
  var DOW = ["L", "M", "M", "J", "V", "S", "D"];

  function RangeCalendar(root, opts) {
    this.root = root;
    this.opts = Object.assign({ months: "auto", legend: true, onChange: function () {} }, opts);
    this.blocked = this.opts.blocked || new Set();
    this.min = D.add(D.today(), B.leadDays);
    this.max = D.add(D.addMonths(D.today(), B.monthsAhead), -1);
    this.start = this.opts.start || null;
    this.end = this.opts.end || null;
    this.hover = null;
    this.view = D.addMonths(this.start || this.min, 0);
    this.focusDate = this.start || this.min;
    this.build();
  }

  RangeCalendar.prototype = {
    // "auto" : deux mois côte à côte dès que la place le permet
    monthCount: function () {
      if (this.opts.months === "auto") return this.root.clientWidth >= 600 ? 2 : 1;
      return typeof this.opts.months === "function" ? this.opts.months() : this.opts.months;
    },

    build: function () {
      var self = this;
      this.root.innerHTML =
        '<div class="cal" role="group" aria-label="Calendrier des disponibilités">' +
        '<button type="button" class="cal__nav cal__nav--prev" aria-label="Mois précédent">' + CHEVRON + "</button>" +
        '<button type="button" class="cal__nav cal__nav--next" aria-label="Mois suivant">' + CHEVRON.replace("M10 3 5 8l5 5", "m6 3 5 5-5 5") + "</button>" +
        '<div class="cal__months"></div>' +
        (this.opts.legend ? '<div class="cal__legend"><span><i></i>Disponible</span><span><i class="is-blocked"></i>Réservé</span><span><i class="is-selected"></i>Votre séjour</span></div>' : "") +
        '<p class="cal__hint" aria-live="polite"></p></div>';
      this.el = {
        months: this.root.querySelector(".cal__months"),
        prev: this.root.querySelector(".cal__nav--prev"),
        next: this.root.querySelector(".cal__nav--next"),
        hint: this.root.querySelector(".cal__hint")
      };
      this.el.prev.addEventListener("click", function () { self.shift(-1); });
      this.el.next.addEventListener("click", function () { self.shift(1); });
      this.el.months.addEventListener("click", function (e) {
        var btn = e.target.closest(".cal__day[data-date]");
        if (btn) self.pick(btn.dataset.date);
      });
      this.el.months.addEventListener("mouseover", function (e) {
        var btn = e.target.closest(".cal__day[data-date]");
        var next = btn ? btn.dataset.date : null;
        if (next !== self.hover) { self.hover = next; if (self.start && !self.end) self.paint(); }
      });
      this.el.months.addEventListener("mouseleave", function () { self.hover = null; if (self.start && !self.end) self.paint(); });
      this.el.months.addEventListener("keydown", function (e) { self.onKey(e); });
      var count = this.monthCount();
      window.addEventListener("resize", function () {
        var n = self.monthCount();
        if (n !== count) { count = n; self.render(); }
      });
      this.render();
    },

    /* Règles ------------------------------------------------------------- */
    inWindow: function (d) { return d >= this.min && d <= this.max; },
    canStart: function (d) {
      if (!this.inWindow(d)) return false;
      return PDS.availability.isFree(this.blocked, d, D.add(d, B.minNights));
    },
    // Dernier jour de départ possible depuis une arrivée donnée (première nuit bloquée ou durée maximale)
    limitFrom: function (start) {
      var cap = D.add(start, B.maxNights);
      for (var d = start; d < cap; d = D.add(d, 1)) if (this.blocked.has(d)) return d;
      return cap;
    },
    canEnd: function (d) {
      if (!this.start || d <= this.start) return false;
      return D.diff(this.start, d) >= B.minNights && d <= this.limitFrom(this.start) && d <= D.add(this.max, 1);
    },

    /* Interaction --------------------------------------------------------- */
    pick: function (d) {
      if (this.start && !this.end && this.canEnd(d)) {
        this.end = d;
        this.focusDate = d;
        this.paint();
        this.emit();
        return;
      }
      if (this.canStart(d)) {
        this.start = d;
        this.end = null;
        this.focusDate = d;
        this.paint();
        this.emit();
        return;
      }
      var reason = this.blocked.has(d) ? "Cette nuit est déjà réservée." : !this.inWindow(d) ? "Cette date n'est pas ouverte à la réservation." : "Séjour de " + B.minNights + " nuits minimum à partir de cette date.";
      if (this.start && !this.end && d > this.start && d < D.add(this.start, B.minNights)) reason = "Le riad se réserve pour " + B.minNights + " nuits minimum.";
      this.hint(reason, true);
    },

    emit: function () {
      this.hint();
      this.opts.onChange({ start: this.start, end: this.end });
    },

    hint: function (msg, isError) {
      var text = msg;
      if (!text) {
        if (!this.start) text = "Choisissez votre date d'arrivée.";
        else if (!this.end) text = "Arrivée le " + D.short(this.start) + ". Choisissez votre départ (" + B.minNights + " nuits minimum).";
        else text = PDS.plural(D.diff(this.start, this.end), "nuit", "nuits") + ", du " + D.short(this.start) + " au " + D.short(this.end);
        if (!/\.$/.test(text)) text += ".";
      }
      this.el.hint.textContent = text;
      this.el.hint.classList.toggle("is-error", !!isError);
    },

    shift: function (n) {
      var target = D.addMonths(this.view, n);
      if (target < D.addMonths(D.today(), 0)) return;
      if (target > D.addMonths(this.max, 1 - this.monthCount())) return;
      this.view = target;
      this.render();
    },

    goTo: function (d) {
      var count = this.monthCount();
      var first = this.view;
      var last = D.addMonths(this.view, count - 1);
      var month = D.addMonths(d, 0);
      if (month < first) this.view = month;
      else if (month > last) this.view = D.addMonths(month, 1 - count);
      else return false;
      this.render();
      return true;
    },

    onKey: function (e) {
      var btn = e.target.closest(".cal__day[data-date]");
      if (!btn) return;
      var steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (e.key in steps) {
        e.preventDefault();
        var target = D.add(btn.dataset.date, steps[e.key]);
        if (target < D.today() || target > D.add(this.max, 1)) return;
        this.focusDate = target;
        this.goTo(target);
        this.paint();
        var el = this.el.months.querySelector('[data-date="' + target + '"]');
        if (el) el.focus();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.pick(btn.dataset.date);
      }
    },

    /* API ----------------------------------------------------------------- */
    setBlocked: function (set) { this.blocked = set; this.paint(); },
    setRange: function (start, end) {
      this.start = start || null;
      this.end = end || null;
      if (start) { this.focusDate = start; this.goTo(start); }
      this.paint();
      this.hint();
    },
    clear: function () { this.setRange(null, null); this.emit(); },

    /* Rendu --------------------------------------------------------------- */
    render: function () {
      var count = this.monthCount();
      var html = "";
      for (var m = 0; m < count; m++) {
        var first = D.addMonths(this.view, m);
        var date = D.parse(first);
        var offset = (date.getUTCDay() + 6) % 7;
        var days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
        html += '<div class="cal__month"><h3 class="cal__title">' + D.format(first, { month: "long", year: "numeric" }) + "</h3>";
        html += '<div class="cal__dow" aria-hidden="true">' + DOW.map(function (d) { return "<span>" + d + "</span>"; }).join("") + "</div>";
        html += '<div class="cal__grid">';
        for (var i = 0; i < offset; i++) html += '<span class="cal__day is-empty"></span>';
        for (var day = 1; day <= days; day++) {
          var iso = D.add(first, day - 1);
          html += '<button type="button" class="cal__day" data-date="' + iso + '" tabindex="-1"><span>' + day + "</span></button>";
        }
        html += "</div></div>";
      }
      this.el.months.style.setProperty("--months", count);
      this.el.months.innerHTML = html;
      this.el.prev.disabled = this.view <= D.addMonths(D.today(), 0);
      this.el.next.disabled = this.view >= D.addMonths(this.max, 1 - count);
      this.paint();
      if (!this.el.hint.textContent) this.hint();
    },

    paint: function () {
      var self = this;
      var selectingEnd = this.start && !this.end;
      var limit = selectingEnd ? this.limitFrom(this.start) : null;
      var previewEnd = selectingEnd && this.hover && this.canEnd(this.hover) ? this.hover : null;
      var buttons = this.el.months.querySelectorAll(".cal__day[data-date]");
      var focusable = null;
      buttons.forEach(function (btn) {
        var d = btn.dataset.date;
        var cls = ["cal__day"];
        var available = false;
        var label = D.long(d);
        if (d < D.today() || d > D.add(self.max, 1)) cls.push("is-past");
        else if (selectingEnd && d > self.start) {
          if (self.canEnd(d)) available = true;
          else if (d < D.add(self.start, B.minNights) && d <= limit) cls.push("is-short");
          else cls.push(self.blocked.has(d) ? "is-blocked" : "is-disabled");
        } else if (self.blocked.has(d) && d !== self.end) cls.push("is-blocked");
        else if (self.canStart(d)) available = true;
        else cls.push(self.inWindow(d) ? "is-short" : "is-disabled");

        if (available) cls.push("is-available");
        if (d === D.today()) cls.push("is-today");
        if (d === self.start) cls.push("is-start");
        if (d === self.start && (self.end || previewEnd)) cls.push("has-end");
        if (d === self.end) cls.push("is-end");
        if (self.start && self.end && d > self.start && d < self.end) cls.push("is-range");
        if (previewEnd && d > self.start && d <= previewEnd) cls.push(d === previewEnd ? "is-preview-end" : "is-preview", "is-preview");

        if (cls.indexOf("is-blocked") > -1) label += ", réservé";
        else if (!available && d !== self.start && d !== self.end) label += ", indisponible";
        if (d === self.start) label += ", arrivée";
        if (d === self.end) label += ", départ";

        btn.className = cls.join(" ");
        btn.setAttribute("aria-label", label);
        btn.setAttribute("aria-disabled", available || d === self.start ? "false" : "true");
        btn.setAttribute("aria-pressed", d === self.start || d === self.end ? "true" : "false");
        btn.tabIndex = -1;
        if (d === self.focusDate) focusable = btn;
      });
      if (!focusable) focusable = this.el.months.querySelector(".cal__day.is-available") || buttons[0];
      if (focusable) focusable.tabIndex = 0;
    }
  };

  PDS.RangeCalendar = RangeCalendar;
})();
