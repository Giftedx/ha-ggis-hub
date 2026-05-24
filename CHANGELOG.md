# Changelog

All notable changes to ha.ggis Hub. Date-ordered, newest first. Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — 2026-05-24 canvas-aware paint metric + slice subcommand

Two carry-forward items closed in one session: (1) the canvas-aware paint metric flagged in the prior session's reflection, and (2) the `slice <name>` stub — the last unwired subcommand in `haggis-eval`. Slice 9 is now 9-of-9 wired, 0 stubs.

### Added — `hub:firstFrame` user-mark paint metric

- **`src/main.ts`** — after `room.render()` issues the first scene's draw commands, schedule `requestAnimationFrame(() => performance.mark('hub:firstFrame'))`. The mark fires inside the rAF callback so the compositor has posted the frame to the screen by then. This is the canvas-aware paint metric the bothy needed: chrome's built-in LCP heuristic doesn't score the canvas as a "contentful element" until something paints into it, but the canvas is blank until WASM boots + the first render call — so LCP collapses to FCP at whatever DOM text the page ships. `hub:firstFrame` measures the actual "you can see the bothy" moment a visitor experiences.
- **`scripts/smoke-paint-timing.mjs`** — `measureOnce` now reads `performance.getEntriesByName('hub:firstFrame', 'mark')` alongside the W3C paint + navigation entries. Median across 3 samples asserted against `paint.max_ms.hubFirstFrame`.
- **`perf-budgets.json` `paint.max_ms.hubFirstFrame`** — 2500ms (looser than LCP/load because it sits chronologically *after* WASM boot, which on slow CI runners can be ~1s). Local Windows median: 37–43ms (~2% of budget).

### Added — `slice <name>` subcommand and bundle config

- **`tools/haggis-eval/slices.json`** — schema-versioned bundle config. Three bundles shipped: `fast` (ts + perf, ~10s), `pre-merge` (ts + security + perf + browser + determinism + visual, ~40s), `release` (full release matrix minus the signed-report write). Filename note: spec called it `slices.toml`; pivoted to JSON because `haggis-eval` is stdlib-only Go and `encoding/json` is stdlib while TOML is not. Spec doc updated to reflect.
- **`tools/haggis-eval/internal/cmd/registry.go`** — `Registry()` returns the gate-ID → `GateRunner` map so the slice dispatcher can look gates up by name. New wired gates must be added here AND under main.go's subcommand switch — the two surfaces have separate use cases (CLI argv vs slice bundle membership).
- **`tools/haggis-eval/internal/cmd/slice.go`** — `LoadSlices`, `Slice`, `ListSlices`. Unknown slice name OR unknown gate ID inside a slice each produce a single `ERROR` result so the existing `printAndExit` PASS/FAIL handling carries through unchanged.
- **`tools/haggis-eval/internal/cmd/slice_test.go`** — 8 unit tests covering load (valid + missing file + bad schema + empty slices), dispatch (unknown slice + unknown gate + ordering + empty), and a Registry guard against silent drift (every gate ID referenced by shipped slices.json must exist in `Registry()`).
- **`tools/haggis-eval/main.go`** — `slice` case replaces the stub. `slice` with no name (or `slice list`) prints available bundles; `slice <name>` runs the bundle. `HAGGIS_SLICES_PATH` overrides the config path for tests / CI experiments.

### Changed

- **`tools/haggis-eval/main.go` usage block** — `Stubs` section deleted (none remain); `slice [name|list]` added to the wired-subcommands list.
- **`tools/haggis-eval/README.md`** — `perf` row now mentions `hub:firstFrame`; `slice` row rewritten from stub to full description.
- **`docs/plans/2026-05-22-implementation-sequence.md`** — Slice 9 heading: "8 real subcommands + 1 informational stub" → "9 real subcommands, 0 stubs"; outstanding stubs section reads "None" instead of listing `slice`; perf bullet describes the canvas-aware mark.
- **`docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md`** — slice config filename note: spec said `slices.toml`, project ships `slices.json` (stdlib reason).

### Gates green at session end

```
pnpm verify (fast PR gate)        ~20s
haggis-eval all (release gate)   ~3min   signed=0x8dccfca1c3d04a28
  rust/cargo-fmt + clippy + test         PASS
  ts/tsc-noemit + vitest + vite-build    PASS
  security/deploy-config                  PASS
  perf/build + bundle-budgets             PASS  (44.7 KB JS)
  perf/paint-timing                       PASS  (fcp 36ms, lcp 36ms, hubFirstFrame 37ms / 2500ms = 2%)
  browser/smokes-all (3 smokes)           PASS
  determinism/browser-replay-hash         PASS
  visual/verify                           PASS  (hamming 0/256 vs golden)
  differential/c-rust-hash                PASS
  differential/wat-rust-rng (100k fuzz)   PASS
```

Go tests added: 8 in `tools/haggis-eval/internal/cmd/slice_test.go` (slice load + dispatch + registry-guard).

## [Unreleased] — 2026-05-24 paint-timing perf gate

Closed the last carry-forward stub on the slice 9 `perf` gate: the Lighthouse paint-timing half. Hand-rolled via the existing Playwright dep + the W3C Paint Timing API directly through chromium-headless — no Lighthouse npm dependency added (matches [Hand-roll over library](https://en.wikipedia.org/wiki/Engineering_principle): use the primitive, not the vendor wrapper). Release gate is now 15 wired gates (was 14), still ~3.5min warm. Signed `0x5a89f65353c1bedd`.

### Added

- **`scripts/smoke-paint-timing.mjs`** — chromium-headless loads `${URL_BASE}?seed=42`, instruments via `PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })` injected pre-navigation, then reads the W3C Paint Timing API: first-paint, first-contentful-paint, largest-contentful-paint (last reported entry, renderTime preferred over startTime per spec), plus navigation-timing's `domContentLoadedEventEnd` and `loadEventEnd`. Takes 3 samples by default (`HAGGIS_PAINT_SAMPLES` overrides), aggregates by median (Lighthouse-style robust central tendency for shared CI runners), asserts each metric against the `paint.max_ms` block in `perf-budgets.json`. Exits non-zero with the offenders quoted; emits full per-sample JSON for the report.
- **`scripts/run-paint-gate.mjs`** — build dist → `vite preview` on port 4176 → run smoke → tear down. Mirrors `run-visual-gate.mjs`'s detached-on-POSIX + process-group-kill pattern so no orphan node processes survive CI cleanup.
- **`perf-budgets.json` `paint.max_ms`** — `firstContentfulPaint` ≤ 1200ms, `largestContentfulPaint` ≤ 2000ms, `domContentLoaded` ≤ 1000ms, `loadEvent` ≤ 2000ms. Tuned for chromium-headless on a GitHub-hosted runner (slowest reasonable environment in the gate set); on local Windows the median observed is 40ms FCP/LCP, ~15ms DCL/load — comfortably below budget. Headroom is ~30x because the budgets are lab numbers; real Cloudflare-served field numbers will be tighter, but the gate's job is to catch a regression, not benchmark.

### Changed

- **`tools/haggis-eval/internal/cmd/perf.go`** — `Perf()` now returns three results (build, bundle-budgets, paint-timing) instead of two. The Go orchestrator stays a thin shell-out wrapper; all gate logic lives in the `.mjs` scripts.
- **`tools/haggis-eval/main.go`** — usage block: `perf` description now reads "Bundle-size budgets + paint-timing".
- **`tools/haggis-eval/README.md`** — `perf` row now describes both halves and links to both scripts.
- **`docs/foundation/07-quality-gates.md`** — gate count 14 → 15 in the release-gate matrix code block; added `node scripts/run-paint-gate.mjs` next to `node scripts/perf-budgets.mjs`; dropped `lhci autorun` from the still-planned strictness list since paint-timing is now wired without it; "no Lighthouse runner" line removed from the unwired-items disclaimer.
- **`docs/plans/2026-05-22-implementation-sequence.md`** — Slice 9 `perf` bullet rewritten to describe both halves; gate count 14 → 15; "Lighthouse half" removed from outstanding stubs (only `slice <name>` remains).
- **`CONTRIBUTING.md`** + **`README.md`** — gate count and gate enumeration updated.

### Gates green at session end

```
pnpm verify (fast PR gate)        ~20s
haggis-eval all (release gate)   ~3min   signed=0x5a89f65353c1bedd
  rust/cargo-fmt + clippy + test         PASS  (~90s combined)
  ts/tsc-noemit + vitest + vite-build    PASS  (~7s)
  security/deploy-config                  PASS
  perf/build + bundle-budgets             PASS  (44.7 KB JS, +0.0 KB)
  perf/paint-timing (NEW)                 PASS  (fcp=40ms / 1200ms = 3%, lcp=40ms / 2000ms = 2%)
  browser/smokes-all (3 smokes)           PASS  (~11s)
  determinism/browser-replay-hash         PASS
  visual/verify                            PASS  (hamming 0/256 vs golden)
  differential/c-rust-hash                PASS  (~88s)
  differential/wat-rust-rng (100k fuzz)   PASS
```

## [Unreleased] — 2026-05-24 art reconciliation session

Closed the three art gaps flagged in WRITEUP.md against the locked Highland Dawn Bothy spec ([ADR-0006](docs/decisions/0006-hub-visual-direction-highland-dawn-bothy.md)): window, haggis silhouette, and floor. Visual golden rebaked, all 14 gates green, signed `0xada7e6f707ea9ded`.

### Added

- **`src/render/canon-haggis.ts`** — new haggis drawer keyed to [`public/og.svg`](public/og.svg) canon: low ginger-brown oval body (~3.5:1 W:H, dominant mass), asymmetric cream mane mass over the face side, irregular strands cascading past the body outline (the canon's defining silhouette break), black face skin protruding past the body's face edge, snout protruding past the face, eye half-hidden by mane fringe, ear poking up through mane top, tail tuft on the back end, heather-purple ground shadow. Faces right by default (toward the WHS door); `facingLeft` mirrors. Body palette shifted slightly warmer than the OG card so the haggis reads in the dim bothy register where the OG sits on a bright neutral. Replaces `whs-haggis.ts` (deleted — the WHS classic sprite was a stand-in).

### Changed

- **`src/render/whs-bothy.ts` `drawWhsWindowBay`** — replaced daytime loch-view contents (LOCH + MIST + green mountain triangles + small sun glow) with the ADR-0006 dawn sky: heather-purple shoulder at top, dawn-pink + dawn-peach bands at the horizon where the sun breaks, layered warm sun glow, far Highland silhouette in two layered peat-purple ridges, a wee scatter of dawn-cloud streaks. Wood frame, cross mullion, sill, and heather curtains preserved. Brightest band sits at the mountain ridge line — the "dawn breaks here" moment.
- **`src/render/whs-bothy.ts` `drawWhsBothyFloor`** — replaced flagstone substrate (vertical/horizontal mortar seams across stone blocks) with peat-stained plank floor per ADR-0006: alternating PEAT_MID + PEAT_DARK horizontal plank bands, INK + PEAT_SHADOW seams between, three faint grain lines per plank, hand-placed knots (deterministic, not random — preserves the visual-gate hash), foreshortening so planks grow taller toward the foreground. Warm hearth-glow wash overlay preserved.
- **`src/render/canvas-room.ts`** — call site swaps `drawWhsHaggis` → `drawCanonHaggis`, bumps `HAGGIS_SCALE` from 2 to 2.6 so the canon silhouette reads at the bothy lighting level, widens the contact-shadow footprint from 44 → 52 to match the wider canon body.
- **`tests/golden/bothy-idle-seed-42.png`** + **`visual-budgets.json`** — golden rebaked after intentional art change. New aHash `7c3efc3ffc3f7c3e8039e039e03060318033c003e00760066006e00760060000` at tolerance 18/256. Captured on Windows; Linux CI verification still cleared via the same OS-portable downscale path that worked for the prior golden.
- **`WRITEUP.md`** — "What's NOT polished (yet)" section rewritten as "Where the art now stands" to reflect closure of the three art gaps.

### Removed

- **`src/render/whs-haggis.ts`** — superseded by `canon-haggis.ts`. The WHS classic sprite (cute smiling face, white eyes, golden-brown procedural body) was a stand-in while the family canon was being clarified. ADR-0006 + [`reference_whs_haggis_drawer`](C:\Users\aggis\.claude\projects\C--Users-aggis-dev-active-ha-ggis-hub\memory\reference_whs_haggis_drawer.md) memory note (procedural-not-pixel-art) carried over into the new drawer; only the WHS-specific shape logic was dropped.

### Gates green at session end

```
pnpm verify (fast PR gate)        ~20s
haggis-eval all (release gate)   ~3min   signed=0xada7e6f707ea9ded
  rust/cargo-fmt + clippy + test         PASS  (~90s combined)
  ts/tsc-noemit + vitest + vite-build    PASS  (~7s)
  security/deploy-config                  PASS
  perf/build + bundle-budgets             PASS  (44.7 KB JS, +0.04 KB)
  browser/smokes-all (3 smokes)           PASS  (~13s)
  determinism/browser-replay-hash         PASS
  visual/verify                            PASS  (hamming 0/256 vs rebaked golden)
  differential/c-rust-hash                PASS  (~89s)
  differential/wat-rust-rng (100k fuzz)   PASS
```

## [Unreleased] — 2026-05-24 CI hardening session

Closed all three carry-forward items from the 2026-05-23 bring-up. Final release gate ~3min, signed `0x8c802fa20b6996b4`, 14 gates green (was 13).

### Added

- **`Visual("verify")` in `haggis-eval all`** — golden bootstrapped on Windows on 2026-05-23 verified cleanly on Linux CI (hamming distance 1/256, tolerance 18). aHash on a procedurally-rendered canvas + 16x16 grayscale downsample is OS-portable enough that the same golden works on both, as hoped.

### Changed

- **`.github/workflows/ci.yml`** — bumped Node-20-deprecated actions (`pnpm/action-setup` v4→v6, `actions/setup-go` v5→v6, `actions/upload-artifact` v4→v7). Removes the Node-24-forcing-deadline warning that GitHub flagged for 2026-06-02.
- **`scripts/run-browser-smokes.mjs`** + **`run-determinism-smoke.mjs`** + **`run-visual-gate.mjs`** — `detached: true` on POSIX so the spawned `pnpm exec vite preview` (shell-wrapped) becomes its own process-group leader; tear-down sends `SIGTERM` to the whole group via `process.kill(-pid)` rather than just the shell wrapper. Eliminates the four `Terminate orphan process: pid (XXXX) (node)` lines that appeared at job cleanup of every previous green run. Windows path unchanged (`detached: isPosix` short-circuits).

### Gates green at session end

```
pnpm verify (fast PR gate)        ~20s
haggis-eval all (release gate)   ~3min   signed=0x8c802fa20b6996b4
  rust/cargo-fmt + clippy + test         PASS
  ts/tsc-noemit + vitest + vite-build    PASS
  security/deploy-config                  PASS
  perf/build + bundle-budgets             PASS
  browser/smokes-all (3 smokes)           PASS
  determinism/browser-replay-hash         PASS
  visual/verify (NEW)                     PASS (hamming 1/256, tolerance 18)
  differential/c-rust-hash                PASS
  differential/wat-rust-rng (100k fuzz)   PASS
```

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
