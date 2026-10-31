/* Parcours de demande de réservation : dates → séjour → coordonnées → confirmation. */
(function () {
  "use strict";
  var PDS = window.PDS;
  var D = PDS.dates;
  var C = window.PDS_CONFIG;
  var B = C.booking;
  var root = document.querySelector("[data-booking]");
  if (!root) return;
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); };
  var MARK = '<svg viewBox="0 0 40 54" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M1.5 53V21a18.5 18.5 0 0 1 37 0v32"/><path d="M6 53V22a14 14 0 0 1 28 0v31"/><rect x="15.5" y="23.5" width="9" height="9"/><rect x="15.5" y="23.5" width="9" height="9" transform="rotate(45 20 28)"/></svg>';

  var stay = PDS.stay.get();
  PDS.stay.set(stay);
  if (location.search) history.replaceState(null, "", location.pathname + location.hash);

  var state = { step: 1, options: [], board: false, transfer: "" };
  var panels = $$(".panel[data-step]", root);
  var steps = $$("[data-step-label]");
  var nextBtn = $('[data-go="2"]', root);
  var cal = null;

  /* Options issues de la configuration */
  $("[data-options]").innerHTML = C.options.map(function (o) {
    return '<label class="option"><input type="checkbox" name="opt" value="' + o.id + '"><span><strong>' + o.label + "</strong><small>" + o.note +
      '</small></span><span class="option__price">' + PDS.money(o.weekly) + "<small>/ semaine</small></span></label>";
  }).join("");

  /* Récapitulatif & estimation */
  function currentQuote() {
    return PDS.pricing.quote({
      start: stay.start, end: stay.end, adults: stay.adults, children: stay.children, babies: stay.babies,
      options: state.options, board: state.board, transfer: state.transfer
    });
  }

  function renderQuote() {
    var box = $("[data-quote]");
    if (!(stay.start && stay.end)) {
      box.innerHTML = '<p class="form__note">Sélectionnez vos dates pour obtenir une estimation.<br>À partir de ' + PDS.money(C.rates.base) + " la nuit pour le riad entier.</p>";
      return;
    }
    var q = currentQuote();
    var html = '<dl class="quote-lines">';
    q.lines.forEach(function (l) {
      html += "<div><dt>" + PDS.money(l.rate) + " × " + PDS.plural(l.nights, "nuit", "nuits") + "</dt><dd>" + PDS.money(l.rate * l.nights) + "</dd></div>";
    });
    q.options.forEach(function (o) { html += "<div><dt>" + esc(o.label) + "</dt><dd>" + PDS.money(o.amount) + "</dd></div>"; });
    html += '<div class="is-sub"><dt>' + q.rooms + " chambres ouvertes &middot; " + esc(PDS.stay.guestsLabel(stay)) + "</dt></div></dl>";
    html += '<div class="quote-total" style="margin-top:16px"><span>Estimation</span><strong>' + PDS.money(q.total) + "</strong></div>";
    html += '<dl class="quote-lines" style="margin-top:10px"><div class="is-sub"><dt>Acompte à la confirmation</dt><dd>' + PDS.money(q.deposit) + "</dd></div>";
    q.onsite.forEach(function (o) { html += '<div class="is-sub"><dt>' + esc(o.label) + ", sur place</dt><dd>≈ " + PDS.money(o.amount) + "</dd></div>"; });
    html += "</dl>";
    box.innerHTML = html;
  }

  function update() {
    var s = $("[data-sum-start]");
    var e = $("[data-sum-end]");
    s.textContent = stay.start ? D.format(stay.start, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";
    e.textContent = stay.end ? D.format(stay.end, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";
    s.classList.toggle("is-empty", !stay.start);
    e.classList.toggle("is-empty", !stay.end);
    nextBtn.disabled = !(stay.start && stay.end);
    renderQuote();
  }

  PDS.guests($("[data-guests]"), stay, function () { PDS.stay.set(stay); update(); });

  /* Calendrier */
  PDS.availability.load().then(function (res) {
    var badge = $("[data-source]");
    var label = !res.ok ? "Calendrier momentanément indisponible" : res.source === "ical" ? "Synchronisé avec Airbnb" : "Démonstration · disponibilités fictives";
    badge.innerHTML = "<i" + (res.ok ? "" : ' style="background:var(--clay);box-shadow:none"') + "></i>" + label;
    var notice = null;
    if (stay.start && stay.end && !(PDS.availability.isFree(res.blocked, stay.start, stay.end) && D.diff(stay.start, stay.end) >= B.minNights)) {
      notice = "Les dates choisies ne sont pas disponibles en totalité. Merci d'en sélectionner d'autres.";
      stay.start = stay.end = null;
      PDS.stay.set(stay);
    }
    cal = new PDS.RangeCalendar($("[data-calendar]"), {
      months: "auto",
      blocked: res.blocked,
      start: stay.start,
      end: stay.end,
      onChange: function (r) {
        stay.start = r.start;
        stay.end = r.end;
        PDS.stay.set(stay);
        update();
      }
    });
    if (notice) cal.hint(notice, true);
    update();
  });
  $("[data-clear-dates]").addEventListener("click", function () { if (cal) cal.clear(); });

  /* Étape 2 : options */
  var form2 = $('.panel[data-step="2"]', root);
  form2.addEventListener("change", function () {
    state.options = $$('input[name="opt"]:checked', form2).map(function (i) { return i.value; });
    state.board = form2.elements.board.checked;
    state.transfer = form2.elements.transfer.value;
    renderQuote();
  });

  /* Navigation entre étapes */
  function go(n) {
    if (n > 1 && !(stay.start && stay.end)) return;
    state.step = n;
    panels.forEach(function (p) { p.hidden = +p.dataset.step !== n; });
    steps.forEach(function (li) {
      var k = +li.dataset.stepLabel;
      li.classList.toggle("is-current", k === n);
      li.classList.toggle("is-done", k < n);
      if (k === n) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    var panel = $('.panel[data-step="' + n + '"]', root);
    var top = $("[data-steps]").getBoundingClientRect().top + window.scrollY - 100;
    if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top: top, behavior: "smooth" });
    var focusTarget = $("h2", panel) || panel;
    focusTarget.setAttribute("tabindex", "-1");
    focusTarget.focus({ preventScroll: true });
  }
  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]");
    if (b) { e.preventDefault(); go(+b.dataset.go); }
  });

  /* Étape 3 : validation et envoi */
  var form3 = $('.panel[data-step="3"]', root);
  var rules = {
    firstName: function (v) { return v.trim() ? "" : "Merci d'indiquer votre prénom."; },
    lastName: function (v) { return v.trim() ? "" : "Merci d'indiquer votre nom."; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Adresse e-mail invalide."; },
    phone: function (v) { return v.replace(/\D/g, "").length >= 8 ? "" : "Numéro de téléphone incomplet."; }
  };
  function validate(field) {
    var rule = rules[field.name];
    if (!rule) return true;
    var msg = rule(field.value);
    var wrap = field.closest(".field");
    wrap.classList.toggle("is-invalid", !!msg);
    $(".field__error", wrap).textContent = msg;
    field.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }
  Object.keys(rules).forEach(function (name) {
    var f = form3.elements[name];
    f.addEventListener("blur", function () { if (f.value) validate(f); });
    f.addEventListener("input", function () { if (f.closest(".field").classList.contains("is-invalid")) validate(f); });
  });

  form3.addEventListener("submit", function (e) {
    e.preventDefault();
    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      var f = form3.elements[name];
      if (!validate(f) && !firstInvalid) firstInvalid = f;
    });
    var consent = form3.elements.consent;
    consent.closest(".check").classList.toggle("is-invalid", !consent.checked);
    if (!consent.checked && !firstInvalid) firstInvalid = consent;
    if (firstInvalid) { firstInvalid.focus(); return; }

    var btn = $("[data-submit]", form3);
    btn.classList.add("is-loading");
    var q = currentQuote();
    var contact = {
      firstName: form3.elements.firstName.value.trim(), lastName: form3.elements.lastName.value.trim(),
      email: form3.elements.email.value.trim(), phone: form3.elements.phone.value.trim(),
      country: form3.elements.country.value.trim(), source: form3.elements.source.value
    };
    var payload = {
      stay: { start: stay.start, end: stay.end, nights: q.nights, adults: stay.adults, children: stay.children, babies: stay.babies, rooms: q.rooms },
      options: state.options, board: state.board, transfer: state.transfer,
      arrival: form2.elements.arrival.value, occasion: form2.elements.occasion.value, lang: form2.elements.lang.value,
      wishes: form2.elements.wishes.value.trim(), estimate: { total: q.total, deposit: q.deposit, currency: C.rates.currency },
      contact: contact
    };
    PDS.requests.submit("reservation", payload).then(function (res) {
      btn.classList.remove("is-loading");
      confirm(res, q);
    }).catch(function (err) {
      btn.classList.remove("is-loading");
      var note = $(".form__status", form3) || form3.appendChild(Object.assign(document.createElement("p"), { className: "form__status" }));
      note.textContent = "L'envoi n'a pas abouti (" + err.message + "). Vous pouvez nous écrire directement à " + C.contact.email + ".";
    });
  });

  function summaryText(res, q) {
    return [
      "Demande de réservation " + res.ref,
      "",
      "Arrivée : " + D.long(stay.start),
      "Départ : " + D.long(stay.end) + " (" + PDS.plural(q.nights, "nuit", "nuits") + ")",
      "Voyageurs : " + PDS.stay.guestsLabel(stay),
      "Options : " + (q.options.map(function (o) { return o.label; }).join(", ") || "aucune"),
      "Pension complète : " + (state.board ? "oui" : "non"),
      "Transfert : " + (state.transfer ? C.services.transfers[state.transfer].label : "aucun"),
      "Estimation : " + PDS.money(q.total),
      "",
      res.wishes ? "Message : " + res.wishes : "",
      res.contact.firstName + " " + res.contact.lastName + " · " + res.contact.email + " · " + res.contact.phone
    ].join("\n");
  }

  function confirm(res, q) {
    var text = summaryText(res, q);
    var html =
      '<span class="confirm__mark">' + MARK + "</span>" +
      '<p class="eyebrow">Demande envoyée</p>' +
      '<h2 class="h2">Merci, <em>' + esc(res.contact.firstName) + "</em>.</h2>" +
      '<p class="text-muted" style="max-width:32em">Votre demande pour le Palais des Sables a bien été transmise. Olivia vous répond personnellement pour confirmer la disponibilité et préparer votre séjour.</p>' +
      '<span class="confirm__ref">Référence ' + esc(res.ref) + "</span>" +
      '<dl class="quote-lines confirm__recap">' +
      "<div><dt>Arrivée</dt><dd>" + D.medium(stay.start) + "</dd></div>" +
      "<div><dt>Départ</dt><dd>" + D.medium(stay.end) + "</dd></div>" +
      "<div><dt>Séjour</dt><dd>" + PDS.plural(q.nights, "nuit", "nuits") + " · " + esc(PDS.stay.guestsLabel(stay)) + "</dd></div>" +
      "<div><dt>Estimation</dt><dd>" + PDS.money(q.total) + "</dd></div></dl>" +
      '<ol class="timeline">' +
      '<li><span class="num">01</span><p><strong>Confirmation.</strong> Nous vérifions vos dates et revenons vers vous avec une proposition détaillée.</p></li>' +
      '<li><span class="num">02</span><p><strong>Acompte.</strong> Un acompte de 50&nbsp;% bloque définitivement le riad pour vous.</p></li>' +
      '<li><span class="num">03</span><p><strong>Préparation.</strong> Menus, transferts, soins et excursions sont organisés avant votre arrivée.</p></li></ol>' +
      '<div class="confirm__actions">' +
      '<a class="btn btn--clay" href="' + PDS.requests.mailto("Demande de réservation " + res.ref, text) + '"><span>Envoyer aussi par e-mail</span></a>' +
      '<a class="btn" href="' + PDS.requests.whatsapp(text) + '" target="_blank" rel="noopener"><span>WhatsApp</span></a></div>' +
      (C.forms.mode === "demo" ? '<p class="form__note" style="max-width:34em">Version de démonstration&nbsp;: la demande est conservée dans ce navigateur. Le bouton «&nbsp;Envoyer aussi par e-mail&nbsp;» la transmet réellement.</p>' : "") +
      '<a class="link" href="index.html"><span>Retour à l\'accueil</span><i class="link__line"></i></a>';
    $("[data-confirm]").innerHTML = html;
    root.classList.add("is-confirmed");
    try { sessionStorage.removeItem("pds:stay"); } catch (e) { /* ignoré */ }
    steps.forEach(function (li) { li.classList.remove("is-current"); li.classList.add("is-done"); });
    panels.forEach(function (p) { p.hidden = p.dataset.step !== "4"; });
    var top = $("[data-steps]").getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: top, behavior: "smooth" });
    $('.panel[data-step="4"]', root).focus({ preventScroll: true });
  }

  update();
})();
