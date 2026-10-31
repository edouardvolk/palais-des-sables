/* Configuration du site — seul fichier à modifier pour passer de la démo à la production. */
window.PDS_CONFIG = {
  availability: {
    // "demo"  : disponibilités fictives générées localement (aucun serveur requis)
    // "ical"  : calendrier réel, lu depuis l'export iCal Airbnb via le relais api/airbnb-calendar.js
    source: "demo",
    icalUrl: "/api/airbnb-calendar",
    cacheMinutes: 15,
    // Nuits bloquées manuellement en plus du calendrier (AAAA-MM-JJ, nuit du jour indiqué)
    extraBlocked: []
  },

  booking: {
    minNights: 3,
    maxNights: 28,
    leadDays: 2,          // délai minimum avant l'arrivée
    monthsAhead: 18,      // horizon de réservation
    maxGuests: 14,        // adultes + enfants
    maxBabies: 2,         // deux lits bébé
    roomsThreshold: 8,    // au-delà : ouverture des 7 chambres
    checkIn: "15 h",
    checkOut: "11 h",
    depositRate: 0.5
  },

  // Tarifs de la maison entière, par nuit (source : palaisdessables.com)
  rates: {
    currency: "EUR",
    base: 380,      // autres périodes
    summer: 420,    // juillet et août
    festive: 560    // Noël, Pâques, Toussaint
  },

  // Options facturées avec la location (prix par semaine, au prorata des nuits)
  options: [
    { id: "pool", label: "Piscine chauffée", note: "Le bassin de 12 × 5 m, chauffé", weekly: 300 },
    { id: "air", label: "Climatisation réversible", note: "Chaud ou froid, dans toutes les chambres", weekly: 300 },
    { id: "wood", label: "Feux de cheminée", note: "Bois pour les cinq cheminées", weekly: 70 }
  ],

  // Services réglés sur place, indiqués à titre indicatif
  services: {
    boardPerPersonPerDay: 15,
    transfers: {
      agadir: { label: "Aéroport d'Agadir", tiers: [[4, 60], [7, 70], [14, 135]] },
      marrakech: { label: "Aéroport de Marrakech", tiers: [[7, 175], [14, 330]] }
    }
  },

  forms: {
    // "demo"     : la demande est conservée dans le navigateur et un e-mail prérempli est proposé
    // "endpoint" : envoi JSON (POST) vers l'URL ci-dessous (Formspree, fonction serverless, CRM…)
    mode: "demo",
    endpoint: ""
  },

  contact: {
    name: "Olivia Allard",
    email: "olivia.allard@gmail.com",
    phone: "+33 6 11 04 33 35",
    whatsapp: "33611043335"
  }
};
