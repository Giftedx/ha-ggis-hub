# Changelog

All notable changes to ha.ggis Hub. Date-ordered, newest first. Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — 2026-05-23 CI bring-up session

First public push of the repository (private mirror at github.com/Giftedx/ha-ggis-hub). Initial CI was red four times in a row; sequenced fixes from "won't start" through "release gate hangs invisibly" to a fully green run with signed report `0xd6e4bda3f111a7cf`.

### Added

- **`LICENSE`** + **`.github/workflows/ci.yml`** — MIT, plus two-tier CI: `pnpm verify` as the sub-30s PR gate and `haggis-eval all` (cargo workspace + ts + security + perf + browser + determinism + differential hash/rng + signed JSON report) as the release gate on push-to-main. Concurrency: cancel-in-progress on the same ref.
- **`tests/golden/bothy-idle-seed-42.png`** + **`visual-budgets.json`** — first capture of the perceptual visual-gate golden so `pnpm visual:verify` works from a cold clone. aHash `7c3cfc3ffc3f7c3e80398039e03bf033e033c003e00760066006e00740020000` at tolerance 18/256. Captured on Windows chromium; a Linux re-capture may be needed before wiring `visual` into `haggis-eval all`.
- **`@types/node@22`** devDependency — required for clean `tsc --noEmit` on a frozen-lockfile install (the local node_modules had it hoisted; CI didn't).
- **`gate.RunWithTimeout`** + per-gate `[gate]` streaming progress lines in `tools/haggis-eval/internal/gate/gate.go` — previous gate runs buffered all stdout/stderr and had no timeout, so a hung browser smoke was invisible until the whole CI job hit GitHub's 6-hour limit. Default budget 10min; 20min for `differential/wat-rust-rng` (100k-case proptest fuzz).

### Changed

- **`.gitignore`** — exclude `.serena/` (Serena MCP local state) + `docs/research/refs/` (170MB of local-only reference images) + `docs/research/*.zip`.
- **`tsconfig.json`** — `lib` adds `ESNext.Disposable` (rolldown's `.d.mts` references `Symbol.asyncDispose`); `types` adds `"node"` so `node:*` imports in vite's d.ts resolve under the explicit type-package whitelist.
- **`.github/workflows/ci.yml`** — drop `with: version: 10` on `pnpm/action-setup` (clashed with package.json's `packageManager: pnpm@10.12.1` and aborted setup); disable `actions/setup-go` module cache (haggis-eval is stdlib-only, no go.sum).
- **`scripts/run-browser-smokes.mjs`** — explicit `process.exit(0)` after success. Without it the orphaned `vite preview` grandchild kept Node's event loop alive after `preview.kill('SIGTERM')` killed only the shell wrapper; sister scripts already exit explicitly.

### Notable not-done (carried forward)

- **Wire `visual` into `haggis-eval all`** — golden was captured on Windows; need a Linux capture before adding to `all` or the perceptual diff will likely false-trip in CI. Carried from the design-review session.
- **Kill preview process group cleanly** — `preview.kill('SIGTERM')` with `shell: true` still leaks the vite grandchild (4 node orphans at job cleanup on the green run). Functional but not hygienic; needs detached spawn + process-group kill on POSIX.
- **Bump deprecated action versions** — `pnpm/action-setup@v4`, `actions/setup-go@v5`, `actions/upload-artifact@v4` are flagged as Node.js-20 actions. Forced to Node.js 24 by GitHub on 2026-06-02; until then, warnings only.

### Gates green at session end

```
pnpm verify (fast PR gate)        21s
haggis-eval all (release gate)  5m37s   signed=0xd6e4bda3f111a7cf
  rust/cargo-fmt, clippy, test          PASS  (2m29s combined)
  ts/tsc-noemit, vitest, vite-build     PASS  (9.2s)
  security/deploy-config                PASS  (0.8s)
  perf/build + bundle-budgets           PASS  (0.6s)
  browser/smokes-all (3 smokes)         PASS  (12s)
  determinism/browser-replay-hash       PASS  (7.1s)
  differential/c-rust-hash              PASS  (1m35s)
  differential/wat-rust-rng (100k fuzz) PASS  (3.8s)
```

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
