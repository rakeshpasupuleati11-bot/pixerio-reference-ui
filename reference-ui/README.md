# Pixerio — reference UI (v2.0 "Signal")

A sign-off build of the Pixerio website, generated against **Pixerio Website Redesign
Master Strategy v1.2** (2 November 2026). Every rule it follows is cited to a section
of that document so a reviewer can check it line by line.

Open `index.html` through a local server (module scripts need `http://`, not `file://`):

```
python -m http.server 8123 --bind 127.0.0.1
```

---

## 0. v2.0 — the presentation layer that replaced v1.2

v1.2 was a clean but conventional light site (`system.css` + `hero-belt.css`). v2.0 keeps
**every word, image, link and route** and replaces only the design and interaction layer.
Sections 1–8 below still describe the content rules and the page map; the colour, type and
component rules in §2 are superseded by this section.

**Colour — the strategy's ratio, not a new one.** Master Strategy v1.2 §2 fixes the ratio at
**white 60 / logo blue 25 / logo green 15**. v2.1 applies it exactly: white `#FFFFFF` page,
`#F5F9FA` quiet sections, `#E7F2FA` panels, navy `#12324A` headings and dark bands, charcoal
`#1F2937` body, logo blue `#217FC3` for fills and large graphics with `#1F76B4` wherever blue
carries text, and logo green `#49AD48` only as a rule, mark or selected state. The logo itself
is reproduced as supplied — a multicoloured mark plus teal `#00B3BD` wordmark.

Measured contrast (WCAG 2.1): navy/white **13.28**, charcoal/white 14.68, blue-ink/white 4.87,
blue-ink/grey 4.60, green/navy 4.65, navy/grey 12.53. Logo blue on white is 4.30 (large text
only) and green on white is 2.86, so green is never set as text on white. All figures computed.

**Files**

| File | Purpose |
|---|---|
| `assets/css/px.css` | the whole design system: tokens, chrome, 33 component patterns, responsive rules |
| `assets/js/px.js` | entrance, masked line reveals, scroll reveals, counters, magnetic controls, cursor, ribbon loop, nav, persisted motion toggle |
| `px_apply.py` | applies the chrome (head assets, navigation, ambient layers, footer wordmark, page numeral, script) to every page; idempotent |
| `prototype/index-v1.7-original.html` | the untouched pre-v2.0 homepage, kept for diffing |

`system.css`, `hero-belt.css`, `app.js` and `hero-belt.js` are no longer referenced by any
page; they are left on disk as the v1.2 record.

**Motion.** Hero lines rise through a mask; headings split into two masked lines on load;
sections, cards, tiles, steps, quotes and rows reveal on entry with a 4-step stagger; the
number band counts up once; buttons and the primary CTA are magnetic on fine pointers; the
process rail fills with scroll; the client ribbon loops and pauses on hover; a difference-blend
cursor tracks the pointer. No animation library, no scroll-jacking, no continuous canvas —
the ambient field is two CSS radial gradients. `prefers-reduced-motion` and the header's
**Pause motion** control both remove all of it (the toggle persists in `localStorage` across
pages, `pixerio:motion`).

**Rebuild.** After editing any page, run `python px_apply.py` to re-apply the chrome
(it skips pages that already carry it). Content edits inside `<main>` never need it.

## 0b. v2.2 — spatial background, blue mass, signature sequence

Adds the architecture from `pixerio_background_responsive_system.md` — off-axis ambient light
fields, a 1px coordinate grid, film grain at 0.025, fluid breakpoints, `overflow-x: clip`,
1320px container — but renders it in the Master Strategy v1.2 palette. The note's own palette
(obsidian `#0A0D14` with `#00F0FF` neon) contradicts §2 of the strategy and was not applied;
it exists as an opt-in edition instead: set `<html data-theme="obsidian">`.

New in this pass: blue mass for the 25% share (logo blue CTA band at `#1F76B4`, `#E7F2FA`
work field), a pinned four-stage sequence on the homepage driven by scroll progress, media
that breaks the container edge on desktop, larger display type, tabular figures, a
cursor-following portfolio preview, scroll-velocity ribbon, root View Transitions, print
styles, a 404 route, and the logo set on a white plate in the footer so the supplied mark is
never recoloured.

Still blocked on assets, not code: 2x photography (files are 800x600), cleared client
permissions for the four quotes, and project imagery for 3D, video and learning.

---

## 1. What is in the build

| # | Page | Live path it mirrors | Section |
|---|------|----------------------|---------|
| 1 | `index.html` | `/` | §2.9 homepage treatment |
| 2 | `3d-visualization.html` | `/3d-visualization/` | §1.2 3D and immersive |
| 3 | `web-development.html` | `/web-development/` | §1.2 digital platforms |
| 4 | `multimedia-services.html` | `/multimedia-services/` | §1.2 video and motion |
| 5 | `graphic-design.html` | `/graphic-design/` | §1.2 brand and design |
| 6 | `e-learning.html` | `/e-learning/` | §1.2 learning |
| 7 | `digital-marketing-company.html` | `/digital-marketing-company/` | §1.2 search and marketing |
| 8 | `augmented-virtual-reality.html` | `/augmented-virtual-reality/` | §3.3 URL kept, folded into 3D |
| 9 | `about-us.html` | `/about-us/` | §1.1 six services, one story |
| 10 | `pixerio-portfolio.html` | `/pixerio-portfolio/` | §1.3 keep the portfolio |
| 11 | `case-study.html` | project template | §1.3 challenge / approach / result |
| 12 | `blog.html` | `/blog/` | article index |
| 13 | `article.html` | article template | heading ladder, one figure |
| 14 | `contact-us.html` | `/contact-us/` | §4.8 one action, named service |
| 15 | `thank-you.html` | post-submit | §4.8 three commitments |
| 16 | `privacy-policy.html` | legal | §3.6 consent mode |
| 17 | `terms.html` | legal | — |

Filenames follow the live WordPress slugs so the URL map in §3.3 is mechanical
(`/graphic-design/` → `graphic-design.html`).

---

## 2. The visual system (§2)

**Colour — white 60 / logo blue 25 / logo green 15**

```css
--white:#FFFFFF     page, card and content backgrounds
--blue:#217FC3      logo blue: fills, graphics, large type
--blue-ink:#1F76B4  AA-safe sibling: text, links, button labels
--green:#49AD48     logo green: rules, marks, selected states — never text
--navy:#12324A      headings, emphasis, footer
--grey:#F5F9FA      quiet section backgrounds
--soft:#E7F2FA      information panels
--charcoal:#1F2937  body copy
```

**Contrast fix, stated openly.** The two brand colours do not pass AA as text: logo blue
`#217FC3` measures **4.30:1** on white and logo green `#49AD48` measures **2.86:1**. The
document's own §2.8 says to check exactly this. So:

- `--blue` is kept exactly as specified for fills, icons and large type.
- `--blue-ink #1F76B4` (**4.87:1**) carries link text and every button label, so the primary
  CTA passes AA while still reading as the logo blue.
- green never carries text — only the 3px rule, badges and selected states.

Measured on the rendered pages: **0 contrast failures** across five templates.

**Type (§2.4)** — Inter, self-hosted, 400/500/600/700, preloaded, `font-display:swap`,
latin subset. Hero 48–64px/700, section 32–44/600, card 20–24/600, body 16–18/400,
nav 14–16/500, button 14–16/600, label 12–14/500.

**Grid (§2.5)** — 1200px max content, 12 columns desktop, 40–64px side margins, 8px rhythm
(4/8/16/24/32/48/64/96), cards 24–32px padding, sections 64–96 apart.

**Components (§2.6)** — primary blue + white label, secondary white + blue border, both
with default / hover / focus / disabled. Service cards: icon, title, two lines, one link.
Project cards: real imagery, title, one-sentence summary, category, link, one 4:3 ratio.
Information cards: white or soft blue, thin border, one green accent. Header: white,
original logo, short nav — no button in the bar. The single action sits at the end of the page.

**Logo (§2.3)** — the original `1026×381` PNG, never recoloured, redrawn or cropped.

---

## 3. Content carried over from the live site

Read from `pixerio.com` and migrated, not rewritten from scratch:

- **Service scope** — the real capability lists per service (`SCORM & AICC`, `K-12`,
  `blended learning`; `VFX`, `2D/3D animation`; `SEO`, `paid search`; …).
- **FAQs** — the actual questions published on each service page, with answers rewritten to
  be honest about price, timing and what the work cannot do. No figure is invented: where the
  live site quotes a cost or a turnaround, the answer says the number lives in the scope
  (§1.3, "every figure, award and client count gets checked").
- **Portfolio** — 22 real projects with their client names and imagery: Hitachi, Lamda
  Components, Takt, Yalgaar, Tripath Logistics, iQuant, Collezioni, Maple, Turaco, Snacs
  Constructions, SADA Money, CME, Cornucopia, NPS Agara, Pinti, Lakshmi Videos.
- **Capabilities** — the nine working capabilities from the live "What We Do" list.
- **Contact** — `info@pixerio.com`, `+91 99000 71841`, JC Nagar Bengaluru, the published
  360° studio tour.

What is **not** carried over: the live site's superlatives ("leading", "best", "renowned"),
its unverified counters, and its keyword-stuffed paragraphs. §1.3 and §4.2 both call for
evidence over adjectives, so the copy states outcomes instead.

---

## 4. Homepage, section by section (§2.9)

| Section | Treatment built |
|---|---|
| Header | White, original logo, short nav + Services menu, no CTA (one action per page, at the end) |
| Hero | Navy headline on white, two lines of copy, blue primary CTA |
| Services | White section, six cards from one structure |
| Selected work | Large project images, short case-study links |
| Process | Discovery → Implementation → Deployment, simple icons, restrained green |
| Trust | Testimonials with role and sector; name line marked pending permission |
| Final CTA | One enquiry action, in blue |
| Footer | Deep navy, same links as the header |

The hero is a **3D carousel of glass service cards** over a brand-coloured light ribbon —
CSS 3D only, no canvas, no WebGL, no JavaScript. See section 10.

---

## 5. Navigation and the one action (§1.2, §4.8)

Navigation stays split by service, but stays short: **Services** (a six-item panel showing
each service with what the client is buying) → Work → Insights → About → Contact, then the
then nothing else. On mobile the panel flattens into the list.

"Discuss Your Project" appears once per page, in the closing CTA band — the header carries
navigation only. Each service closes with its own §4.8 wording, and the button carries
`?service=<slug>` so the enquiry form arrives with the service already selected:

| Service | Button |
|---|---|
| 3D and immersive | Have a product or a space to present? Talk to us about 3D visualisation. |
| Digital platforms | Planning a website or platform? Tell us what the business needs it to do. |
| Learning | Building a learning programme? Let's talk content, interactivity and LMS. |
| Brand and design | Is your brand inconsistent? We'll review the touchpoints with you. |
| Video and motion | Need to explain something complicated? Start with a two-minute film. |
| Search and marketing | Not getting found? Let's look at what your site ranks for today. |

---

## 6. Technical (§3)

- WebP with JPEG fallback for all 22 project images, `width`/`height` on every `<img>`,
  `loading="lazy"` below the fold, hero poster `fetchpriority="high"`.
- Inter preloaded from the same origin; no font CDN.
- Hero text paints immediately — the H1 never waits on `IntersectionObserver`, because it is
  the LCP element (§3.2).
- JSON-LD on every page: `Organization` + `LocalBusiness`, plus `Service` on service pages,
  `Article` on the article template, `BreadcrumbList` on inner pages, `ContactPage`,
  `AboutPage`, `CreativeWork` where they apply (§3.3).
- One `<h1>` per page, semantic landmarks, skip link, visible focus rings, 44px targets.
- No horizontal overflow at 375 / 390 / 768 / 1024 / 1200 / 1440.
- Native `<details>` for FAQs — no JS required to read them.

---

## 7. Open items before launch

1. **Testimonial names.** Four quotes with role and sector; the name line is marked
   *"Name & permission pending"* until written permission exists (§1.3).
2. **Imagery for three services.** Video and motion, 3D and immersive, and learning have no
   project images anywhere on the current site. Those pages carry an evidence-pending panel
   rather than stock photography (§2.7).
3. **Case-study copy.** The template is built; challenge / approach / result need to be
   written with each client, and no result figure is published until it is verified.
4. **Legal pages.** Privacy and terms carry the structure and the honest parts (what the form
   collects, consent mode); retention, controller details and governing law need legal
   sign-off, and are marked rather than invented.
5. **The 60/25/15 split.** Held as white-dominant with green at accent strength. The
   document's own §2.1 says green "only works because it stays rare", which pulls against a
   literal 15% of green pixels — a client decision, not a build one.
6. **301 map.** `/web-development-company-in-bangalore/`, `/digital-marketing/`,
   `/multimedia/`, `/brand-identity-design/`, `/services/`, `/get-a-free-quote/` and
   `/seo-company-in-bangalore/` each need a redirect to the closest page in this build.

---

## 8. Style components adapted from the reference library (`ui 1.zip`)

**What the archive actually held.** 2,187 files, 1.47 GB: **974 WebP, 104 MP4, 5 MOV, 2 JPG,
2 GIF and zero HTML, CSS or JS files.** It is a visual reference library (two levels: `ui/` and
`ui/drill-down/`), not a component kit, so nothing could be dropped in as code. Only *style
attributes* were taken — no markup, no copy, no imagery, no video.

**Audit of the existing system before touching anything.** `system.css` (563 lines, 335 rules,
27 custom properties), `hero-3d.css` (66 lines), `app.js`, `hero-3d.js`, 17 templates and
`build_site.py`. Tokens in use: 8 colours, 7 type steps, 8 spacing steps, 3 radii, 11
breakpoints (480/560/620/700/760/820/860/900/960/980/1120). Conflicts found and settled before
adding anything:

- `.stats` existed in CSS but **no template rendered it** — its old `b { }` markup did not match
  anything. Rebuilt rather than extended, so no duplicate definition survives.
- `.card__icon` was a bare 34px SVG; card icons now sit in a chip, so the old size rule was
  replaced instead of layered over.
- `.tile__cat` was a plain text label; converted to a chip, so the two treatments cannot both apply.
- `.eyebrow .idx` was drafted and dropped unused — removed rather than left dead.

**Picked, and why**

| Component | Reference behaviour | Where it landed | Why it fit |
|---|---|---|---|
| Big-numeral proof band | Numbers set as the hero of the section, captions beneath, hairline separators | Home (after Selected work) and About | Fits §2.9's evidence-not-adjectives rule; the four figures are checkable against this build |
| Numbered index rows | Zero-padded number, label, one-line description, arrow, hairline dividers | "Other services" on all six service pages | Replaces a 3-card grid that duplicated the homepage's card family; rows read as a list without new copy |
| Icon chip | Small icon in a tinted square above the title | All six service cards | Answers §2.6 "icon or visual" without adding imagery |
| Category chip | Pill label under the caption | Work tiles | §2.6 requires a category on project cards; a chip carries it without competing with the title |
| Numeral scale | 0.94 line-height, −.045em tracking, tabular figures | Stat band | Reads as data, not decoration |

**Skipped, and why**

- **~1,700 mobile app screens** (the whole `drill-down/` set) — not a website.
- **Dark/glass hero treatments** — would break §2.2's 60% white and fight the existing hero field.
- **Square-corner cards** — the references' hard geometry reads cold next to the logo's rounded
  forms; the existing 12px radius family was kept.
- **The 104 motion clips** — decorative motion is what §1.4's INP budget warns about.
- **Every gradient mesh and 3D blob** — §2.7: "if a section needs fog and lens flare, it needs a
  better image."

No copy was lifted from any reference. The rows and stat captions use sentences already in this
build; the numerals are counts of our own content (6 services, 22 portfolio projects, 3 process
stages, 1 partner).

---

## 9. Capability wall — the effect from `ab76e53d…mp4`

The reference clip runs 4.5s at 60fps: a **staggered column wall of project tiles drifting
vertically at different speeds**, clipped by the frame, beside a static text panel whose
project index updates as tiles pass. Rebuilt for the six capabilities without copying any
of its content.

**Mechanics**

- Two columns of three cards, each column repeated once so the loop is seamless;
  `translate3d(0,0,0) → translate3d(0,-50%,0)` — transform only, no layout work.
- Three different durations (64s / 47s / 56s) with negative delays, so the columns never
  re-sync and the grid never reads as a single block. The middle column runs in reverse.
- The wall is clipped by `mask-image` (11% fade top and bottom) instead of hidden overflow,
  so cards dissolve into the page.
- The panel names the capability nearest the centre of the wall: numeral, title, one-line
  promise, and a six-step progress rail. Sampled every 450ms **only while the section is on
  screen and the columns are moving** — the interval stops on hover, on focus, and when the
  section leaves the viewport.
- The green active rule is an animation, not a transition, so it draws in and clears
  instantly — two cards can never show it at once.

**Fallbacks**

| Condition | Behaviour |
|---|---|
| Hover or keyboard focus in the wall | Columns pause; the interval stops |
| `prefers-reduced-motion: reduce` | No animation, no JS, clones hidden — a static 3×2 grid of six cards |
| Below 960px | Panel moves above, wall becomes a static 2-column grid, active state and rail hidden |
| No JS | Six static cards; the panel keeps the first capability |

**Content and access.** Every card is a real link to its service page. The duplicate set is
`aria-hidden` and `tabindex="-1"`, so only six links are reachable or announced. The panel is
`aria-hidden` too — it repeats what the cards already say, so it is decoration, not new
information.

---

## 10. Hero — a belt, a scanner, and six cards

The homepage hero is a conveyor. Six service cards drift left behind a vertical
scanner at the centre of the screen:

* **Right of the line** a card renders as a real service card — index, title,
  buyer sentence, first three deliverables, outcome.
* **At the line** the card is cut (`clip-path: inset(0 0 0 <cut>px)`) and comes
  apart into a grid-anchored particle cloud on a 2D canvas, with drifting sparks.
* **Left of the line** the scanner deposits that service's plate: the image
  arrives **background-free** — keyed to transparency where the source allows
  it — and stands beside the line with a `rotateY(-10deg)` tilt, a drop shadow
  and feathered edges, so it reads as an object in space rather than a pasted
  panel. The plate is pinned to the line while its card is consumed, then
  travels left with the belt and fades once it drifts clear.

Nothing is a video. The cards are DOM, the code is real text, the dissolve is
drawn every frame from the card's own position.

| Mechanism | Value |
|---|---|
| Card | `46vw × 48vh`, gap `4.75vw`, radius `1.6vw`, `container-type: inline-size` |
| Belt box | `top: calc(--top − 56px)`, height `--ch + 120px` — every overlay derives from it |
| Scanner | `top: calc(--pad-t − 10px)`, height `--ch + 20px`, centred on the belt |
| Badge | `top: calc(--pad-t − 50px)` — inside the belt's own header track |
| Auto speed | `-0.075 × innerWidth` px/s (108 px/s at 1440) |
| Hover | eases to `1`, slows the belt to 35% |
| Drag | pointer capture, `dx` onto the offset, velocity carried as inertia |
| Wheel | horizontal deltas only, `-deltaX × 6` |
| Wrap | `span = cw + gap`, `period = span × 6`, offset modulo period |
| Plate | no frame, no background; edge feather `radial-gradient`, fade to `24vw` (`30vw` mobile) |
| Particles | 3px grid in card-local space, `p = (1 - d/R)^1.7`, `R = 0.24 × cw` |
| Twinkle | 22% of cells blink at 9 Hz |
| Sparks | up to 3 per frame, 0.3–1.1s life, 60% of belt velocity |
| Canvas | device pixel ratio capped at 2 |

**Pause motion** freezes the belt where it stands and paints the dissolve once,
statically, so the composition stays legible. **Reduced motion** does the same
and never advances the belt; dragging still scrubs, so the comparison can be
inspected by hand.

Measured on the test machine: 60fps locked (median frame 16.7ms, p95 16.8ms),
free drift −110 px/s, hover −45 px/s, pause 0, reduced motion 0.

### Service plates — 3D renders

Each plate is a real 3D render, generated in the workspace and shipped as WebP
with an alpha channel, so the object floats with no background and no frame:

| # | Service | Form |
|---|---|---|
| 01 | 3D and immersive | knotted glass torus |
| 02 | Digital platforms | four floating slabs in perspective |
| 03 | Video and motion | a ribbon tube through frame |
| 04 | Brand and design | a fan of identity plates |
| 05 | Learning | stacked strata, one lit |
| 06 | Search and marketing | faceted sphere with orbital rings |

They are produced by `_tools/render3d.html`, a Three.js page that renders each
scene at 1324×745 with `alpha: true`, `ACESFilmicToneMapping` and a
`RoomEnvironment` PMREM map so the materials have something to reflect. Open it
on the local server, call `window.renderService(1..6)`, and save the returned
PNG. `_tools/` is a build tool and is excluded from the shipped archive.

Cards are generated from `SERVICES` in `build_site.py`, so their copy,
deliverables and routes come from the same data as the service pages.

## 10b. Cards are links

Every service card in the pinned sequence (and in the collapsed mobile grid) is a
click target: an `.pcard__hit` anchor stretched over the whole card, pointing at
that discipline's page —

| Beat | Card | Target |
|---|---|---|
| 01 | 3D and immersive | `3d-visualization.html` |
| 02 | Digital platforms | `web-development.html` |
| 03 | Video and motion | `multimedia-services.html` |
| 04 | Brand and design | `graphic-design.html` |
| 05 | Learning | `e-learning.html` |
| 06 | Search and marketing | `digital-marketing-company.html` |

The overlay is generated from the same `SERVICES` data as the rows, so the two
can never disagree. Each anchor carries an `aria-label` naming the destination,
shows a corner arrow at 45% opacity that fills on hover, and gets a 3px green
focus ring. The left-hand row links remain the primary keyboard path.

## 11. Motion language

**Read from the live site, by measuring it.** `manne.work` was scrolled in a headless
Chrome session with the DOM sampled at each step. What it actually does:

- Panels enter at `translateY(40px)` with `opacity 0` → `1`, and the panel *name* opens with
  `clip-path: inset(50%)` → `inset(0)` — a curtain reveal on the headline itself.
- Inside a panel the pieces stagger: count, then name, then lead, then the links.
- One section is **pinned**: the viewport holds while six beats pass — a numbered list lights
  row by row (`opacity .3 → 1`), a panel swaps per beat, a counter reads `01 / 05`, and a dot
  rail tracks position.
- The hero title moves at a different rate to the page (parallax) and the scroll cue slides in
  from the left.
- Almost no looping animation: transitions of 0.5–0.9s on one curve, driven by scroll.

That structure is now on this site. The previous pass only had fades/rises — too quiet to read
as a motion system, which is why it looked like nothing had changed.

### The pinned six-discipline sequence (home)

One beat per service, `6.55 × viewport` of scroll:

| Element | Behaviour |
|---|---|
| Left list | Six rows; the active row is full colour with an arrow, past rows sit at 62%, future rows at 30% |
| Right stage | One card cross-fades per beat: `translateY(46px) scale(.985)` → none, on the shared curve |
| Card name | Curtain reveal, `clip-path: inset(50% 0 50% 0)` → `inset(0)`, 900ms |
| Counter chip | `04 / 06` plus the discipline name, updating per beat |
| Dot rail | Six dots; the active one turns green and scales 1.7× |

Driven by one `requestAnimationFrame`-throttled read of the section's rect — no scroll listener
does layout work. Collapses to a static grid of the same six cards when the viewport is under
900px, when motion is paused, or under reduced motion, so all six remain reachable.

### Site-wide

- **Curtain reveals** on every section heading (`.sec-head h2`, `.pinsvc h2`, `.feature h2`) —
  the reference's signature. Added at runtime, before the observer starts; the H1 is excluded
  because it is the LCP element.
- **Variant reveals** per discipline (see the table below), now at 22–44px of travel rather
  than 12–18px, so the choreography is visible without becoming a bounce.
- **A reveal safety net**: one rAF-checked pass on scroll marks anything already on screen,
  because IntersectionObserver was silently missing targets inside the pinned container and
  leaving a heading clipped.

### Still true

One curve (`--mo-ease`), transform/opacity only, pause control that also unpins the sequence,
`prefers-reduced-motion` honoured globally, and the H1 painting on first frame.

**Reference audit.** `manne.work` is live (Manne IT Solutions). Its motion is deliberately
small: one easing curve declared once as `--ease-out: cubic-bezier(0.16,1,0.3,1)`, transitions
of 0.5–0.6s on `transform` and `color`, IntersectionObserver reveals, a **Pause motion** control,
a 01–06 numbered index in the navigation, a global `prefers-reduced-motion` kill-switch — and
only two keyframes in the whole stylesheet. Motion is transitional, never ambient.

That discipline is what was ported, using the curve specified for this project:
`cubic-bezier(0.22, 1, 0.36, 1)`, held in one token (`--mo-ease`). Everything animates
`transform` and `opacity` only.

**Six disciplines, six entrances.** Each service gets a variant instead of a shared fade:

| # | Discipline | Variant | Character |
|---|---|---|---|
| 01 | 3D and immersive | `depth` | 30px rise + 0.972 scale, 820ms — arrives from further back |
| 02 | Digital platforms | `grid` | 12px rise, 460ms — crisp, no scale drift |
| 03 | Video and motion | `fluid` | 12px lateral + 20px rise, 760ms — timeline travel |
| 04 | Brand and design | `editorial` | 22px rise, 640ms — measured |
| 05 | Learning | `stack` | 14px rise, 560ms — staged |
| 06 | Search and marketing | `metric` | 10px rise + 0.994 scale, 420ms — smallest, tightest |

Applied to the six capability cards, each service page's scope/info/FAQ blocks (keyed off
`data-disc` on `<body>`), work and case-study tiles, the process column, and the stat band.
Stagger is a single CSS variable, `--i`, at 70ms a step.

**Numbered index rhythm.** A CSS counter (`main { counter-reset: sec }`) numbers every
`.sec-head` — `01`, `02`, `03` down each page, above a hairline rule — and continues into the
blocks that use an eyebrow instead (`01 | What this covers`, `02 | How we work`). No markup,
no copy, no repeated numerals to maintain.

**Pause motion.** A control in the header on all 17 pages: `aria-pressed`, `aria-label`
that flips to "Play motion", label text that flips with it, and the choice persisted in
`localStorage`. Paused means ambient loops stop (`animation-play-state: paused` on the ring,
capability wall, marquee, ribbon, glass sheen), entrance animations complete rather than
freezing mid-fade, and every scroll reveal resolves to its finished state — nothing is left
invisible. Resuming marks already-seen blocks as settled instead of replaying them.

**Reduced motion.** `prefers-reduced-motion: reduce` is honoured globally and independently of
the toggle: reveals resolve, the ring and ribbon freeze, the hero copy is unaffected.

**Hero safety.** The H1 and page-head lead text are never gated by a reveal — they use a CSS
entrance animation only, so they paint on first frame regardless of JS, the toggle, or the
observer.

---

Build script: `build_site.py` (one template, 17 pages). Edit the `SERVICES`, `WORK` and
`QUOTES` data at the top, then `python build_site.py`.
