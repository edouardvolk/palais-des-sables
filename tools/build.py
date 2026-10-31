"""Assemble le site statique : src/ -> dist/.

Usage : python3 tools/build.py

Syntaxe disponible dans src/ :
  <!--meta ... -->               en tête de page : clé: valeur (title, description, page, header, scripts)
  {{ cle }}                      valeur issue des métadonnées de la page
  {% include nom %}              insère src/partials/nom.html
  {% img slug attr="…" %}        <img> responsive (srcset WebP, width/height) depuis assets/img/manifest.json
  {% full slug %}                URL de la plus grande déclinaison d'une image (lightbox)
  {% thumb slug %}               URL de la plus petite déclinaison (vignettes)
  {% nav page %}                 aria-current="page" si la page courante correspond
Aucune dépendance : bibliothèque standard Python uniquement.
"""
import json
import re
import shutil
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
ASSETS = ROOT / "assets"
SITE_URL = "https://www.palaisdessables.com"
MANIFEST = json.loads((ASSETS / "img" / "manifest.json").read_text())

TAG = re.compile(r"\{%\s*(\w+)\s+(.*?)\s*%\}", re.S)
VAR = re.compile(r"\{\{\s*(\w+)\s*\}\}")
ATTR = re.compile(r'([\w:-]+)="([^"]*)"')


def img_url(slug, width=None):
    m = MANIFEST[slug]
    return f"assets/img/{slug}-{width or m['sizes'][-1]}.webp"


def img_tag(args):
    slug, _, rest = args.partition(" ")
    m = MANIFEST[slug.strip('"')]
    slug = slug.strip('"')
    attrs = dict(ATTR.findall(rest))
    out = {
        "src": img_url(slug),
        "srcset": ", ".join(f"{img_url(slug, s)} {s}w" for s in m["sizes"]),
        "sizes": attrs.pop("sizes", "100vw"),
        "width": m["w"],
        "height": m["h"],
        "alt": attrs.pop("alt", ""),
        "loading": attrs.pop("loading", "lazy"),
        "decoding": "async",
    }
    out.update(attrs)
    return "<img " + " ".join(f'{k}="{v}"' for k, v in out.items()) + ">"


def render(text, meta, depth=0):
    if depth > 8:
        raise RecursionError("include trop profond")

    def tag(match):
        name, args = match.group(1), match.group(2).strip()
        if name == "include":
            part = (SRC / "partials" / f"{args.strip(chr(34))}.html").read_text()
            return render(part, meta, depth + 1)
        if name == "img":
            return img_tag(args)
        if name == "full":
            return img_url(args.strip('"'))
        if name == "thumb":
            slug = args.strip('"')
            return img_url(slug, MANIFEST[slug]["sizes"][0])
        if name == "nav":
            return ' aria-current="page"' if meta.get("page") == args else ""
        raise ValueError(f"balise inconnue : {name}")

    text = TAG.sub(tag, text)
    return VAR.sub(lambda m: str(meta.get(m.group(1), "")), text)


def parse_page(path):
    raw = path.read_text()
    meta = {"page": path.stem, "header": "transparent", "scripts": ""}
    head = re.match(r"\s*<!--meta(.*?)-->", raw, re.S)
    if head:
        for line in head.group(1).strip().splitlines():
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
        raw = raw[head.end():]
    return meta, raw


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    layout = (SRC / "layouts" / "base.html").read_text()
    pages = sorted((SRC / "pages").glob("*.html"))
    for path in pages:
        meta, body = parse_page(path)
        meta["content"] = render(body, meta)
        meta["scripts"] = "\n".join(
            f'<script src="assets/js/{s}.js" defer></script>' for s in meta["scripts"].split()
        )
        meta["title_attr"] = escape(meta.get("title", ""))
        meta["canonical"] = f"{SITE_URL}/{'' if path.stem == 'index' else path.name}"
        (DIST / path.name).write_text(render(layout, meta))
    shutil.copytree(ASSETS, DIST / "assets", ignore=shutil.ignore_patterns("manifest.json", ".DS_Store"))
    urls = "".join(
        f"<url><loc>{SITE_URL}/{'' if p.stem == 'index' else p.name}</loc></url>" for p in pages
    )
    (DIST / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n'
    )
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    print(f"{len(pages)} pages -> {DIST.relative_to(ROOT)}/")


if __name__ == "__main__":
    build()
