# Changelog

All notable changes to ha.ggis Hub. Date-ordered, newest first. Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — 2026-05-24 haggis walking animation + locked-door title prompt

Two renderer quality-of-life improvements with no dependency additions, no gate regressions, and no visual-golden impact (idle state is unchanged).

### Changed

- **`src/render/canvas-room.ts`** — Haggis now faces the direction of last horizontal movement and animates a gentle trot leg cycle (back/front pairs alternating at 3 Hz, ±3.9 canvas-px at scale 2.6) whenever the player is moving. Facing direction is sticky: it holds at the last direction moved and defaults to right on first render. Implementation: `prevPlayerX`/`prevPlayerY` closure state + delta threshold (>2 world units) drives `facingLeft` and `haggisIsMoving`, both threaded through `renderRoom` → `drawHaggis` → `drawCanonHaggis`. The `CanonHaggisFrame` fields `facingLeft`, `leftLegY`, and `rightLegY` were already defined but never wired from the renderer — this change uses them.
- **`src/render/canvas-room.ts`** — Locked-door interaction prompt now incorporates the door's title from the registry rather than a fixed generic line. Format: `"${doorTitle.toUpperCase()}\nCOMIN' SOON."`. Example: walking to the future-bothy door now shows `"COMIN' WI' THE NEXT MOON\nCOMIN' SOON."` instead of `"LOCKED. ANOTHER BOTHY, ANOTHER DAY."`. The `doorTitle` parameter in `formatPromptText` was already threaded through but unused for the locked branch.
- **`src/render/canvas-room.test.ts`** — Locked-prompt test updated to assert the title-aware format.
- **`src/render/canvas-room.ts`** — Fixed stale file-header comment that said the canvas buffer was `~320×180` with `image-rendering: pixelated`; actual values are `540×360` internal buffer with `image-rendering: auto` (correct for AA-smooth procedural art).

### Gates green at session end

```
pnpm verify (fast PR gate)        ~7s    194/194
run-browser-smokes.mjs            PASS   door-launch + door-tap + pointer-drive
run-visual-gate.mjs verify        PASS   hamming 3/8 (Windows vs Linux golden, unchanged)
```

## [Unreleased] — 2026-05-24 hand-rolled a11y gate shipped (gate matrix 15 → 16)

Closed the long-standing "a11y still planned" item from `docs/foundation/07-quality-gates.md` without taking on an axe-core / pa11y dep. The hub's a11y surface is small and stable enough (canvas-first SPA, one link, no forms, no images apart from CSS-painted SVG icons) that a focused list of 13 WCAG 2.2 AA spot-checks is more honest than wrapping a generic 80-rule engine. Bring-up surfaced one real bug (a `.scene-direct:focus-visible { outline: none }` rule that traded WCAG 2.4.7 compliance for visual cleanliness) and the gate now defends against its return.

### Added

- **`scripts/smoke-a11y.mjs`** — 13 hand-rolled WCAG 2.2 AA assertions against the preview build, organised by success criterion: 3.1.1 page language, 1.4.4 viewport zoom, 2.4.2 page title, 1.1.1 canvas accessible name, 4.1.2 interactive element accessible name (each `<a>`/`<button>`/`<input>` walked), 2.1.1 keyboard reachability (Tab from body lands on the direct-play link), 2.4.7 focus indicator visible (computed `outline-style` + `outline-width` + `box-shadow` read), 1.4.3 computed contrast ratio on every declared text pair. Contrast pairs include the prompt text on the translucent prompt plate (composited over the void backdrop), the sign label on the door sign wood, the noscript paragraph + fallback link, and the direct-play link in both resting and focused states. Self-contained — no axe-core or pa11y dep. Linear sRGB → relative luminance per WCAG 2.x.
- **`scripts/run-a11y-gate.mjs`** — harness that builds dist, starts vite preview on :4176, runs the smoke against it, tears down. Mirrors the run-visual-gate / run-paint-gate pattern so haggis-eval's `a11y` gate stays a thin shell-out wrapper.
- **`tools/haggis-eval/internal/cmd/a11y.go`** + `main.go` switch arm + `registry.go` entry — the Go-side wiring that exposes the gate as `haggis-eval a11y` and pulls it into the `slice` bundle dispatcher.

### Changed

- **`tools/haggis-eval/internal/cmd/all.go`** — `A11y()` appended between `Visual` and `Differential` so `haggis-eval all` (and the signed JSON report) now covers it. Gate count 15 → 16.
- **`tools/haggis-eval/slices.json`** — `pre-merge` and `release` bundles now include `a11y`. `fast` deliberately stays just `ts + perf` (fast = no browser tier).
- **`src/style.css`** — `.scene-direct:focus-visible` no longer sets `outline: none`. Replaced with a 2px solid `--hub-neeps-orange` outline + 3px offset + 2px border-radius. Colour-shift alone fails WCAG 2.4.7 in current AA guidance; the lantern-warm outline reads as part of the bothy palette. The hover style keeps the colour change without touching outline. Found by the new gate during bring-up.
- **`docs/foundation/07-quality-gates.md`** — current PR/release-gate section now lists 16 gates and the `node scripts/run-a11y-gate.mjs` line. Released the "Accessibility" item from "still planned" into the shipped budgets list; removed the "Lighthouse accessibility: still planned" bullet (the hand-rolled gate is the equivalent). Status header now names the no-axe-core dep policy.
- **`docs/architecture/evaluation-strategy.md`** + **`docs/architecture/testing-strategy.md`** — status headers and implementation-status paragraphs updated for the a11y eval. Testing pyramid bullet "3 smokes; accessibility still planned" → "3 smokes + a11y gate".
- **`docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md`** — §2.7 subcommand table and §5 gate matrix both gain an `a11y` row recording the as-shipped hand-rolled implementation (no-dep rationale parallel to the perf/paint-timing entries).
- **`docs/plans/2026-05-22-implementation-sequence.md`** Slice 9 — `a11y` listed alongside the other 15 wired subcommands; gate count 15 → 16. Records that bring-up drove the `outline: none` fix.
- **`docs/foundation/12-craft-commitments.md`** Section B Go role — a11y bullet added to the orchestration list with the no-axe-core note.
- **`README.md`**, **`WRITEUP.md`**, **`AGENTS.md`**, **`CONTRIBUTING.md`**, **`tools/haggis-eval/README.md`** — gate-count + subcommand-list references updated. README's "Current executable gates" section grew a `run-a11y-gate.mjs` line; the portfolio-summary bullet for vitest + smokes added the a11y gate; the orchestrator bullet's subcommand list grew `a11y`.

### Gates green at session end

```
pnpm verify (fast PR gate)        ~7s
haggis-eval all (release gate)   ~3min   signed=0x5fb5df020a5ce4e
  a11y/wcag-aa-spot-checks                PASS  13/13 (2.7s)
  all other 15 gates                       PASS  (unchanged)
```

## [Unreleased] — 2026-05-24 visual golden re-captured on Linux + recapture workflow

Acting on today's prior reflection: the visual gate's 3-bit Linux-vs-Windows delta was a stable cross-platform rendering difference, not jitter. Re-capturing the golden on the OS the verifier runs on (ubuntu-latest, where GitHub Actions executes the release gate) closes the gap. Linux CI now reads 0/8 Hamming distance — clean signal, full 8-bit budget reserved for real drift.

### Added

- **`.github/workflows/visual-recapture.yml`** — one-shot `workflow_dispatch` job that runs `node scripts/run-visual-gate.mjs capture` on ubuntu-latest and uploads `tests/golden/` as the `tests-golden` artifact. Reusable infra for any future scene re-baseline: trigger via `gh workflow run visual-recapture.yml`, eyeball the artifact PNG against the locked visual brief, commit. Does NOT auto-commit — re-capturing a visual golden is a deliberate human act.

### Changed

- **`tests/golden/bothy-idle-seed-42.png`** — re-captured on ubuntu-latest via the new workflow (run 26351707774). Visually identical to the prior Windows-captured PNG to the eye; the 3-bit aHash delta was sub-pixel AA + font-hinting noise that doesn't affect what a viewer sees.
- **`tests/golden/visual-budgets.json`** — `bothy-idle-seed-42.hash` updated to the Linux capture's value (`3c3cfc3ffc3f...740060000`, byte-identical to what every Linux CI run reported against the prior Windows golden). New `capturedOn` field names the workflow run that produced it. `toleranceSource` updated to reflect the OS pivot; tolerance retained at 8 bits as headroom for the mirror direction (Windows dev-machine captures will now read ~3 against the Linux golden — symmetric to today's prior state) plus any future real animation jitter.
- **`tests/golden/visual-budgets.json` `_comment`** — rewritten to make the OS-of-capture policy explicit: goldens come from the CI OS, not the contributor's local OS.

### Net effect

| Site            | Distance before recapture | Distance after recapture |
|-----------------|---------------------------|--------------------------|
| Linux CI        | 3 / 8 (37%)               | 0 / 8 (0%)               |
| Windows local   | 0 / 8 (0%)                | 3 / 8 (37%)              |

Same symmetric 3-bit cross-platform delta — but on the side that matters less. CI gets the clean reading; Windows dev-machine retains comfortable headroom.

### Gates green at session end

```
pnpm verify (fast PR gate)        ~20s
haggis-eval all (release gate)   ~3min   signed=0xa45688bc977506b
  visual/verify (Linux golden)            PASS  hamming 3/8 local Windows, 0/8 on Linux CI
  all other 14 gates                      PASS  (unchanged)
```

## [Unreleased] — 2026-05-24 visual-gate tolerance calibration from CI evidence

Same pattern as the earlier paint-budget calibration today: pull real CI evidence, tighten the gate's headroom from "bootstrap generous" to "evidence-based". The visual gate's Hamming-distance tolerance dropped from 18/256 (~7%) to 8/256 (~3%) without any change to the golden or the renderer.

### Investigation

Pulled the visual/verify gate result from 4 consecutive Linux CI runs (26350318616, 26350764592, 26351054004, 26351253798) and found the Linux-rendered hash differs from the Windows-captured golden by **exactly 3 bits, every run, same delta**. Not jitter — a stable cross-platform rendering difference (font hinting + AA sub-pixel rounding on the procedural Canvas2D primitives). Same `current` hash all four runs: `3c3cfc3ffc3f7c3e8039e039e03060318033c003e00760066006e00740060000`.

Calibration headroom rule applied: new tolerance ~2.7x observed cross-platform drift. Catches any real layout/palette shift (those produce 20-50+ bit drifts) while still absorbing potential future small platform deltas (e.g. a macOS runner) within budget.

### Changed

- **`tests/golden/visual-budgets.json`** — `bothy-idle-seed-42.toleranceBits` 18 → 8. Provenance recorded in new `toleranceCalibratedAt` + `toleranceSource` fields naming the four CI runs used. A new top-level `_comment` describes the calibration formula and the "re-tighten when CI evidence permits / loosen only with true-positive evidence" maintenance rule.
- **`scripts/smoke-visual-gate.mjs`** — default `SCENES[0].toleranceBits` 18 → 8 so a fresh `capture` from a cold clone records the calibrated bootstrap default, not the original generous one. Comment points at `visual-budgets.json` for the calibration provenance.

### Net effect

A real layout shift in the bothy (a misplaced sprite, a palette change, a door bounds change) now fails the gate at a lower threshold than before. Yesterday a 6-bit drift slipped through silently because 6 < 18; today the same drift fails 6 > 8. The 3-bit cross-platform delta from running on Linux CI still passes (3 < 8) with 5 bits of cushion.

### Gates green at session end

```
pnpm verify (fast PR gate)        ~20s
haggis-eval all (release gate)   ~3min   signed=0x54976300c8eadc4
  visual/verify (tightened)              PASS  hamming 0/8 on local Windows, 3/8 on Linux CI
  all other 14 gates                     PASS  (unchanged)
```

## [Unreleased] — 2026-05-24 doc-drift sweep (lower-traffic docs)

Today's three earlier commits aligned the high-traffic docs (CHANGELOG, plan, READMEs, foundation/07-quality-gates, haggis-eval README, kernel-design spec) with the wiring changes. This sweep audits the lower-traffic docs against the same set of claims (gate count, stub status, `size-limit`/Lighthouse mentions, lab-perf-planned mentions) and fixes the stale ones. No code touched; no gates affected.

### Changed

- **`docs/architecture/evaluation-strategy.md`** — status header now reads "lab perf shipped 2026-05-24 via hand-rolled paint gate" instead of "lab perf still planned"; implementation-status paragraph: gate count 14 → 15, "Lighthouse paint-timing eval remains on the planned list" → "lab-perf is hand-rolled, no Lighthouse dep, the W3C primitives directly via chromium-headless"; perf-budgets description now mentions the W3C Paint Timing API metrics + `hub:firstFrame` user-mark.
- **`docs/architecture/testing-strategy.md`** — status header now reads "lab-perf shipped 2026-05-24 hand-rolled via W3C Paint Timing API; soak still planned" instead of "soak + lab-perf still planned"; implementation-status paragraph names the new paint-timing smoke; pyramid bullet "visual ✓ + perf-budgets ✓" → "visual ✓ + bundle-budgets ✓ + paint-timing ✓".
- **`docs/foundation/12-craft-commitments.md`** — Section B Go role description rewritten: "performance-budget checks (`size-limit`, Lighthouse)" → "hand-rolled perf gate (per-asset bundle budgets via `scripts/perf-budgets.mjs` + W3C Paint Timing API medians via `scripts/run-paint-gate.mjs` — no `size-limit` or Lighthouse npm deps)".
- **`docs/foundation/07-quality-gates.md`** — first-public-release-requirements perf bullet: "Lighthouse performance: >= 90" → "Performance (paint timing): asserted via the hand-rolled `haggis-eval perf paint-timing` gate"; accessibility and best-practices bullets now annotated "(still planned, separate from paint timing)"; still-planned-strictness list: dropped `pnpm exec size-limit` (we don't need a second per-asset budget runner — bundle-budgets.mjs already covers this).
- **`docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md`** — perf rows in §2.7 subcommand table and §3 gate-matrix table: original "`size-limit` budgets, Lighthouse against local preview" annotated to record the as-shipped hand-rolled implementation and explicit drop rationale (deps the project doesn't need; W3C primitives suffice). Parallel to the slices.toml → slices.json note added in the prior commit.
- **`docs/superpowers/plans/2026-05-23-kernel-haggis-eval-plan.md`** — added "Historical plan, preserved as provenance" header at the top. The plan landed in full by 2026-05-24; the stub descriptions inside describe state-at-plan-time, not current state. Header points to `tools/haggis-eval/README.md` (canonical current state) + Slice 9 in the implementation sequence (concise summary). Parallels the same provenance pattern on `docs/plans/2026-05-22-ha-ggis-hub-foundation.md`.

### Not changed (intentional)

- `CHANGELOG.md` past entries — historical record; "14 gates green" / "Lighthouse outstanding" claims in older entries are correct *at the time they were written*. Don't rewrite history.
- `docs/plans/2026-05-22-ha-ggis-hub-foundation.md` — already marked archived; Lighthouse perf targets inside it are part of the historical foundation plan.
- `docs/archive/*` — archived content stays as captured.

## [Unreleased] — 2026-05-24 paint-budget calibration from Linux CI evidence

Calibrated the paint-timing budgets in `perf-budgets.json` from "guesses with 30x headroom" to "3-5x observed Linux CI median". A gate only catches regressions when budgets sit close enough to reality to fail when something gets meaningfully slower. Before: a 5x regression in FCP (44ms → 220ms) would have stayed green under the 1200ms budget. After: it fails the 200ms budget loudly.

### Changed

- **`perf-budgets.json` `paint.max_ms`** — sourced from two Linux GitHub-hosted runner samples (CI runs 26350318616 + 26350764592, 6 sample points per metric, three-sample median per run):

  | Metric                  | Linux median | Was   | Now   | Tightening |
  |-------------------------|--------------|-------|-------|------------|
  | firstContentfulPaint    | 44 ms        | 1200  | 200   | 6.0x       |
  | largestContentfulPaint  | 44 ms        | 2000  | 200   | 10.0x      |
  | hubFirstFrame           | 53 ms        | 2500  | 300   | 8.3x       |
  | domContentLoaded        | 27 ms        | 1000  | 150   | 6.7x       |
  | loadEvent               | 28 ms        | 2000  | 150   | 13.3x      |

  Headroom calculation: each budget sits at ~3-5x the observed Linux median, absorbing the ~30% sample-to-sample variance the runs show without leaving room for a 2x+ regression to pass. Local Windows medians sit at ~35-44ms across all five metrics — comfortably under at ~10-25% of budget.

- **`perf-budgets.json` `paint._comment`** — rewritten to record provenance (sample size, runs cited, calibration formula) and the "re-tighten when N >= 10 runs available, loosen only with true-positive evidence" maintenance rule.

### Gates green at session end

```
pnpm verify (fast PR gate)        ~20s
haggis-eval all (release gate)   ~3min   signed=0xce29f29c829d5ddc
  perf/paint-timing (tightened)           PASS  fcp 36/200 (18%), hubFirstFrame 35/300 (12%), dcl 15/150 (10%)
  all other 14 gates                      PASS  (unchanged)
```

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
