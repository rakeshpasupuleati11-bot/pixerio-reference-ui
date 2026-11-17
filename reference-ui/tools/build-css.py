"""Rebuild the two CSS bundles from assets/css/src.  python tools/build-css.py"""
import os

BASE = os.path.join(os.path.dirname(__file__), "..", "assets", "css")
SITE = ["px.css", "tokens.css", "pagehead.css", "site-motion.css", "service.css", "editorial.css"]
HOME = ["hero7.css", "home-motion.css", "sequence.css", "spine.css"]
BANNER = "/* Pixerio bundle - generated from assets/css/src/*.css. Edit the sources. */\n\n"


def build(name, parts):
    body = BANNER + "\n".join(
        "/* ---- %s ---- */\n%s" % (p, open(os.path.join(BASE, "src", p), encoding="utf-8").read())
        for p in parts if os.path.exists(os.path.join(BASE, "src", p))
    )
    with open(os.path.join(BASE, name), "w", encoding="utf-8", newline="") as f:
        f.write(body)
    print("wrote", name, len(body) // 1024, "KB")


if __name__ == "__main__":
    build("site.css", SITE)
    build("home.css", HOME)
