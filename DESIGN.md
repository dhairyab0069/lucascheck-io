# Lucas-Check: design

Written 2026-11-04 from what the page does now. Keep it current: every change gets a line in "Decisions and trade-offs".

## Purpose
Show the Lucas-Check project (a COSC 304 database course store, rebuilt on Next.js 16 and Postgres) by letting people use a small working copy of the store in the page, see the schema as a diagram, and compare the course version with the rebuild. Data lives in `assets/data.js`, the store logic in `assets/model.js`, rendering in `assets/app.js`, the diagram in `assets/diagram.js`.

## Theme choice and why
A shelf-paper, price-tag look: cream paper, heavy ink borders with hard offset shadows, tag red and sale-sticker yellow, condensed display type and monospace receipts. It fits a sporting-goods store and keeps a course project feeling hand-made. Dark mode is the same store at night: warm near-black paper, cream ink, brighter tag red and yellow; product photos keep their white stage in both.
Light, dark and auto are one shared setting: localStorage key `theme`, an early inline script sets `data-theme-mode` and `data-theme` before paint, a three-way radiogroup switches it, `themechange` is dispatched, the `storage` event syncs other pages, and the change plays a circle reveal with a soft cue (instant when motion is off).

## Tokens
Defined at the top of `assets/style.css`.

| Token | Light | Dark |
|---|---|---|
| `--paper` | `#f4ecda` | `#15110c` |
| `--card` | `#fffaf0` | `#272018` |
| `--ink` | `#1f1a14` | `#f3e9d2` |
| `--dim` | `#6a5f4f` | `#b7aa90` |
| `--line` | `#d8caa9` | `#4b3f2e` |
| `--tag` (red) | `#c9301a` | `#ff6a50` |
| `--sun` (yellow) | `#ffd23f` | `#ffd23f` |
| `--green` | `#176b47` | `#6fd3a0` |
| `--focus` | `#24324d` | `#8fb8ff` |

Type is system-only: `--head` (Avenir Next Condensed, Arial Narrow, Impact fallback), `--body` (system-ui), `--mono` (ui-monospace). Radius `--r` 14 px. Control tokens `--c-*` map these onto the symbol controls (2 px ink border, hard 3 px shadow, filled ink when on).

## Motion spec
- Gate: `html[data-motion="on|off"]` from the Motion control; off (or the system asking for reduced motion) kills every CSS animation and transition (the tag stays at its resting tilt), and the JS loops check `LucasDom.reducedMotion()`, which reads the same gate.
- What moves: the price tag sways, relation lines in the diagram flow and a dot travels along them (one `requestAnimationFrame` loop that stops when motion goes off), added-to-cart pop, row-count bump, the "then and now" wipe slider's intro sweep, the diagram's Play (hidden when motion is off; Step and Back remain), the theme reveal.
- Transform, opacity and stroke properties only; nothing flashes.

## Effects (the Effects control)
- Pointer glow: a soft sale-yellow light that follows the mouse or pen (not touch).
- Paper specks: about 18 (fewer on small screens, never more than 36) slow specks falling behind the content on one canvas; needs Effects and Motion; colour from `--kraft`, re-read on `themechange`.

## Sound spec
- Web Audio synthesis only (sine, triangle, square partials and filtered noise), no files, no requests. Master gain 0.28 into a compressor, 60 voice cap, short per-cue rate limits, silent while the tab is hidden.
- ON by default; the AudioContext is created and resumed at the first pointer, key or touch. The Sound control gates every cue.
- Cues: `add` (scanner beep), `remove`, `tab`, `login`, `error`, `register` (till drawer, paper rip, bell), `ship` (box thud and tape), `step` (diagram), `theme`, `reset`.

## Interaction inventory
| Where | Interaction | Feedback |
|---|---|---|
| Bottom-right dock | Light, Dark, Auto; Sound, Motion, Effects, Quiet everything | icon fill and glyph, live-region message, cue |
| Store | add and remove cart items, log in, check out, ship an order (admin), search and filter chips, tabs | scanner beep, till bell, shipping thud, error buzz, pop and count bump |
| Diagram | select a table, Step, Back, Play, era toggle | highlighted relations, flowing lines, travelling dot, ping per step, SQL shown |
| Then and now | wipe slider and timeline | clip reveal, intro sweep |
| Pointer | move | yellow glow, paper specks (Effects) |

## Accessibility notes
- Controls are real buttons with `aria-pressed`, a state-stating `aria-label`, a `title`, 44 px targets, a 3 px focus ring and different glyphs when off, so state is not colour alone. Quiet everything restores the exact previous state.
- Theme radiogroup with arrow keys; polite live regions for cart, diagram and controls; tabs use arrow keys; the diagram's tables are focusable buttons; there is a skip link.
- Reduced motion: the system setting starts Motion off and the control stays off.
- Text pairs are at least 4.5:1 in both modes. The dock is fixed bottom right and the page keeps 70 px of bottom padding so it never hides the last content.
- Small screens: the dock stays one row down to 390 px; the diagram scrolls sideways.

## Decisions and trade-offs
| Date | Decision | Why |
|---|---|---|
| 2026-11-04 | Text Sound pill moved out of the header; four symbol controls and the theme switch docked bottom right | one tidy fixed group that keeps working at 390 px, where the header could not hold seven buttons |
| 2026-11-04 | Defaults on, new keys `lucascheck2-sound/-motion/-fx` | owner's rule; an old saved "off" cannot carry over |
| 2026-11-04 | `LucasDom.reducedMotion()` now also reads the Motion gate, and the diagram's `reduce` became a function | one place decides, and the control works while the page is open |
| 2026-11-04 | Effects: glow and falling specks | the page had no decorative effects; the tag already sways, so a tilt effect would fight it |
| 2026-11-04 | Hard offset shadow and ink fill for the controls | matches the page's price-tag borders |

## How to extend
- New animation: transform or opacity, and the `data-motion` rule stops it; JS loops call `LucasDom.reducedMotion()`.
- New sound: add a function to `sounds` in `assets/sound.js` and call `Sfx.play("name")`.
- New effect: gate on `Ctl.state.fx` (and `.motion`) and listen for `ctlchange`; the config object is `window.CTL` in `index.html`.
- Tests: `npm test`. Audit: `node ~/.claude/skills/dynamic-web-design/scripts/check_site.js .`.
