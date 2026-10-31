/* Noyau : dates, calendrier iCal, disponibilités, tarifs, séjour en cours, envoi des demandes. */
(function () {
  "use strict";
  var C = window.PDS_CONFIG;
  var PDS = (window.PDS = window.PDS || {});

  /* Dates ------------------------------------------------------------------
     Toutes les dates circulent au format "AAAA-MM-JJ" et se calculent en UTC,
     ce qui évite les décalages liés aux fuseaux et aux changements d'heure. */
  var D = (PDS.dates = {
    iso: function (d) { return d.toISOString().slice(0, 10); },
    parse: function (s) {
      var p = s.split("-");
      return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    },
    today: function () {
      var n = new Date();
      return D.iso(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
    },
    add: function (s, n) {
      var d = D.parse(s);
      d.setUTCDate(d.getUTCDate() + n);
      return D.iso(d);
    },
    addMonths: function (s, n) {
      var d = D.parse(s);
      return D.iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
    },
    diff: function (a, b) { return Math.round((D.parse(b) - D.parse(a)) / 864e5); },
    valid: function (s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(D.parse(s)); },
    format: function (s, opts) {
      return D.parse(s).toLocaleDateString("fr-FR", Object.assign({ timeZone: "UTC" }, opts));
    },
    short: function (s) { return D.format(s, { day: "numeric", month: "short" }); },
    medium: function (s) { return D.format(s, { day: "numeric", month: "long", year: "numeric" }); },
    long: function (s) { return D.format(s, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  });

  PDS.plural = function (n, one, many) { return n + " " + (n > 1 ? many : one); };
  PDS.money = function (n) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: C.rates.currency, maximumFractionDigits: 0 }).format(n);
  };

  /* iCal --------------------------------------------------------------------
     Format d'export Airbnb : un VEVENT par réservation ou blocage,
     DTSTART = jour d'arrivée, DTEND = jour de départ (exclu). */
  function icsDate(value) {
    var m = /^(\d{4})(\d{2})(\d{2})/.exec(value || "");
    return m ? m[1] + "-" + m[2] + "-" + m[3] : null;
  }
  PDS.ical = {
    parse: function (text) {
      var lines = String(text).replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
      var events = [];
      var current = null;
      lines.forEach(function (line) {
        if (line === "BEGIN:VEVENT") current = {};
        else if (line === "END:VEVENT") {
          if (current && current.start) events.push(current);
          current = null;
        } else if (current) {
          var i = line.indexOf(":");
          if (i < 0) return;
          var key = line.slice(0, i).split(";")[0].toUpperCase();
          var value = line.slice(i + 1).trim();
          if (key === "DTSTART") current.start = icsDate(value);
          else if (key === "DTEND") current.end = icsDate(value);
          else if (key === "SUMMARY") current.summary = value;
          else if (key === "UID") current.uid = value;
        }
      });
      return events;
    },
    blockedNights: function (events) {
      var nights = new Set();
      events.forEach(function (e) {
        var end = e.end && e.end > e.start ? e.end : D.add(e.start, 1);
        for (var d = e.start; d < end; d = D.add(d, 1)) nights.add(d);
      });
      return nights;
    },
    build: function (events, name) {
      var stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
      var out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Le Palais des Sables//" + (name || "Calendrier") + "//FR", "CALSCALE:GREGORIAN"];
      events.forEach(function (e) {
        out.push(
          "BEGIN:VEVENT",
          "DTSTAMP:" + stamp,
          "DTSTART;VALUE=DATE:" + e.start.replace(/-/g, ""),
          "DTEND;VALUE=DATE:" + e.end.replace(/-/g, ""),
          "UID:" + e.uid,
          "SUMMARY:" + (e.summary || "Reserved"),
          "END:VEVENT"
        );
      });
      out.push("END:VCALENDAR");
      return out.join("\r\n");
    }
  };

  /* Saisons & tarifs ---------------------------------------------------- */
  function easter(year) {
    var a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return D.iso(new Date(Date.UTC(year, month - 1, day)));
  }
  var SEASON_LABELS = { festive: "Noël, Pâques & Toussaint", summer: "Juillet & août", base: "Autres périodes" };

  function season(night) {
    var d = D.parse(night), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    if ((m === 12 && day >= 19) || (m === 1 && day <= 4)) return "festive";
    if ((m === 10 && day >= 17) || (m === 11 && day <= 2)) return "festive";
    var fromEaster = D.diff(easter(d.getUTCFullYear()), night);
    if (fromEaster >= -9 && fromEaster <= 8) return "festive";
    if (m === 7 || m === 8) return "summer";
    return "base";
  }

  function transferPrice(kind, people) {
    var t = C.services.transfers[kind];
    if (!t) return 0;
    for (var i = 0; i < t.tiers.length; i++) if (people <= t.tiers[i][0]) return t.tiers[i][1];
    return t.tiers[t.tiers.length - 1][1];
  }

  PDS.pricing = {
    season: season,
    seasonLabel: function (id) { return SEASON_LABELS[id]; },
    rate: function (night) { return C.rates[season(night)]; },
    transferPrice: transferPrice,
    /* q = { start, end, adults, children, babies, options: [ids], board, transfer } */
    quote: function (q) {
      var nights = D.diff(q.start, q.end);
      var groups = [];
      for (var d = q.start; d < q.end; d = D.add(d, 1)) {
        var rate = PDS.pricing.rate(d);
        var last = groups[groups.length - 1];
        if (last && last.rate === rate) last.nights++;
        else groups.push({ rate: rate, nights: 1, season: season(d) });
      }
      var stay = groups.reduce(function (s, g) { return s + g.rate * g.nights; }, 0);
      var merged = {};
      groups.forEach(function (g) {
        merged[g.rate] = merged[g.rate] || { rate: g.rate, nights: 0, season: g.season };
        merged[g.rate].nights += g.nights;
      });
      var options = C.options.filter(function (o) { return (q.options || []).indexOf(o.id) > -1; }).map(function (o) {
        return { id: o.id, label: o.label, amount: Math.round((o.weekly * nights) / 7) };
      });
      var subtotal = stay + options.reduce(function (s, o) { return s + o.amount; }, 0);
      var people = (q.adults || 0) + (q.children || 0);
      var onsite = [];
      if (q.board) onsite.push({ label: "Pension complète", amount: C.services.boardPerPersonPerDay * people * nights });
      if (q.transfer) onsite.push({ label: "Transferts aller-retour", amount: transferPrice(q.transfer, people) * 2 });
      return {
        nights: nights,
        lines: Object.keys(merged).map(function (k) { return merged[k]; }),
        stay: stay,
        options: options,
        total: subtotal,
        deposit: Math.round(subtotal * C.booking.depositRate),
        onsite: onsite,
        rooms: people > C.booking.roomsThreshold ? 7 : 4
      };
    }
  };

  /* Disponibilités -------------------------------------------------------- */
  function seeded(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Réservations fictives, stables d'un chargement à l'autre, au format d'un export Airbnb.
  function demoEvents() {
    var rnd = seeded(1867);
    var events = [];
    var d = "2026-01-02";
    var i = 0;
    while (d < "2028-12-31") {
      var peak = season(d) !== "base";
      d = D.add(d, peak ? 1 + Math.floor(rnd() * 5) : 4 + Math.floor(rnd() * 11));
      var end = D.add(d, peak ? 5 + Math.floor(rnd() * 6) : 3 + Math.floor(rnd() * 5));
      events.push({ uid: "demo-" + i++ + "@palaisdessables.com", start: d, end: end, summary: rnd() < 0.75 ? "Reserved" : "Airbnb (Not available)" });
      d = end;
    }
    return events;
  }

  function fetchIcal(url) {
    var key = "pds:ical";
    try {
      var cached = JSON.parse(sessionStorage.getItem(key) || "null");
      if (cached && Date.now() - cached.at < C.availability.cacheMinutes * 60000) return Promise.resolve(cached.text);
    } catch (e) { /* stockage indisponible */ }
    return fetch(url, { headers: { Accept: "text/calendar" } }).then(function (r) {
      if (!r.ok) throw new Error("Calendrier indisponible (" + r.status + ")");
      return r.text();
    }).then(function (text) {
      try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), text: text })); } catch (e) { /* ignoré */ }
      return text;
    });
  }

  var loading = null;
  PDS.availability = {
    load: function () {
      if (loading) return loading;
      var cfg = C.availability;
      var source = cfg.source === "ical" ? fetchIcal(cfg.icalUrl) : Promise.resolve(PDS.ical.build(demoEvents(), "Démonstration"));
      loading = source.then(function (text) {
        var nights = PDS.ical.blockedNights(PDS.ical.parse(text));
        (cfg.extraBlocked || []).forEach(function (n) { nights.add(n); });
        return { blocked: nights, source: cfg.source, ok: true };
      }).catch(function (err) {
        console.warn("[disponibilités]", err);
        return { blocked: new Set(), source: cfg.source, ok: false };
      });
      return loading;
    },
    isFree: function (blocked, start, end) {
      for (var d = start; d < end; d = D.add(d, 1)) if (blocked.has(d)) return false;
      return true;
    }
  };

  /* Séjour en cours : partagé entre les pages (barre d'accueil, réservation, contact). */
  var STAY_KEY = "pds:stay";
  function readStay() {
    try { return JSON.parse(sessionStorage.getItem(STAY_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  PDS.stay = {
    // Paramètres d'URL (lien partagé, barre d'accueil) prioritaires sur la session
    get: function () {
      var s = readStay();
      var p = new URLSearchParams(location.search);
      if (p.get("arrivee")) s.start = p.get("arrivee");
      if (p.get("depart")) s.end = p.get("depart");
      ["adultes", "enfants", "bebes"].forEach(function (k, i) {
        if (p.get(k) !== null) s[["adults", "children", "babies"][i]] = parseInt(p.get(k), 10) || 0;
      });
      if (!D.valid(s.start) || !D.valid(s.end) || s.end <= s.start || s.start < D.today()) { s.start = null; s.end = null; }
      s.adults = Math.max(1, Math.min(C.booking.maxGuests, s.adults || 2));
      s.children = Math.max(0, Math.min(C.booking.maxGuests - s.adults, s.children || 0));
      s.babies = Math.max(0, Math.min(C.booking.maxBabies, s.babies || 0));
      return s;
    },
    set: function (patch) {
      var s = Object.assign(readStay(), patch);
      try { sessionStorage.setItem(STAY_KEY, JSON.stringify(s)); } catch (e) { /* ignoré */ }
      return s;
    },
    query: function (s) {
      var p = new URLSearchParams();
      if (s.start && s.end) { p.set("arrivee", s.start); p.set("depart", s.end); }
      p.set("adultes", s.adults);
      if (s.children) p.set("enfants", s.children);
      if (s.babies) p.set("bebes", s.babies);
      return p.toString();
    },
    guestsLabel: function (s) {
      var parts = [PDS.plural(s.adults, "adulte", "adultes")];
      if (s.children) parts.push(PDS.plural(s.children, "enfant", "enfants"));
      if (s.babies) parts.push(PDS.plural(s.babies, "bébé", "bébés"));
      return parts.join(" · ");
    }
  };

  /* Demandes (réservation, contact) ----------------------------------------- */
  PDS.requests = {
    submit: function (kind, data) {
      var payload = Object.assign({ kind: kind, ref: "PDS-" + Date.now().toString(36).toUpperCase().slice(-6), createdAt: new Date().toISOString() }, data);
      if (C.forms.mode === "endpoint" && C.forms.endpoint) {
        return fetch(C.forms.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        }).then(function (r) {
          if (!r.ok) throw new Error("Envoi impossible (" + r.status + ")");
          return payload;
        });
      }
      return new Promise(function (resolve) {
        setTimeout(function () {
          try {
            var list = JSON.parse(localStorage.getItem("pds:requests") || "[]");
            list.push(payload);
            localStorage.setItem("pds:requests", JSON.stringify(list.slice(-50)));
          } catch (e) { /* ignoré */ }
          resolve(payload);
        }, 1100);
      });
    },
    mailto: function (subject, body) {
      return "mailto:" + C.contact.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    },
    whatsapp: function (text) { return "https://wa.me/" + C.contact.whatsapp + "?text=" + encodeURIComponent(text); }
  };
})();
