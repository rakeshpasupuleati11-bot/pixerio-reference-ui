# -*- coding: utf-8 -*-
"""Apply the "Signal" v2.0 design system chrome to every generated page.

What it does, per page (idempotent — safe to re-run):
  * swaps system.css / hero-belt.css for assets/css/px.css
  * replaces the <header class="site-header"> block with the new glass navigation
  * injects progress bar, aurora field, grain overlay and the custom cursor
  * inserts the oversized footer wordmark
  * drops the old app.js / hero-belt.js and adds assets/js/px.js

Content, sections, copy, images and links inside <main> are never touched.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
PAGES = sorted(p.name for p in ROOT.glob("*.html") if p.name != "index.html")

SERVICES = [
    ("3d-visualization", "3D and immersive", "Show a space or product before it exists."),
    ("web-development", "Digital platforms", "A digital tool that does a job, not a brochure."),
    ("multimedia-services", "Video and motion", "Explain the complicated part in 30 seconds."),
    ("graphic-design", "Brand and design", "One identity, everywhere it appears."),
    ("e-learning", "Learning", "Training that scales without losing quality."),
    ("digital-marketing-company", "Search and marketing", "Be found by people already looking."),
]

NAV = [("pixerio-portfolio.html", "Work"), ("blog.html", "Insights"),
       ("about-us.html", "About"), ("contact-us.html", "Contact")]

HEADER_MARK = "<!-- px:header -->"
FOOT_MARK = "<!-- px:footer-word -->"

NUMERALS = {
    "3d-visualization.html": "01", "web-development.html": "02",
    "multimedia-services.html": "03", "graphic-design.html": "04",
    "e-learning.html": "05", "digital-marketing-company.html": "06",
    "augmented-virtual-reality.html": "03", "pixerio-portfolio.html": "W",
    "about-us.html": "A", "contact-us.html": "C",
}


def header(page: str) -> str:
    menu = "".join(
        f'<a href="{slug}.html"><span>{name}</span><small>{buy}</small></a>'
        for slug, name, buy in SERVICES)
    links = ""
    for href, label in NAV:
        mark = ' aria-current="page"' if href == page else ""
        links += f'<a href="{href}"{mark}>{label}</a>'
    return HEADER_MARK + f"""
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="index.html" aria-label="Pixerio — home">
      <img src="assets/img/pixerio-logo.png" alt="Pixerio" width="1026" height="381" fetchpriority="high">
    </a>
    <nav class="nav" id="nav" aria-label="Primary">
      <div class="has-menu">
        <button class="nav__parent" type="button" aria-expanded="false" aria-controls="services-menu">
          Services <span class="chev" aria-hidden="true"></span>
        </button>
        <div class="menu" id="services-menu"><div class="menu__inner">{menu}</div></div>
      </div>
      {links}
    </nav>
    <a class="header-cta" href="contact-us.html">Discuss a project</a>
    <button class="motion-toggle" type="button" aria-pressed="false">
      <span class="motion-toggle__ic" aria-hidden="true"></span>
      <span class="motion-toggle__label">Pause motion</span>
    </button>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu"><span></span></button>
  </div>
</header>
<!-- /px:header -->"""


def transform(html: str, page: str) -> str:
    # 1. stylesheets
    html = re.sub(r'<link rel="stylesheet" href="assets/css/(system|hero-belt)\.css">\s*', "", html)
    if 'assets/css/px.css' not in html:
        html = html.replace("</head>", '<link rel="stylesheet" href="assets/css/px.css">\n</head>', 1)

    # 2. header — replace the old chrome, or the marked block, or insert if missing
    head_pat = re.compile(
        r'(?:<!-- px:header -->)?\s*<header class="site-header">.*?</header>\s*(?:<!-- /px:header -->)?',
        re.S)
    if head_pat.search(html):
        html = head_pat.sub(lambda m: header(page), html, count=1)
    elif '<header class="site-header">' in html:
        html = re.sub(r'<header class="site-header">.*?</header>', header(page), html, count=1, flags=re.S)
    else:
        html = html.replace('<main id="main">', header(page) + '\n<main id="main">', 1)

    # 3. ambient layers + progress, right after the skip link
    if 'class="aurora"' not in html:
        html = re.sub(
            r'(<a class="skip" href="#main">Skip to content</a>)',
            r'\1\n<div class="progress" aria-hidden="true"></div>\n'
            r'<div class="aurora" aria-hidden="true"></div>\n'
            r'<div class="grain" aria-hidden="true"></div>\n'
            r'<div class="cursor" aria-hidden="true"></div>',
            html, count=1)

    if 'class="grid-lines"' not in html:
        html = html.replace('<div class="grain" aria-hidden="true"></div>',
                            '<div class="grain" aria-hidden="true"></div>\n    <div class="grid-lines" aria-hidden="true"></div>', 1)

    # 4. footer wordmark
    if FOOT_MARK not in html:
        html = html.replace('<footer class="footer">',
                            '<footer class="footer">\n' + FOOT_MARK +
                            '\n  <div class="wrap"><p class="footer__word" aria-hidden="true">Pixerio</p></div>', 1)

    if 'footer__logo' not in html:
        html = re.sub(r'<img src="assets/img/pixerio-logo\.png" alt="Pixerio" width="1026" height="381" loading="lazy">',
                      '<span class="footer__logo"><img src="assets/img/pixerio-logo.png" alt="Pixerio" width="1026" height="381" loading="lazy"></span>',
                      html, count=1)

    # 5. scripts
    html = re.sub(r'<script src="assets/js/(app|hero-belt)\.js" defer></script>\s*', "", html)
    if 'assets/js/px.js' not in html:
        html = html.replace("</body>", '<script src="assets/js/px.js" defer></script>\n</body>', 1)
    if 'assets/js/motion.js' not in html:
        html = html.replace("</body>", '<script src="assets/js/motion.js" defer></script>\n</body>', 1)
    if 'assets/js/hero-bg.js' not in html:
        html = html.replace("</body>", '<script src="assets/js/hero-bg.js" defer></script>\n</body>', 1)

    # 6. first paragraph of a page head becomes the lead
    html = re.sub(r'(</h1>\s*)<p>', r'\1<p class="lead">', html, count=1)

    # 7. oversized index numeral in the page head (service pages)
    num = NUMERALS.get(page)
    if num and 'page-idx' not in html:
        html = re.sub(r'(<section class="page-head[^"]*"[^>]*>)',
                      r'\1\n  <span class="page-idx" aria-hidden="true">' + num + '</span>',
                      html, count=1)
    # 8. five-hue strip drawn from the mark, after every page head
    if 'class="spectrum"' not in html:
        strip = '<div class="spectrum" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>'
        html = re.sub(r'(</section>)', lambda m: m.group(1) + '\n' + strip, html, count=1)
    return html


def main():
    changed = 0
    for page in PAGES:
        p = ROOT / page
        src = p.read_text(encoding="utf-8")
        out = transform(src, page)
        if out != src:
            p.write_text(out, encoding="utf-8")
            changed += 1
            print("updated", page)
    print(f"{changed}/{len(PAGES)} pages updated")


if __name__ == "__main__":
    main()
