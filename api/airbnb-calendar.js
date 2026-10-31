/**
 * Relais du calendrier Airbnb (fonction serverless, format Vercel / Netlify Functions v2).
 *
 * Airbnb publie un lien d'export iCal par annonce (Annonce → Disponibilités →
 * Synchroniser les calendriers → Exporter). Ce lien ne peut pas être lu directement
 * par le navigateur (CORS) et ne doit pas être exposé publiquement : ce relais le lit
 * côté serveur, met la réponse en cache et la renvoie au site.
 *
 * Variable d'environnement requise : AIRBNB_ICAL_URL
 * Côté site : assets/js/config.js → availability.source = "ical"
 */
export default async function handler(req, res) {
  const url = process.env.AIRBNB_ICAL_URL;
  if (!url) {
    res.status(500).send("AIRBNB_ICAL_URL manquant");
    return;
  }
  try {
    const upstream = await fetch(url, { headers: { "User-Agent": "PalaisDesSables-Sync/1.0" } });
    if (!upstream.ok) throw new Error(`Airbnb a répondu ${upstream.status}`);
    const ics = await upstream.text();
    if (!ics.includes("BEGIN:VCALENDAR")) throw new Error("Réponse iCal invalide");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    // Cache CDN de 15 minutes, resservi pendant une heure si Airbnb est indisponible
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    res.status(200).send(ics);
  } catch (err) {
    res.status(502).send(String(err.message || err));
  }
}
