/* Formulaire de contact : dates souhaitées, validation, envoi (démo ou point d'accès). */
(function () {
  "use strict";
  var PDS = window.PDS;
  var D = PDS.dates;
  var C = window.PDS_CONFIG;
  var form = document.querySelector("[data-contact-form]");
  if (!form) return;
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); };

  /* Dates souhaitées, reprises du séjour en cours s'il existe */
  var stay = PDS.stay.get();
  var dates = { start: stay.start, end: stay.end };
  var wrap = $("[data-dates-field]", form);
  var trigger = $("[data-dates-trigger]", wrap);
  function paintDates() {
    var has = dates.start && dates.end;
    trigger.textContent = has ? D.short(dates.start) + " → " + D.short(dates.end) + " · " + PDS.plural(D.diff(dates.start, dates.end), "nuit", "nuits") : "Choisir des dates";
    trigger.classList.toggle("is-empty", !has);
  }
  var picker = PDS.datePopover($("[data-pop]", wrap), {
    start: dates.start, end: dates.end, months: 1,
    onApply: function (r, close) {
      dates = r;
      PDS.stay.set({ start: r.start, end: r.end });
      paintDates();
      if (close) PDS.closePopovers();
    }
  });
  PDS.registerPopover([trigger], picker, wrap);
  paintDates();

  /* Validation */
  var rules = {
    firstName: function (v) { return v.trim() ? "" : "Merci d'indiquer votre prénom."; },
    lastName: function (v) { return v.trim() ? "" : "Merci d'indiquer votre nom."; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Adresse e-mail invalide."; },
    message: function (v) { return v.trim().length >= 10 ? "" : "Quelques mots de plus, s'il vous plaît."; }
  };
  function validate(field) {
    var msg = rules[field.name](field.value);
    var box = field.closest(".field");
    box.classList.toggle("is-invalid", !!msg);
    $(".field__error", box).textContent = msg;
    field.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }
  Object.keys(rules).forEach(function (name) {
    var f = form.elements[name];
    f.addEventListener("blur", function () { if (f.value) validate(f); });
    f.addEventListener("input", function () { if (f.closest(".field").classList.contains("is-invalid")) validate(f); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var first = null;
    Object.keys(rules).forEach(function (name) { if (!validate(form.elements[name]) && !first) first = form.elements[name]; });
    var consent = form.elements.consent;
    consent.closest(".check").classList.toggle("is-invalid", !consent.checked);
    if (!consent.checked && !first) first = consent;
    if (first) { first.focus(); return; }

    var btn = $("[data-submit]", form);
    btn.classList.add("is-loading");
    var data = {
      subject: form.elements.subject.value,
      firstName: form.elements.firstName.value.trim(),
      lastName: form.elements.lastName.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      dates: dates.start && dates.end ? { start: dates.start, end: dates.end } : null,
      guests: form.elements.guests.value,
      message: form.elements.message.value.trim()
    };
    PDS.requests.submit("contact", data).then(function (res) {
      btn.classList.remove("is-loading");
      var text = [
        res.subject,
        res.dates ? "Dates : du " + D.medium(res.dates.start) + " au " + D.medium(res.dates.end) : "",
        res.guests ? "Voyageurs : " + res.guests : "",
        "",
        res.message,
        "",
        res.firstName + " " + res.lastName + " · " + res.email + (res.phone ? " · " + res.phone : "")
      ].filter(function (l, i, a) { return l || a[i - 1]; }).join("\n");
      var box = $("[data-contact-success]");
      box.innerHTML =
        '<p class="eyebrow">Message envoyé &middot; ' + esc(res.ref) + "</p>" +
        '<h2 class="h2">Merci, <em>' + esc(res.firstName) + "</em>.</h2>" +
        '<p class="text-muted" style="max-width:32em">Votre message est bien parvenu au Palais des Sables. Nous vous répondons personnellement à l\'adresse ' + esc(res.email) + ".</p>" +
        (C.forms.mode === "demo"
          ? '<p class="form__note">Version de démonstration&nbsp;: pour transmettre réellement ce message, utilisez le bouton ci-dessous.</p><div class="confirm__actions" style="justify-content:start"><a class="btn btn--clay" href="' +
            PDS.requests.mailto(res.subject + " · " + res.firstName + " " + res.lastName, text) + '"><span>Envoyer par e-mail</span></a><a class="btn" href="' +
            PDS.requests.whatsapp(text) + '" target="_blank" rel="noopener"><span>WhatsApp</span></a></div>'
          : "") +
        '<a class="link" href="index.html"><span>Retour à l\'accueil</span><i class="link__line"></i></a>';
      form.hidden = true;
      box.hidden = false;
      box.focus();
    }).catch(function (err) {
      btn.classList.remove("is-loading");
      var note = $(".form__status", form) || form.appendChild(Object.assign(document.createElement("p"), { className: "form__status" }));
      note.textContent = "L'envoi n'a pas abouti (" + err.message + "). Écrivez-nous directement à " + C.contact.email + ".";
    });
  });
})();
