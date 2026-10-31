"""Prépare les photographies du site (WebP, deux largeurs, étalonnage léger).

Usage : python3 tools/images.py <dossier_source>
Le dossier source contient les fichiers bruts récupérés sur palaisdessables.com.
Génère assets/img/<slug>-<largeur>.webp et assets/img/manifest.json.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"

# slug -> fichier source
MAP = {
    # Extérieurs, patio, piscine
    "piscine-remparts": "slider-palais-min.jpg",
    "patio-nuit": "gnvimg__nvimg-025-min.jpg",
    "piscine-jardin": "gnvimg__nvimg-018-min.jpg",
    "patio-piscine": "gnvimg__nvimg-014-min.jpg",
    "facade-nuit": "gnvimg__nvimg-024-min.jpg",
    "tente-berbere": "gnvimg__nvimg-013-min.jpg",
    "galerie-table": "gnvimg__nvimg-016-min.jpg",
    "galerie-arcades": "gnvimg__nvimg-017-min.jpg",
    "piscine-vue": "gal__palais-des-sables-maroc-taroudant_13.jpg",
    "bassin-nuit": "gal__palais-des-sables-maroc-taroudant_19.jpg",
    "patio-nuit-2": "gal__palais-des-sables-maroc-taroudant_22.jpg",
    "patio-nuit-3": "gal__palais-des-sables-maroc-taroudant_7.jpg",
    "bassin-detail": "gal__palais-des-sables-maroc-taroudant_28.jpg",
    "bassin-porte": "gal__palais-des-sables-maroc-taroudant_5.jpg",
    "jardin": "gal__palais-des-sables-maroc-taroudant_29.jpg",
    "piscine-remparts-2": "gal__palais-des-sables-maroc-taroudant_43.jpg",
    "palmier-remparts": "gal__palais-des-sables-maroc-taroudant_11.jpg",
    "merlons": "gal__palais-des-sables-maroc-taroudant_10.jpg",
    "terrasse-panorama": "gal__palais-des-sables-maroc-taroudant_15.jpg",
    "terrasse-remparts": "gal__palais-des-sables-maroc-taroudant_38.jpg",
    "terrasse-haute": "gal__palais-des-sables-maroc-taroudant_31.jpg",
    "terrasse-vue-bassin": "gal__palais-des-sables-maroc-taroudant_3.jpg",
    "terrasse-plantes": "gal__palais-des-sables-maroc-taroudant_39.jpg",
    "terrasse-lanternes": "gal__palais-des-sables-maroc-taroudant_46.jpg",
    "terrasse-claustra": "gal__palais-des-sables-maroc-taroudant_47.jpg",
    "terrasse-jardin": "gal__palais-des-sables-maroc-taroudant_48.jpg",
    "tente-terrasse": "gal__palais-des-sables-maroc-taroudant_37.jpg",
    "patio-fleuri": "chambre-l__b_2.jpeg",
    "piscine-plongee": "chambre-l__b_1.jpeg",
    "terrasse-nuit": "chambre-l__b_4.jpeg",
    "piscine-table": "chambre-l__b_6.jpeg",
    "bassin-lanterne": "chambre-l__b_7.jpeg",
    "terrasse-merlons": "chambre-l__b_8.jpeg",
    "terrasse-ruelle": "chambre-l__b_11.jpeg",
    # Intérieurs
    "salon-cheminee": "gnvimg__nvimg-003-min.jpg",
    "salon-panorama": "gnvimg__nvimg-004-min.jpg",
    "salon-lanterne": "gnvimg__nvimg-021-min.jpg",
    "salon-portraits": "gnvimg__nvimg-023-min.jpg",
    "salon-feu": "gal__palais-des-sables-maroc-taroudant_17.jpg",
    "salon-jaune": "chambre-l__b_9.jpeg",
    "salle-niches": "gnvimg__nvimg-005-min.jpg",
    "salle-a-manger": "gnvimg__nvimg-006-min.jpg",
    "salle-niches-nuit": "gal__palais-des-sables-maroc-taroudant_23.jpg",
    "salle-manger-jour": "gal__palais-des-sables-maroc-taroudant_34.jpg",
    "salle-table-rouge": "chambre-l__b_20.jpg",
    "escalier": "gnvimg__nvimg-007-min.jpg",
    "vasque-cuivre": "gnvimg__nvimg-008-min.jpg",
    "porte-nuit": "gnvimg__nvimg-019-min.jpg",
    "moucharabieh": "gnvimg__nvimg-020-min.jpg",
    "table-chandelles": "gnvimg__nvimg-022-min.jpg",
    "diner-nuit": "gal__palais-des-sables-maroc-taroudant_16.jpg",
    "couloir": "gal__palais-des-sables-maroc-taroudant_14.jpg",
    "salon-rouge": "gnvimg__nvimg-011-min.jpg",
    "salon-rouge-detail": "gnvimg__nvimg-012-min.jpg",
    "salle-eau": "gal__palais-des-sables-maroc-taroudant_36.jpg",
    "massage": "gal__palais-des-sables-maroc-taroudant_41.jpg",
    "service-tajine": "gal__palais-des-sables-maroc-taroudant_4.jpg",
    "poisson-feu": "gal__palais-des-sables-maroc-taroudant_40.jpg",
    "the-menthe": "gal__palais-des-sables-maroc-taroudant_21.jpg",
    "velos": "gal__palais-des-sables-maroc-taroudant_42.jpg",
    "tortue": "gal__palais-des-sables-maroc-taroudant_1.jpg",
    "tortue-bassin": "gal__palais-des-sables-maroc-taroudant_27.jpg",
    "couloir-ambre": "chambre-l__b_10.jpeg",
    "rideau-terrasse": "chambre-l__b_12.jpeg",
    "chambre-ambre": "chambre-l__b_3.jpeg",
    # Chambres
    "kasbah-lit": "gnvimg__nvimg-015-min.jpg",
    "kasbah-lit-2": "chambre-l__b_1.jpg",
    "bounouna-lit": "gnvimg__nvimg-010-min.jpg",
    "bounouna-portrait": "gnvimg__nvimg-009-min.jpg",
    "bounouna-salon": "chambre-l__b_15.jpg",
    "bounouna-vasque": "chambre-l__b_18.jpg",
    "saadienne-lit": "gnvimg__nvimg-001-min.jpg",
    "saadienne-lit-2": "chambre-l__b_12.jpg",
    "saadienne-vasque": "chambre-l__b_14.jpg",
    "saadienne-entree": "chambre-l__b_2.jpg",
    "berberes-lit": "gnvimg__nvimg-002-min.jpg",
    "berberes-lit-2": "chambre-l__b_6.jpg",
    "berberes-vasque": "chambre-l__b_7.jpg",
    "atlas-lit": "chambre-l__b_8.jpg",
    "atlas-lit-2": "chambre-l__b_9.jpg",
    "atlas-tableaux": "chambre-l__b_11.jpg",
    "atlas-portes": "chambre-l__b_3.jpg",
    "atlas-douche": "chambre-l__b_10.jpg",
    "tiout-lit": "chambre-l__b_21.jpg",
    "tiout-palmier": "chambre-l__b_4.jpg",
    "tiout-douche": "chambre-l__b_17.jpg",
    "remparts-vasque": "chambre-l__b_13.jpg",
    # Taroudant & environs
    "taroudant-remparts": "gal__palais-des-sables-maroc-taroudant_18.jpg",
    "remparts": "gal__palais-des-sables-maroc-taroudant_12.jpg",
    "souk": "gal__palais-des-sables-maroc-taroudant_33.jpg",
    "randonnee-atlas": "gal__palais-des-sables-maroc-taroudant_35.jpg",
    "oasis": "gal__palais-des-sables-maroc-taroudant_44.jpg",
    "palmeraie-tente": "gal__palais-des-sables-maroc-taroudant_9.jpg",
    "palmeraie-homme-bleu": "gal__palais-des-sables-maroc-taroudant_8.jpg",
    "ane-palmeraie": "gal__palais-des-sables-maroc-taroudant_20.jpg",
    "vallee-atlas": "idee__Taroudant-min.jpg",
    "dromadaire": "idee__palmeraie-de-Tiout-min.jpg",
}

def main(src):
    src = Path(src)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for slug, name in MAP.items():
        im = ImageOps.exif_transpose(Image.open(src / name)).convert("RGB")
        # Étalonnage commun : saturation légèrement retenue, contraste à peine relevé
        im = ImageEnhance.Color(im).enhance(0.86)
        im = ImageEnhance.Contrast(im).enhance(1.03)
        w, h = im.size
        sizes = sorted({min(w, 720), w})
        for tw in sizes:
            th = round(h * tw / w)
            out = im if tw == w else im.resize((tw, th), Image.LANCZOS)
            out.save(OUT / f"{slug}-{tw}.webp", "WEBP", quality=82, method=6)
        manifest[slug] = {"w": w, "h": h, "sizes": sizes}
    # Image de partage (Open Graph)
    og = ImageOps.exif_transpose(Image.open(src / MAP["piscine-remparts"])).convert("RGB")
    og = ImageEnhance.Color(og).enhance(0.86)
    og.resize((1200, round(og.height * 1200 / og.width)), Image.LANCZOS).save(OUT / "og.jpg", quality=84)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(len(manifest), "images")

if __name__ == "__main__":
    main(sys.argv[1])
