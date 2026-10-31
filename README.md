# Le Palais des Sables — site vitrine & réservation

Site statique sur mesure (HTML, CSS, JavaScript sans framework) pour la location en exclusivité du riad, à Taroudant.
Photographies issues de palaisdessables.com, converties en WebP.

## Lancer le site

```bash
python3 tools/build.py
python3 -m http.server 8640 --directory dist
```

Puis ouvrir http://localhost:8640. Le dossier `dist/` est le site final, à déposer tel quel sur n'importe quel hébergement statique (Netlify, Vercel, OVH, GitHub Pages…).

## Organisation

```
src/
  layouts/base.html      gabarit commun (head, en-tête, pied de page, scripts)
  partials/              en-tête, menu mobile, pied de page, monogramme…
  pages/                 une page par fichier ; métadonnées en tête (titre, description, scripts)
assets/
  css/main.css           identité visuelle complète (jetons de couleurs en tête de fichier)
  js/config.js           ← réglages : tarifs, options, séjour minimum, source du calendrier, envoi des formulaires
  js/core.js             dates, lecture iCal, disponibilités, calcul des tarifs, envoi des demandes
  js/calendar.js         calendrier de sélection arrivée / départ
  js/site.js             navigation, animations, diaporama, visionneuse plein écran, barre de réservation
  js/booking.js          parcours de réservation en trois étapes
  js/contact.js          formulaire de contact
  img/                   photographies optimisées (générées par tools/images.py)
api/airbnb-calendar.js   relais serverless du calendrier Airbnb
tools/build.py           assemble src/ → dist/ (gabarits, images responsives, sitemap)
tools/images.py          prépare les photographies (WebP, deux largeurs, étalonnage)
```

`python3 tools/build.py` doit être relancé après chaque modification de `src/` ou `assets/`.

## Disponibilités et synchronisation Airbnb

Le calendrier lit un flux **iCal**, exactement celui qu'Airbnb exporte. En démonstration (`availability.source: "demo"`),
des réservations fictives sont générées dans ce même format puis lues par le même analyseur : passer en production
ne change que la source.

1. Dans Airbnb : Annonce → Disponibilités → Synchroniser les calendriers → **Exporter le calendrier**, copier le lien.
2. Déployer le site sur Vercel ou Netlify et définir la variable d'environnement `AIRBNB_ICAL_URL` avec ce lien.
   La fonction `api/airbnb-calendar.js` lit le calendrier côté serveur (le navigateur ne peut pas l'interroger
   directement) et le met en cache 15 minutes.
3. Dans `assets/js/config.js` : `availability.source: "ical"`.

Des nuits peuvent être bloquées à la main via `availability.extraBlocked`.
Sens inverse (bloquer Airbnb depuis le site) : à prévoir lorsque les réservations directes seront confirmées en base,
en publiant un flux iCal que l'on importe dans Airbnb.

## Formulaires

En démonstration (`forms.mode: "demo"`), les demandes sont conservées dans le navigateur et la page de confirmation
propose un e-mail et un message WhatsApp préremplis, qui permettent déjà de les transmettre réellement.
Pour un envoi automatique : `forms.mode: "endpoint"` et `forms.endpoint` = URL acceptant un POST JSON
(Formspree, fonction serverless, CRM…).

## Contenus à valider avant mise en ligne

- Les chambres **Saadienne**, **Tiout** et **des Remparts** portent des noms proposés ; les quatre autres
  (Kasbah, Bounouna, Berbères, Atlas) reprennent ceux du site actuel. L'attribution des photos à chaque chambre est à vérifier.
- Horaires d'arrivée (15 h) et de départ (11 h) : valeurs par défaut.
- Tarifs, options et transferts : repris de palaisdessables.com (grille 2025).
- Les photographies d'origine sont en définition moyenne (1 000 à 2 000 px) : des fichiers originaux plus grands
  amélioreraient nettement les grands formats sur écrans Retina (`python3 tools/images.py <dossier>`).
