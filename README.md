# Handoff: Polyphonic Archive — Huize Dina website

## Overview
A six-page memorial/archive website for **Polyphonic Archive**, a podcast about the girls of **Huize Dina** (a Jewish girls' home in Santpoort, NL, 1920s–40s). The centrepiece is an interactive **Timelines** page telling three life stories, and a pannable/zoomable **"The Making Of"** theme-map. The site must be **static-hostable on Netlify** and ship with a **back office (CMS)** so non-developers can edit all written content — timeline entries and the theme tree especially — after launch.

Pages: **Home · Podcast · Timelines · The Making Of · Team · Contact.**

## About the design files
The files in `design_reference/` are **design references created in HTML** — prototypes showing the intended look and behaviour, **not production code to copy verbatim**. They are authored in a bespoke streaming-component runtime (`support.js`, tags like `<x-dc>`, `<sc-for>`); **do not port that runtime**. Recreate these designs in a real, statically-exportable framework using its own idioms.

Each page opens directly in a browser. `Huize Dina - Offline Site.html` is a single-file offline build of all six pages with every image embedded — open it to see the whole site working end-to-end.

### Recommended stack (fits the Netlify + CMS + static requirement)
- **Astro** (or Next static export) for the site — content-driven, ships almost no JS by default, trivial Netlify deploy.
- **Decap CMS** or **TinaCMS** for the back office (`/admin`), committing to the Git repo. On Netlify both work; Tina's free cloud tier handles the editor login with least setup. This satisfies "a back office to edit content" with **no server/database** — edits become Git commits and Netlify redeploys.
- Content lives as flat files in-repo (see `content/`), which is exactly what a Git-based CMS edits.

Framework choice is the implementer's; the constraints are: static output, Netlify-deployable, and a Git-based CMS editing the content files below.

## Fidelity
**High-fidelity.** Colours, typography, spacing and interactions are final. Recreate the UI to match. Exact per-element values live in the `design_reference/` HTML; the key tokens are summarised under **Design Tokens**.

## Content (the source of truth for text)
`content/timelines.json` and `content/themes.json` hold the real, current copy extracted from the design. **Model your CMS collections on these shapes** so editors manage exactly these fields.

### content/timelines.json
Array of 3 timeline objects, in display order **de Jong (I) → Engers (II) → Swaab (III)**:
```
{ slug, episode ("I"|"II"|"III"), name, title, years,
  events: [ {
    date_iso,        // "1936-03-23" or null
    date_label,      // display string e.g. "23 Mar. 1936" (used as-is when present)
    serial,          // legacy numeric date for undated-but-ordered events; keep OR migrate to date_iso
    heading,         // short bold headline
    text,            // paragraph body
    sister,          // ENGERS ONLY: "mina" | "sara" | "both" — drives the per-card tag + jump links
    image: { file, caption, full, focus, zoom } | absent
  } ] }
```
- `image.file` points into `assets/timeline/…` (see Assets). `full:true` = show at natural size (portrait); `focus`/`zoom` are optional CSS object-position / scale hints for tightly-cropped scans.
- Events render in `serial`/`date_iso` order, alternating left/right of a central spine.
- **CMS:** a "Timelines" collection (3 entries) each with a repeatable, reorderable "events" list; `sister` is a select shown only on the Engers entry.

### content/themes.json
The "Making Of" map data:
```
{ regionColors,
  nodes: [ { id, number ("1.3.2.1"), label, level (-1..3), parent, blurb, questions[], authors } ],
  crossLinks: [ { from, to, note } ] }
```
- A **self-referential tree** (each node names its `parent`). Arbitrary depth. Top-level ancestor (level 0) sets the colour region.
- `crossLinks` are non-tree relationships drawn as secondary connectors between nodes.
- **CMS:** one "Themes" collection where each item has `label, parent (ref), order, blurb, questions[], authors`. Editors add/rename/re-nest freely.

## Screens / Views

### Shared masthead (all pages)
Fixed top bar, background `rgba(44,40,48,0.97)`, 1px bottom border `rgba(255,255,255,0.07)`.
- Brand "Huize Dina" (link to Home): **16px**, letter-spacing `.22em`, uppercase, colour `rgba(224,219,212,0.92)`, hover `#48C6A8`.
- Nav row below it, gap `1.35rem`: links **14px**, letter-spacing `.15em`, uppercase, `rgba(224,219,212,0.62)`, hover `#48C6A8`; active page is `#48C6A8` with a 1px `rgba(72,198,168,0.55)` underline.
- Order: Home · Podcast · Timelines · The making of · Team · Contact.
- Mobile (≤680px): reduce padding to `0.7rem 1rem`, nav gap `0.9rem`.

### Timelines (`Polyphonic Archive.dc.html`) — primary screen
- **Background:** fixed `#2c2830` with a very faint (opacity ~0.04) SVG-noise overlay and a faint full-bleed collage of archive/blueprint photos behind everything (`pa-bg`, opacity 0.88, darkened by a radial vignette). Collage is decorative.
- **Hero (centered):** small mono eyebrow "Episode {I/II/III}"; large serif-less mono **title** (`pa-hero-title`, ~48px desktop / 1.5rem mobile); year range beneath in muted mono.
- **Episode switcher:** three tabs side-by-side in one row (`de Jong` / `Engers` / `Swaab`). Each tab: "Episode N" (mono, muted) + name (larger) + years (muted). Active tab has a teal-tinted panel + border; clicking switches timeline and updates the URL hash (`#dejong`/`#engers`/`#swaab`).
- **Engers only — sister links:** under the hero, "Two sisters, one file — Mina · Sara". Each is a button (14px, `.2em`, uppercase, teal underline) that smooth-scrolls to that sister's first event and briefly flashes the card outline. Per-event cards show a small tag: "Mina", "Sara" or "Mina & Sara" (from `event.sister`).
- **Timeline body:** vertical spine (1px, centred, `rgba(255,255,255,0.18)`); year rulers along it (13px mono, `rgba(255,255,255,0.34)`). Events alternate sides. Each event:
  - A **node dot** on the spine (10px circle, 1px `rgba(72,198,168,0.75)` border, teal-tinted fill) with the **date** beside it — **20px, weight 700**, letter-spacing `.08em`, colour `rgba(58,168,190,0.8)`, `JetBrains Mono` (13px on mobile).
  - A **card** offset 112px from the spine, connected by a 60px horizontal line. Card body copy: **15px**, `rgba(224,219,212,0.82)`, line-height 1.8. Optional image with italic caption below. On ≤680px the spine shifts to the left edge (28px) and cards stack full-width (`calc(100vw - 74px)`), connectors hidden.
  - **Image lightbox:** clicking any event image opens a full-screen zoom overlay (`sz=w2400` in the prototype; use a higher-res source or the same file) with caption; click anywhere to close.
- **Year gauge:** fixed bottom-right mono readout of the earliest year in view.

### The Making Of (`Making Of Map.dc.html`)
- Full-screen **pannable/zoomable canvas** (drag to pan, scroll to zoom) on a dark ground with an intro overlay ("A map of the themes behind the podcast"; enter button).
- Nodes are positioned in a **world space** and connected by SVG lines: solid lines = parent→child ("belongs to"); a second style = the `crossLinks`. Deeper levels reveal as you zoom in.
- Node type scales by level: root ~124px, region (lvl 0) ~84px, lvl1 ~44px, lvl2 ~36px, lvl3 ~31px; region colour from `regionColors`.
- Clicking a node opens a **reading panel**: breadcrumb path, title, blurb, guiding `questions`, `authors` credit, and a "Sub-themes" list that navigates deeper.
- **Layout note (important for the CMS):** the prototype stores hand-placed `wx,wy` per node. For editability, **do not** surface coordinates in the CMS. Compute node positions with an **automatic layout** (radial/force-directed tree grouped by region) from the parent/child structure, so adding or re-nesting a theme in the back office "just works" and needs no manual placement. Optionally allow an admin drag-to-pin later. The `wx,wy` in the reference are only a visual target for the auto-layout's feel.

### Home / Podcast / Team / Contact
Same masthead + dark palette. Home: hero + intro + a couple of archive photos (album crops, the Duinlustparkweg building). Podcast: episode listing/links. Team: contributor portraits + names/roles. Contact: contact details. See each `design_reference/*.dc.html` for exact copy and layout; these are lower-complexity and content-driven — expose their body text and images as editable page content in the CMS.

## Interactions & Behaviour
- **Episode switch:** updates active timeline + URL hash; deep-links (`#engers`) select on load.
- **Sister jump (Engers):** smooth scroll to first matching event + ~1s outline flash.
- **Image lightbox:** open on click, close on overlay click; larger source than the inline thumbnail.
- **Map:** pointer/drag pan, wheel zoom, node select → reading panel, breadcrumb back-navigation, level-of-detail reveal on zoom.
- **Reveal-on-scroll:** timeline cards fade/rise in as they enter view (`.cd{opacity:0}` → animated in).
- **Responsive:** timeline reflows to a single left-aligned rail ≤680px; masthead condenses.

## State
- Timelines: `active` timeline index; `lightbox` (open image src+caption); transient "flashed" event id for sister jumps; hash sync.
- Map: selected node id; pan offset + zoom scale; intro/legend/panel-open flags.
- No global app state; each page is independent and content-driven.

## Design Tokens
**Colour**
- Page ground: `#2c2830`; body text: `#e0dbd4`.
- Primary accent (teal): `#48C6A8`; hover `#6fdec2`; muted teal `rgba(72,198,168,0.4–0.75)`.
- Timeline date blue-teal: `rgba(58,168,190,0.8)`.
- Muted text: `rgba(224,219,212,0.62)` (nav) / `0.82` (body) / `0.4` (eyebrows).
- Hairlines: `rgba(255,255,255,0.07–0.18)`.
- Map regions: root `#48C6A8`, Absence `#7E9AD0`, Storybuilding `#D7A957`, Translation `#4FC2A4`, Ethics `#D08A8E`; map gold accent `#F4CB7A`, map text `#F2EEE6`.

**Type**
- Everything is monospace: **Courier Prime** (Google Fonts: `Courier+Prime:ital,wght@0,400;0,700;1,400`) with `'Courier New',Courier,monospace` fallback. `JetBrains Mono` is used for dates/rulers/gauge — either load it too or standardise on Courier Prime.
- Masthead brand 16px `.22em`; nav 14px `.15em`; timeline date 20px/700 `.08em`; timeline body 15px / lh 1.8; hero title ~48px (1.5rem mobile).
- Uppercase + wide tracking for all labels/eyebrows/nav.

**Spacing / other**
- Card offset from spine: **112px** (desktop); connector length 60px; mobile spine inset 28px, card width `calc(100vw - 74px)`.
- Mostly square corners; subtle 1px borders; no heavy shadows. Faint film-grain + vignette over the timeline background.
- Breakpoint: **680px**.

## Assets
All images are included in `assets/timeline/` with **human-readable filenames** (already renamed from their original Google-Drive IDs) — nothing needs re-downloading. `content/timelines.json` references these exact paths.
- `dejong-*` (8): Huize Dina building, Tilly 1939 portrait, Garcia portrait, Beth San, Eikenstein Zeist, Mieke-father archival fragment, Pieter Schaap, Auschwitz station.
- `swaab-*` (8): Mina in reformatory 1927, Clasina Kruimel (×2), laundry 1932, Mina 1927, Henriette in Haarlem, Henriette with Haverschmidt, Kruimel with Caroline.
- `engers-*` (7): Engers children 1940, Levy (grandfather), Klara's tombstone, Utrecht orphanage, Apeldoornsche Bosch, Mina's council card, juvenile-file scan, Jeannette.
- Home/Team photos (album crops, building shot, portraits) are embedded in the offline build and in each `design_reference/*.dc.html`; extract from there if needed for those pages.
- Fonts: Google Fonts (Courier Prime; optionally JetBrains Mono) — self-host or link.

Rights note: these are archival/family photographs used for a memorial project. Preserve captions and credits (in `caption`); confirm usage rights before public deploy.

## Files in this bundle
- `content/timelines.json` — all three timelines' copy + image refs (CMS shape).
- `content/themes.json` — theme tree + cross-links for the map (CMS shape).
- `assets/timeline/*` — every timeline image, human-named.
- `design_reference/*.dc.html` — the six page prototypes (visual/behaviour reference; **not** to be shipped as-is).
- `design_reference/Huize Dina - Offline Site.html` — single-file working build of the whole site (open to see everything live).
- `design_reference/support.js` — the prototype runtime, **for reference only; do not port**.

## Build order (to spread cost / natural checkpoints)
1. Scaffold the static site + masthead + the four simple pages (Home/Podcast/Team/Contact) from `content` + reference.
2. Timelines page from `content/timelines.json` (episode switcher, alternating spine, lightbox, Engers sister tags/jumps, responsive rail).
3. Making Of map from `content/themes.json` with **auto-layout** (pan/zoom, reading panel, cross-links).
4. Wire the Git-based CMS (`/admin`) collections mirroring the two JSON shapes + page text; connect Netlify deploy.

## Implementation notes

Built with Astro (static output) + Decap CMS. The two JSON shapes above are
still the source of truth, but split into one file per entry so the CMS can
offer them as separate, editable records:
- `content/timelines/{slug}.json` — one file per timeline (was `content/timelines.json`).
- `content/themes/nodes/{id}.json` — one file per theme node (was the `nodes` array in `content/themes.json`); `content/themes/cross-links.json` and `content/themes/region-colors.json` hold the rest.
- `content/pages/*.json` and `content/team.json` are unchanged — object-rooted, so they map 1:1 to a Decap "file" collection.

**Run locally:** `npm install`, `npm run dev` (site) — `/admin` needs a build
first (`npm run build && npm run preview`) since the CMS bundle is vendored
into `public/admin/decap/` by a `prebuild`/`postinstall` script, not fetched
from a CDN.

**Deploy to Netlify:** connect the repo (build command `npm run build`,
publish `dist`, already set in `netlify.toml`), then in the Netlify
dashboard enable **Identity** and, under Identity settings, **Git Gateway**
— this is what `/admin`'s `git-gateway` backend logs editors in through, and
can only be turned on from Netlify's UI, not from this repo. Invite editors
under Identity → Invite users.
