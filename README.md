# pixerio-reference-ui

Static reference build of the Pixerio site — 18 HTML pages, one stylesheet, no build step.
Edited in place; every commit is visible in the history below.

## Live preview

https://rakeshpasupuleati11-bot.github.io/pixerio-reference-ui/reference-ui/

Served by GitHub Pages from `master`, so any push updates it within about a minute.

## Run locally

    cd reference-ui
    python -m http.server 5500 --bind 127.0.0.1

Then open http://127.0.0.1:5500/

## Structure

    reference-ui/            the site
      index.html             home
      17 section pages       about-us, blog, contact-us, case-study, ...
      assets/css/px.css      all styling
      assets/js/hero-bg.js   generative hero background
      assets/js/motion.js    entrance, reveals, magnetic controls, parallax
      prototype/             alternative hero studies, not linked from the site
    migration-url-map.csv    old URL -> new URL map
    .gitattributes           text normalised to LF

## Motion

Animations stop on the site's own motion toggle (`html[data-motion="paused"]`)
and under `prefers-reduced-motion`.

## Editing

    git add -A
    git commit -m "what changed"
    git push

Pages rebuilds automatically; reload the live URL to see it.
