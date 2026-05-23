# Changelog

All notable changes to ha.ggis Hub. Date-ordered, newest first. Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — 2026-05-23 design-review session

Cross-session foundation expansion. Every artifact passed `pnpm verify` (194/194 vitest, tsc strict, vite build, dist verify) and `cargo test --workspace --exclude hub-wasm`. Bundle stayed at 78 KB throughout.

### Added

- **`LICENSE`** — MIT, copyright Michael McMillan 2026. Unblocks engineer-audience forking; legalises `CONTRIBUTING.md`. Engineering primitives (C FNV-1a, WAT xoshiro128\*\*, signed-report orchestrator) now safe to reuse.
- **`DESIGN.md`** — full hub design system. Frame ported from sister project WHS's `DESIGN.md`; values are hub-specific. Namespaced colour tokens (surfaces / brand+action / semantic / art families / text family / narrative accents), typography (humanist serif default + pixel-font signage), grid (chrome rem + canvas integer pixel), motion, register policy (smooth default + pixel-font signage exception, deprecated Bayer-dither path noted), voice (locked phrases + open authorship budget), and a sister-comparison table showing the hub-vs-WHS family resemblance via shared canon nouns (peat, heather, whisky), not via shared hex.
- **`WRITEUP.md`** — engineer-portfolio writeup ready for HN / lobste.rs / personal blog. Architecture diagram, three-language FNV-1a table with canonical reference vectors, WAT xoshiro128\*\* note, signed-report explainer, 76 KB bundle math, security posture summary, reproduce-locally commands, honest "what's not polished yet" section.
- **`public/manifest.webmanifest`** — PWA manifest. `lang: en-GB`, theme-color matches `--hub-peat-brown`, name uses URL joke in description, inline SVG icon (matches existing favicon).
- **`public/og.svg`** — 1200×630 Open Graph card. Title block delivers the URL joke; Scots invite `awa' in →` carries voice; canon-correct haggis silhouette (v2: low ginger-brown oval body, asymmetric cream mane drape with strands breaking outline, four leg stubs, tail tuft, forward snout, eye-with-catchlight). Doubles as visual reference for the future in-scene sprite rebuild.
- **`public/og.png`** — generated 1200×630 PNG via `pnpm rasterize:og` (uses `sharp`). Twitter / X compatibility. Single source of truth: `og.svg`.
- **`scripts/rasterize-og.mjs`** — SVG→PNG converter via `sharp`. Run on any `og.svg` change.
- **`scripts/smoke-visual-gate.mjs`** — perceptual visual gate via aHash (16×16 grayscale → 256-bit hash) + Hamming distance with per-scene tolerance. Capture and verify modes. Catches palette and layout drift; absorbs particle-animation variance. The eye-gate the project's other gates couldn't see.
- **`scripts/run-visual-gate.mjs`** — build + `vite preview` + run smoke-visual-gate + teardown. Mirrors `run-determinism-smoke.mjs` so it slots into haggis-eval as the 11th subcommand.
- **`tests/golden/`** — visual gate goldens directory with `README.md` explaining how the gate works, when to capture vs verify, how to interpret DRIFT reports, how to swap aHash for pHash or pixelmatch later.
- **`tools/haggis-eval/internal/cmd/visual.go`** — `Visual()` gate; default mode verify, optional capture mode. Not yet in `All()` because verify needs a golden first.
- **`CHANGELOG.md`** — this file.

### Changed

- **`README.md`** — added load-bearing-five reading list (DESIGN.md now item 4), an "Engineering portfolio summary" section that lists every receipt (76 KB bundle, three-language FNV-1a, WAT xoshiro128\*\*, signed reports, A+ headers, ADR + autopilot discipline) with paths to each, and `node scripts/run-visual-gate.mjs` added to the gate commands.
- **`index.html`** — full social meta block: Open Graph (type, site_name, title, description, url, locale, image at /og.png, dimensions, alt), Twitter card large-image, theme-color matching `--hub-peat-brown`, color-scheme, canonical URL, manifest link, author meta, JSON-LD `WebSite` schema with author and MIT license link. `lang` upgraded from `en` to `en-GB`. Scots-tinted `<noscript>` fallback added.
- **`public/_headers`** — `Permissions-Policy` extended with `browsing-topics=()` (no Topics API) and `interest-cohort=()` (no FLoC).
- **`src/games/registry.ts`** — `future-bothy` title changed from `"Future Bothy"` to `"Comin' Wi' The Next Moon"`. Lobby voice now reaches the registry layer.
- **`src/navigation/launch.test.ts`** — test expectation updated to match new title.
- **`package.json`** — three new scripts: `pnpm rasterize:og`, `pnpm visual:capture`, `pnpm visual:verify`.
- **`tools/haggis-eval/main.go`** — `visual [verify|capture]` subcommand registered, listed in `--help`.

### Notable not-done (deferred, awaiting owner direction)

These were considered and explicitly skipped to avoid breaking existing behaviour, smoke-test timing, or to keep aesthetic decisions in owner hands:

- **Title card pre-bothy overlay** (UX direction owner should approve before shipping)
- **Haggis sprite rebuild in `canvas-room.ts`** (multi-day art job; canon silhouette is now locked in og.svg as visual brief)
- **Window dawn-sky repaint per ADR-0006** (art job)
- **Floor peat-stained oak plank repaint per ADR-0006** (art job)
- **Hearth register cleanup** (visual call between smooth-AA and pixel-hard registers)
- **Self-hosted display serif** (owner picks the typeface: Old Standard TT, IM Fell English, or Cormorant Garamond all named in DESIGN.md)
- **Reduced-motion change** (current behaviour is a deliberate owner choice; documented in DESIGN.md)
- **High-DPI canvas fix** (would change canvas dimensions; smoke tests assume current dims)
- **First `visual:capture`** (deliberate human act — owner runs once when art state is "this is correct")
- **Wire `visual` into `haggis-eval all`** (waits on the first capture)
- **WHS door visual differentiation in the scene** (small canvas-room.ts change; could land safely but owner sees iterations)

### Gates green at session end

```
pnpm verify          194/194 vitest, tsc strict, vite build, verify-dist OK
cargo --workspace --exclude hub-wasm: ok
go build .           clean
haggis-eval --help   visual subcommand registered
dist                 78 KB total (44 KB JS + 28 KB WASM + 4 KB CSS + 4 KB HTML)
                     + manifest.webmanifest + og.svg + og.png shipped
```
