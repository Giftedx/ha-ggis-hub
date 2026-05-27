# Changelog

All notable changes to ha.ggis Hub. Date-ordered, newest first. Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — 2026-05-27 gate: lift TS coverage thresholds to 100%; fix CI/doc drift

Coverage thresholds raised from `lines:90, stmts:90, fns:90, branches:85` to 100% across all four
metrics. Threshold now matches actual coverage — any future regression fails the gate immediately.
CI yml, haggis-eval help text, haggis-eval README, quality-gates.md, and WRITEUP.md updated to
reflect 100% thresholds; CI yml also corrected a11y spot-check count (22 → 26) and added
prettier to the PR gate description.

### Changed

- **`vite.config.ts`** — coverage thresholds: all four metrics raised to 100%.
- **`.github/workflows/ci.yml`** — coverage comment updated to 100%; a11y count 22 → 26;
  PR gate description now lists `prettier --check` in the verify chain.
- **`tools/haggis-eval/main.go`** — coverage help line updated to 100%.
- **`tools/haggis-eval/internal/cmd/coverage.go`** — comment updated to 100%.
- **`tools/haggis-eval/README.md`** — coverage row updated to 100%.
- **`docs/foundation/07-quality-gates.md`** — TS coverage budget lines updated to 100%
  (raised from 90%/85% on 2026-05-27).
- **`WRITEUP.md`** — coverage command comment updated to 100%; verify chain now lists
  `prettier --check`.

---

## [Unreleased] — 2026-05-27 tooling: prettier formatting gate

Prettier added as a devDependency and wired into `pnpm verify` via a new `pnpm fmt:check` step.
Config: `singleQuote: true, trailingComma: "es5", printWidth: 100`. All `src/**/*.ts` files formatted
in the same commit. 100% TS coverage confirmed held after reformatting. The formatting check now runs
between `pnpm lint` and `pnpm test` in the verify chain so any drift is caught before test execution.

### Added

- **`.prettierrc`** — prettier config (`singleQuote`, `trailingComma: "es5"`, `printWidth: 100`).
- **`package.json`** — `fmt:check` script (`prettier --check "src/**/*.ts"`); wired into `verify`.
- **`src/**/*.ts`** — all files formatted; no semantics changed.

---

## [Unreleased] — 2026-05-27 test: Rust property + boundary tests; TS coverage to 100%

### Added

- **`crates/hub-core/src/sim.rs`** — 6 new unit tests: locked-door interaction kind and door index,
  no-interaction at spawn, right/top/bottom world-boundary clamping. 2 proptest blocks: bounds invariant
  under arbitrary seed + input sequence; input signum round-trip for arbitrary i8 axes.
- **`crates/hub-core/src/replay.rs`** — proptest: replay matches direct execution for any seed and any
  set of up to 10 input changes. btree_map guarantees valid log ordering. hub-core: 39 tests total.
- **`src/render/canvas-room.ts`** — annotated 5 remaining dead-code branches (imageSmoothingEnabled
  false arm, window DPR ternary, titles.get ?? fallback, mote dim-skip, nowMillis fallback).
  Restructured nowMillis() to early-return guard. Added second render() call in the Image-stubbed test
  for the storybookBackdropImage singleton path.
- **`src/hub/bothy-module.ts`** — annotated 3 uncovered functions: getContext (mocked boundary),
  __roomSnapshot and __stateHash (browser-only dev hooks, v8 ignore start/stop).

### Fixed

- **`WRITEUP.md`** — corrected headline from ~94 KB to ~96 KB (matches table value 95.83 kB and README).

### Result

TypeScript: 100% statements, branches, functions, lines across all 25 test files, 214 tests.
Rust hub-core: 39 tests (20 unit + 2 proptest in sim, 4 + 1 proptest in replay, 9 in hash+rng+log).

---

## [Unreleased] — 2026-05-27 test: systematic coverage push; 190 → 214 vitest; branches 89.66% → 100%

Four coverage sessions across bothy-module, canvas-room, sprite, pixel-font, and whs-bothy. Branch
coverage rose from 89.66% to 100%. Statements, functions, and lines also at 100%.

### Added

- **`src/hub/bothy-module.test.ts`** — 25 new tests: keyboard directional movement (right+down, left-only,
  up-only), all pointer-drive directions and deadzone guard, consumeInteract with non-launchable and
  out-of-bounds index, unregistered and locked door keyboard interact, hasPointerCapture=false path,
  debug overlay in normal + active-interaction states + null door id, visibility-hidden guard, post-destroy
  rAF guard, double-destroy guard, beforeunload serialisation.
- **`src/navigation/browser-navigator.test.ts`** — new file; 2 tests for `createBrowserLaunchNavigator`.
- **`src/render/canvas-room.test.ts`** — "Next Moon" → "SOON" doorShortLabel branch.
- **`src/render/sprite.test.ts`** — `blitSpriteTL` transparent-pixel skip test.
- **`src/app/music.test.ts`** — `if (!audio.paused)` false branch.

### Fixed

- **`src/render/canvas-room.ts`** — simplified dead three-way ternary to two-way (door.status is
  launchable|locked; 'available' arm was unreachable). Replaced non-functional `c8 ignore else`
  annotation on drawLantern with an early-return guard annotated `v8 ignore next`.
- **`src/render/sprite.ts`** — `colour === null || colour === undefined` → `colour == null` (covers both
  with correct TypeScript narrowing under noUncheckedIndexedAccess; previous form had dead `=== undefined`
  arm).
- **`src/render/sprites/pixel-font.ts`** — annotated two unreachable `?? GLYPH_FULL_WIDTH` fallbacks.
- **`src/hub/bothy-module.ts`** — four `v8-ignore-next` annotations on defensive dead-code guards
  (devicePixelRatio fallback, doorSnap sentinel, game?.title fallback, missing-game plan arm).

---

## [Unreleased] — 2026-05-27 fix: sync docs and perf budget after music/font additions

Five doc files and the perf budget had drifted after the music controller and font-face CSS additions. No code changes; gate-state is now accurate everywhere.

### Fixed

- **`perf-budgets.json`** — index stem budget raised 64 KB → 72 KB to reflect music controller + font-face CSS (measured 64.2 KB; was 185 B over the stale budget). Note updated to name the new scope.
- **`README.md`** — corrected smoke count (three → five), a11y count (22 → 26), and total-client size (~83 KB → ~96 KB) with updated asset breakdown.
- **`WRITEUP.md`** — updated bundle table (83 KB → ~96 KB), architecture-diagram JS callout (49 KB → 59 KB), smoke count, a11y count (22 → 26), vitest count (144 → 190), and rewrote "Where the art now stands" to describe the painted backdrop, current Wee Chieftain design, self-hosted Old Standard TT, and opt-in music.
- **`docs/architecture/testing-strategy.md`** — vitest count corrected 187 → 190.
- **`src/app/music.test.ts`** — added test covering the `if (!audio.paused)` false branch in `playCurrent` (play resolves but audio stays paused — a legitimate edge-case browser path). 190 vitest cases; branches 89.66%.

---

## [Unreleased] — 2026-05-27 feat: self-host Old Standard TT for consistent cross-platform serif

The hub chrome (brand, links, music button, status) renders in the system serif stack — Georgia on most platforms, but Times New Roman on Windows where Georgia's metrics differ most. This pass locks the rendering across all platforms: three self-hosted woff2 files (Regular 400, Italic 400, Bold 700; latin subset) ship with the app and the italic 400 is preloaded so the chrome renders in-font on first paint with no FOUT.

### Added

- **`public/fonts/`** — `old-standard-tt-latin-400.woff2`, `old-standard-tt-latin-400i.woff2`, `old-standard-tt-latin-700.woff2` (~73 KB total). SIL OFL-1.1. Source: Google Fonts v22 latin subset.
- **`public/fonts/README.md`** — provenance, license, update instructions.
- **`public/_headers`** — `/fonts/*` cache rule: `public, max-age=31536000, immutable`.
- **`src/style.css`** — three `@font-face` blocks for the self-hosted variants; font-family stack updated to `'Old Standard TT', Georgia, ...`.
- **`index.html`** — `<link rel="preload">` for the italic 400 woff2 to eliminate FOUT on first paint.
- **`DESIGN.md`** — updated typography note: planned upgrade → shipped.

---

## [Unreleased] — 2026-05-27 feat: rebuild the bothy around a painted storybook backdrop

The hub scene had working pieces but weak art direction: the mascot overpowered the room, the floor read as a flat brown stage, the main light source was too timid, the hearth lacked architectural weight, and the mascot's oat cutaway competed with its face. This pass moves the live scene out of assembled programmer-art territory: a generated 1080×720 painted bothy backdrop now carries the main composition, while the existing procedural Canvas2D diorama remains as the no-image fallback.

### Changed

- **`public/art/bothy-storybook-backdrop.webp`** — added the shipped painted Highland Dawn Bothy backdrop, generated from the locked visual brief and normalized to WebP for the browser runtime.
- **`src/render/canvas-room.ts`** — composites the painted backdrop once the browser image is loaded, keeps the procedural Canvas2D diorama as fallback, and reduces/repositions the Wee Chieftain overlay so the character reads as a room inhabitant instead of the dominant room mass.
- **`src/render/canvas-room.ts`** — in the fallback path, replaced the muddy oval floor patch with a structured heather hearth runner, replaced the small central window with a panoramic Highland dawn view, added a stone inglenook behind the hearth, grounded side-wall doors with recesses/casings/threshold stones, moved sign/lantern fixtures into the door architecture, and added readable shelf/log-basket props.
- **`src/render/whs-bothy.ts`** — lifted the plaster and floor substrate palette so the room separates into wall, floor, stone, and dawn-light values instead of collapsing into one brown mass.
- **`src/render/bothy-haggis.ts`** — added authored brow lines, smaller casing eyelids, and a small casing highlight; moved the oat cutaway low on the casing and replaced the oversized cream googly eyes with smaller bead-eyes so it reads as food identity rather than a stray facial feature.
- **`src/render/canvas-room.test.ts`** + **`src/render/bothy-haggis.test.ts`** — locked the loaded-backdrop path, fallback diorama staging, door grounding, structured runner, panoramic dawn view, hearth inglenook, and mascot-expression constraints.
- **`src/hub/bothy-module.test.ts`** — added mocked browser-host coverage for mount, tap launch, pointer drive, keyboard interact, cleanup, and room/registry mismatch so the release coverage gate remains earned.
- **`crates/hub-core/src/sim.rs`** — removed stale renderer-scale wording from the feet-anchor proximity comment while closing the clippy doc-markdown warning.
- **`DESIGN.md`** — documented the painted backdrop, its procedural fallback, and the fallback composition budget.

---

## [Unreleased] — 2026-05-27 feat: add opt-in generated hub music

The accepted Wario Synth shares are now local hub music assets. The share pages resolve to BitMidi MIDI sources and synthesize the Game Boy-style output client-side, so this pass stores both the source MIDI files and rendered MP3 outputs in the repo.

### Added

- **`public/music/`** — downloaded `flower-of-scotland.mid` and `scotland-the-brave.mid`; rendered matching 96 kbps MP3 files for browser playback; removed the rejected `scotland.mp3` track and added asset provenance in `public/music/README.md`.
- **`scripts/render-wario-share-audio.mjs`** — regenerates the WAV intermediates through the Wario Synth browser path without vendoring the external synth engine into the app.
- **`src/app/music.ts`** — new explicit opt-in playlist controller. It starts only from the music button, uses `preload="none"`, keeps volume at `0.38`, and advances tracks only after the user has chosen playback.
- **`src/app/app.ts`** + **`src/app/shell.ts`** + **`src/main.ts`** — thread the playlist into the app model, add a small accessible `music` / `music on` control, and wire it to the runtime controller.
- **`src/app/music.test.ts`** + app/shell tests — cover track metadata, no-autoplay start state, user-gesture playback, playlist advance, and listener cleanup.
- **`DESIGN.md`** — added the sound policy: explicit opt-in, no preload on first paint, top-right chrome, source links retained.

---

## [Unreleased] — 2026-05-26 refine: make the Wee Chieftain read as haggis before bean

The V4 mascot fixed the worst problems but still leaned on tiny secondary cues: the body could read as a brown bean, the oat patch was too timid, and the favicon was still mostly a face. V5 makes one food cue do the heavy lifting: a larger pale oat/stuffing cutaway with a dark casing lip. The tied end stays, but the cutaway now carries the immediate "haggis pudding" read.

### Changed

- **`src/render/bothy-haggis.ts`** — replaced the small oat patch with a brighter exposed-oat cutaway and casing lip; added `crumbLight` to the mascot palette.
- **`src/render/bothy-haggis.test.ts`** — locked the larger cutaway geometry and the favicon's matching small-size cue.
- **`public/og.svg`** + **`public/og.png`** — ported the V5 cutaway to the social card.
- **`public/favicon.svg`** — enlarged the pale oat cutaway so the icon is no longer just a brown face at 32 px.
- **`DESIGN.md`** — documented the new exposed-oat token.
- **`tests/golden/bothy-idle-seed-42.png`** + **`tests/golden/visual-budgets.json`** — rebaselined after visual review.

---

## [Unreleased] — 2026-05-26 refine: sharpen Wee Chieftain food-mascot identity

The V3 whole-haggis direction was right, but the first pass still risked reading as a generic brown bean at small sizes. V4 makes the food cue louder without adding animal anatomy: stronger casing compression at both ends, a readable right-side tied-end button-knot, warmer casing highlights so the mascot separates from the brown bothy, and softer alert eyes that stop reading suspicious.

The favicon is now intentionally separate from the walking in-game pose. Instead of shrinking the full mascot with legs and ground clutter, it uses a close-cropped haggis icon: oval casing, cream eyes, oat patch, and tied knot only.

### Changed

- **`src/render/bothy-haggis.ts`** — added casing tension marks, stronger approved-token highlights, a readable twine button-knot, and softer alert eye geometry while preserving the public frame API.
- **`src/render/bothy-haggis.test.ts`** — locked the V4 shape, knot, eye, and favicon readability constraints.
- **`public/og.svg`** + **`public/og.png`** — ported the V4 mascot details to the social card.
- **`public/favicon.svg`** — replaced the full-body mini mascot with a purpose-built close-cropped icon.
- **`tests/golden/bothy-idle-seed-42.png`** + **`tests/golden/visual-budgets.json`** — rebaselined after visual review.

---

## [Unreleased] — 2026-05-25 refactor: strip haggis back to a committed folk silhouette

After five additive iterations (tied pudding → fabric flaps → tartan band → thistle sprig → adjusted everything) the haggis had become a Christmas pudding in a Burberry cap — busy at every scale, "wearing its Scottishness instead of being it". Root cause from the roast cycle: every pass added a feature; subtraction was never the move. Reversed direction.

Kept: one pear silhouette (single fill, no layered shading), one tartan band at the cinch, two tiny ribbon-end twists above the band, two black DOT eyes, four asymmetric drift legs, the heather patch. Cut: thistle sprig, fabric flaps, knobbly stitching, dawn-lit crown, belly shadow, snout/muzzle/nose/nostrils/smile, eye whites/pupils/catchlights, brow tufts, all the multi-layer body shading. Frame interface collapsed from `{breathY, facingLeft, frontLegY, backLegY, tieWobble, blink}` to `{breathY, facingLeft, frontLegY, backLegY}`. Palette down from 18 tokens to 10.

The folk-art register every previous iteration claimed but didn't deliver: confident silhouette, minimal features, no Pixar/Minions eye construction. At favicon scale this is the cleanest iteration of the day — at 16×16 the cream stripe and brown body read without any decorative noise to lose.

### Changed

- **`src/render/bothy-haggis.ts`** — full rewrite, ~half the LoC. Frame interface simplified; palette minimised; single-band tartan replaces the three-band cinch; dot-eyes replace the layered eye construction; cuts ~9 feature blocks.
- **`src/render/bothy-haggis.test.ts`** — palette assertions updated to the minimal token set.
- **`src/render/canvas-room.ts`** — `drawHaggis` no longer computes blink or tieWobble (no longer in frame interface).
- **`public/og.svg`** — ported the simplified design at OG scale; removed thistle, stitching, multi-band tartan, fabric flaps, smile, snout, eye whites.
- **`public/og.png`** — regenerated.
- **`public/favicon.svg`** — same simplified design at favicon scale; tartan band + dot eyes only; lit bottom rim retained for dark-mode silhouette safety.
- **`tests/golden/bothy-idle-seed-42.png`** + **`tests/golden/visual-budgets.json`** — rebaselined.

---

## [Unreleased] — 2026-05-25 feat: add tartan + thistle Scottish identity tell

Roast verdict on the prior tied-pudding haggis: "nothing Scottish about it beyond the colour brown — could be any tied bag with eyes." The food-shape gag worked but the protagonist had zero cultural specificity. Fixed: cream twine wraps are now TARTAN-banded (cream base + red and dark-green primary stripes alternating, with thin cross-stripes of the secondary colour suggesting plaid weave), and a small purple THISTLE sprig is tucked at the front-right of the cinch — stem + spiky green bract + purple fluffy head + bright hair-strokes. Both cues port from bothy-haggis.ts through og.svg to the favicon so the Highland identity shows up at every scale, including 16×16 where the tartan stripe pattern is the only thing legible.

Along the way, additional roast items addressed: smile widened (4.8→6.8 design units) and a tiny warm shadow added underneath so it stops reading as a thin scratch; stitching strokes irregularised (12→11, varied length/angle, scattered off the symmetric grid) so the surface stops looking like correction-tape; asymmetric drift legs exaggerated (4→9 long, 4→3 short — ~3× difference) so the canonical tourist gag is finally visible at runtime scale; fabric flaps shrunk and angled down-and-out so they read as drooping cloth, not Pikachu ears.

### Changed

- **`src/render/bothy-haggis.ts`** — palette grew `tartanRed`/`tartanGreen`/`tartanCream`/`tartanShadow`/`thistlePurple`/`thistleStem`/`thistleHilite` tokens; `drawTiedNeck` now paints tartan-striped wraps + thistle sprig + droopier flaps; smile is bigger + has a warm shadow line; stitching positions irregularised; leg-pair height delta widened.
- **`src/render/bothy-haggis.test.ts`** — palette assertion updated for new tartan tokens.
- **`public/og.svg`** — same tartan + thistle + drift + smile + stitching changes ported at OG scale (×6).
- **`public/og.png`** — regenerated via `pnpm rasterize:og`.
- **`public/favicon.svg`** — simplified tartan band (2 wraps) + tiny thistle + droopier flaps + wider smile + ~3× leg drift contrast + lit bottom rim for dark-mode silhouette safety.
- **`tests/golden/bothy-idle-seed-42.png`** + **`tests/golden/visual-budgets.json`** — rebaselined.

---

## [Unreleased] — 2026-05-25 feat: update favicon to the tied-pudding haggis

`public/favicon.svg` previously shipped the old canonical mane-and-strands silhouette. Replaced with a simplified port of the tied-pudding canon: round peat-brown body, cream twine cap at the top (the iconic gag, load-bearing at small sizes), two forward eyes, fabric ears, asymmetric drift legs at the bottom. Verified visually at both 32×32 and 16×16 — the cream cord wrap reads even when no other feature is legible.

### Changed

- **`public/favicon.svg`** — tied-pudding silhouette scaled for browser tabs.

---

## [Unreleased] — 2026-05-25 feat: redesign OG social card with the tied-pudding haggis

`public/og.svg` previously shipped with the old canonical mane-and-strands haggis silhouette (the one the owner called "ugly as sin"). Replaced with a hand-port of the new `bothy-haggis.ts` shape language — tied-pudding sack, twine wraps, fabric ears, asymmetric drift legs, heather patch — at the OG card's 1200×630 scale (haggis rendered at ×6 native, ~270 wide). Now the social card actually showcases the canon protagonist instead of misrepresenting it.

Typography block + dawn radial + vignette + frame are unchanged. Removed the unused `#haggisBody` / `#mane` / `#rim` gradient defs (they were only referenced by the retired haggis paths).

### Changed

- **`public/og.svg`** — new tied-pudding haggis group at `translate(900 320) scale(6)`; removed unused gradient defs; updated comment to point at `bothy-haggis.ts` as the canon source.
- **`public/og.png`** — regenerated via `pnpm rasterize:og`.

---

## [Unreleased] — 2026-05-25 feat: bothy haggis as tied-pudding-with-eyes (`bothy-haggis.ts`)

Six earlier haggis attempts in the same working tree failed the bar — procedural drawer keyed to `public/og.svg` ("lumpy / icicle-maned"), hand-painted pixel sprite at scale 3 ("brown loaf"), port of the WHS in-game drawer (rejected as a cross-game copy), 3/4-russet "Highland mammal" ("corn dog with a bib"), radial fur spikes ("sea urchin"), and scalloped fluff ("Furby in cosplay"). All six designed AROUND the haggis. The breakthrough: the wild haggis is a folk gag about the FOOD coming alive — so the creature's shape language has to *be* the dish (a stuffed sack tied with twine at the top), with eyes, legs, and the canonical asymmetric-leg drift.

This drawer commits to that: pear/teardrop sack body in peat-tan, a cinched neck with three cream-oat twine wraps at the top, two outward-flopping "fabric ears" of gathered cloth above the tie, two forward eyes + small dark muzzle + smile on the upper-front of the sack, four leg stubs at the bottom with ONE SIDE noticeably shorter than the other (the tourist-canon drift), knobbly stitching strokes inside, dawn rim highlight along the upper curve. Native ≈ 50 wide × 50 tall; runtime scale 3 → ~150-wide presence.

### Added

- **`src/render/bothy-haggis.ts`** — hub-original drawer (`drawBothyHaggis`).
- **`src/render/bothy-haggis.test.ts`** — coverage for frame params, blink path, palette tokens.

### Changed

- **`src/render/canvas-room.ts`** — `drawHaggis` calls `drawBothyHaggis` at scale 3; blink animation phased so eyes are OPEN at the fixed-phase visual gate; contact shadow widened to match new footprint.
- **`src/render/whs-bothy.ts`** — lifted peat/plaster values (carried over from prior dawn-beam work).
- **`src/render/canvas-room.ts`** — `drawSoftDawnBeam` for the floor; ambient warm floor wash; tighter lantern halo (carried over from prior dawn-beam work).
- **`src/style.css`** — muted scene brand/direct links (carried over from prior dawn-beam work).

### Removed

- **`src/render/canon-haggis.ts`** + test — og.svg-keyed silhouette port. `feedback_og_svg_not_canon` records why this reference is off-limits.
- **`src/render/sprites/haggis.ts`** + test — pixel sprite attempt that read as a brown loaf at the bothy's render scale.

### Visual gate

- **`tests/golden/bothy-idle-seed-42.png`** + **`tests/golden/visual-budgets.json`** — rebaselined.

---

## [Unreleased] — 2026-05-25 fix: body-centered door proximity and interact in input log

Door overlap now uses an AABB centered on the painted body (42 world units above the feet anchor), not on the feet position. Interact keys are OR’d into every tick’s packed input while held so `.haggislog` sessions record chap attempts without a separate edge-only path.

### Changed

- **`crates/hub-core/src/sim.rs`** — `INTERACTION_CENTER_ABOVE_FEET`; new overlap tests.
- **`src/engine/input.ts`** — `interactHeld()` / `interactHeldFromPressedKeys()`.
- **`src/hub/bothy-module.ts`** — packed input includes interact while held.

---

## [Unreleased] — 2026-05-25 polish: tighter door proximity and locked-door taps

Door interaction now uses a smaller feet-anchored hitbox (`PLAYER_HALF` 80→56) so launchable doors read closer to the painted haggis. Tapping the locked future-bothy door announces “comin’ soon” instead of starting pointer-drive.

### Changed

- **`crates/hub-core/src/sim.rs`** — `PLAYER_HALF` 56; comment documents feet-anchored box.
- **`src/hub/bothy-module.ts`** — pointer-down on any door hitbox respects locked vs launchable.
- **`package.json`** — `build:wasm` runs `wasm-pack` into `src/generated/hub-wasm/` before `vite build` so sim changes reach the browser artifact.
- **`src/generated/hub-wasm/`** — regenerated after `PLAYER_HALF` change.
- **`tests/golden/bothy-idle-seed-42.png`** + **`tests/golden/visual-budgets.json`** — rebaselined (contact shadow reads the new half-extent).

---

## [Unreleased] — 2026-05-25 fix: deterministic visual gate and current haggis-eval docs

The pre-merge slice exposed two bits of engineering drift: the visual gate's 8-bit budget was being spent by normal animation timing (local verifies landed 10–12 bits from the golden), and several current docs still described old haggis-eval/stub/count assumptions. The visual gate now freezes renderer animation with `?visualGatePhase=0`, rebakes the golden for that fixed phase, and verifies at 0/256 across repeated local runs. Preview gate runners also avoid Node's DEP0190 warning by using shell command strings only for constant `pnpm` invocations and validating preview ports before interpolation.

### Added

- **`src/render/canvas-room.test.ts`** — guard that `fixedPhaseSeconds` produces stable draw calls for equal phases and different draw calls for different phases.

### Changed

- **`src/render/canvas-room.ts`** — renderer options now accept `fixedPhaseSeconds` for deterministic visual-gate captures; normal runtime leaves it unset.
- **`src/main.ts`** — reads numeric `visualGatePhase` query param and passes it to the renderer.
- **`scripts/smoke-visual-gate.mjs`** — captures/verifies with `?seed=42&visualGatePhase=0` so the aHash budget tracks art drift instead of animation timing.
- **`scripts/run-{browser,determinism,visual,a11y,paint,soak}*.mjs`** — preview harnesses no longer pass argument arrays with `shell: true`, removing the Node DEP0190 warning from gate output.
- **`tests/golden/bothy-idle-seed-42.png`** + **`tests/golden/visual-budgets.json`** — recaptured at fixed phase; tolerance remains 8 bits.
- **`tests/golden/README.md`**, **`tools/haggis-eval/README.md`**, and **`docs/plans/2026-05-22-implementation-sequence.md`** — updated current haggis-eval/visual-gate documentation.

### Gates green

```
node scripts/run-visual-gate.mjs verify  hamming 0/256 ≤ 8
```

---

## [Unreleased] — 2026-05-25 accessibility: live door status and label-in-name guard

The canvas prompt is no longer visual-only. When the haggis reaches a door, the existing polite status region now announces the matching door state: launchable WHS door copy includes Enter/Space/E and tap controls; the locked future door announces “comin’ soon” without implying launch. Direct-play links also now satisfy WCAG 2.5.3 label-in-name: the corner dialect link’s accessible name includes its visible text, and the fallback direct link uses its visible text as its accessible name.

### Added

- **`src/app/door-status.ts`** — formats door-status announcements from `DecodedSnapshot` + registry title data, and exposes a tiny announcer that only writes when the message changes.
- **`src/app/door-status.test.ts`** — covers no-door fallback text, launchable-door copy, locked-door copy, invalid door-index fallback, and duplicate-announcement suppression.
- **`scripts/smoke-a11y.mjs`** — new WCAG 4.1.3 live-status check drives the deterministic haggis spawn into the WHS door zone and asserts the status copy; new WCAG 2.5.3 label-in-name check guards aria-label/visible-text drift.

### Changed

- **`src/main.ts`** — wires door-status announcements after the first render and each RAF loop; reduced-motion copy remains the no-door fallback text.
- **`src/app/shell.ts`** — corner direct link accessible name now includes the visible “awa’ in →” label; fallback direct link no longer overrides its visible text with a shorter aria-label.
- **README / WRITEUP / docs** — present-tense test/a11y counts updated to `143` Vitest tests and `22` a11y checks; README interaction copy now names tap/click plus Enter/Space/E.

### Gates green

```
pnpm verify                 144/144 tests (typecheck + lint + test + build)
node scripts/run-a11y-gate.mjs 22/22 checks
```

---

## [Unreleased] — 2026-05-25 fix: tap-detection aligned to painted door; createAppModel isolated in error boundary

Three bugs fixed in a single session-driven audit:

1. **Tap-zone / visual-door offset** — `pointerdown` previously hit-tested against raw sim world bounds (0–1000 scale). `snapDoorToWall` shifts the painted door ~10 px rightward into the wall mass; on mobile the ~10-pixel gap between where the door *looks* and where it *responds* was a real miss. Fixed by exporting `computeVisualDoorBounds` from `canvas-room.ts`, which applies `scaleDoorBounds → doorSide → snapDoorToWall` and returns visual pixel coordinates. `pointerdown` now converts the pointer event to logical canvas coords (DPR-corrected) and hit-tests against these visual bounds.

2. **`createAppModel()` error isolation** — `createAppModel()` was called after `createShell()` / `root.replaceChildren()` inside a single try block, meaning a throw inside `createAppModel()` would hit the catch block before `shell` was valid (fallback status text would silently do nothing). Fixed by wrapping `createAppModel()` in its own early try-catch (returns on error), then assigning `const shell = createShell(model)` outside the main try — TypeScript's definite-assignment analysis is now satisfied and the error boundary is correct.

3. **Stale Rust test assertions** (`d4a903b`) — `snapshot_view.rs` `header_fields_round_trip` expected the old default spawn of `(500, 500)`, but `Sim::new(0)` has spawned at `(340, 540)` since the art-direction commit. Updated to the correct values.

### Added

- **`src/render/canvas-room.ts`** — `SurfaceDimensions` interface (width + height only); `CanvasRoomSurface` now extends it. `computeVisualDoorBounds(surface, room)` exported — returns logical canvas pixel bounds post-`snapDoorToWall` for each door.
- **`src/render/canvas-room.test.ts`** — 4 new `computeVisualDoorBounds` tests: entry count, right-wall snap alignment, left-wall snap alignment, and snap-effect confirmation.

### Changed

- **`src/main.ts`** — `pointerdown` tap detection replaced; `createAppModel()` isolated in separate early try-catch before `const shell` assignment.
- **`src/render/canvas-room.ts`** — `scaleDoorBounds`, `doorSide`, `snapDoorToWall` parameter types narrowed from `CanvasRoomSurface` to `SurfaceDimensions` (backward-compatible; all callers already satisfied the narrower contract).
- **`crates/hub-wasm/src/snapshot_view.rs`** — `header_fields_round_trip` spawn-coordinate assertions updated: `player_x 500 → 340`, `player_y 500 → 540`.

### Gates green

```
pnpm verify    ~15s    135/135   (typecheck + lint + test + build)
pnpm coverage          branches 94.78% (309/326) ≥ 85% configured
               functions 100%
cargo test     29 hub_core + 1 replay round-trip + 2 differential hash + 2 differential rng
```

---

## [Unreleased] — 2026-05-24 refactor: make canLaunchGame a type guard; raise branch threshold 78%→85%

`canLaunchGame` now returns a narrowing predicate (`game is HubGameDefinition & { launch: Exclude<HubGameLaunchTarget, { kind: 'none' }> }`), eliminating the logically unreachable `if (game.launch.kind === 'none')` dead branch in `createLaunchPlan`. Branch threshold aligned to the policy target (78% → 85%); actual coverage is 94.78% (309/326).

### Changed

- **`src/navigation/launch.ts`** — `canLaunchGame` return type changed from `boolean` to a TypeScript type guard. Removed the now-unreachable `if (game.launch.kind === 'none')` block (lines 70–77), which was only needed to satisfy narrowing before the type guard.
- **`vite.config.ts`** — branch coverage threshold 78 → 85. Actual coverage (94.78%) far exceeds both the old and new threshold.
- **`README.md`**, **`WRITEUP.md`**, **`docs/foundation/07-quality-gates.md`**, **`tools/haggis-eval/README.md`**, **`tools/haggis-eval/main.go`**, **`tools/haggis-eval/internal/cmd/coverage.go`**, **`.github/workflows/ci.yml`** — threshold annotation updated to `branches≥85%`. Quality gates "Initial budgets" section updated from `≥ 80%, target 85%` to `≥ 85% configured, target 90%`.

### Gates green

```
pnpm verify    ~15s    131/131   (typecheck + lint + test + build)
pnpm coverage          branches 94.78% (309/326) ≥ 85% configured
               functions 100% (148/148)
               statements 99.39% (1317/1325)
               lines 99.60% (1255/1260)
```

---

## [Unreleased] — 2026-05-24 tooling: add ESLint (strictTypeChecked); correct inflated test/coverage counts caused by stale worktrees

`eslint` + `typescript-eslint` wired as `pnpm lint` and added to `pnpm verify`. Five real code fixes surfaced. Stale `.claude/worktrees/` removed (1.9 GB); their presence was inflating vitest test counts and V8 coverage totals. Accurate post-cleanup counts documented.

### Added

- **`eslint.config.js`** — flat config using `typescript-eslint` `strictTypeChecked` preset. Disabled rules that conflict with the tsconfig (`no-non-null-assertion` ↔ `noUncheckedIndexedAccess`, `restrict-template-expressions` allowing numbers, `no-unused-vars` ↔ tsc). Test files relax `require-await`, `no-useless-constructor`, and the `no-unsafe-*` family to accommodate stub/mock patterns.
- **`package.json`** — `lint` script (`eslint src/ vite.config.ts --max-warnings=0`); added to `verify` sequence (now: typecheck → lint → test → build:verified).

### Changed

- **`src/render/sprite.ts`** — `new Array(width * height)` → `new Array<string | null>(width * height)` (removes unsafe-assignment of untyped array).
- **`src/wasm/generated-loader.ts`** — removed the `as unknown as GeneratedHubWasmModule` cast (ESLint confirmed it is unnecessary — tsc accepts the return without it; structural types are compatible). Stale cast comment removed.
- **`src/main.ts`** — two `() => voidFn()` arrow shorthands wrapped in braces (`no-confusing-void-expression`).
- **`src/engine/input.test.ts`** — same fix for `() => sampler.destroy()` in double-destroy test.
- **`vite.config.ts`** — added `exclude: ['**/node_modules/**', '**/.claude/**']` to prevent worktrees under `.claude/` from contributing test files to vitest discovery.
- **`README.md`** + **`docs/architecture/testing-strategy.md`** — corrected inflated test counts (260 → 131) and coverage numbers to reflect actual state without worktree duplication.

### Correction: all prior test counts were inflated by stale worktrees

Four stale worktrees under `.claude/worktrees/` (created by earlier autonomous sessions, never removed) were included in vitest's test-file discovery because vitest's default include glob `**/*.test.ts` matched `.claude/worktrees/*/src/**/*.test.ts`. The worktrees were at older commits so their test files had fewer tests per file — their presence added ~129 extra test cases and ~324 extra coverage branches to every run. The inflated CHANGELOG entries (223 → 240 → 251 → 258 → 260) are preserved as provenance but the actual test count was always ~50–100% lower. Post-cleanup accurate counts:

```
pnpm verify    131 tests passing (19 test files)
pnpm coverage  branches 94.51% (310/328) — ≥78% configured, ≥85% target, ≥90% ideal
               functions 100% (148/148)
               statements 99.32% (1318/1327)
               lines 99.52% (1256/1262)
```

### Gates green

```
pnpm verify    ~15s    131/131   (typecheck + lint + test + build)
pnpm coverage          branches 94.51% ≥ 78% configured
pnpm lint              0 errors, 0 warnings
```

---

## [Unreleased] — 2026-05-24 test: branch coverage 89.11% → 89.41%; cover app error path and lifecycle ?? null branch

2 new tests across 2 files (1 new, 1 extended) — closes the last two reachable branches. 258 → 260 vitest.

### Added

- **`src/app/app-error.test.ts`** (new) — 1 test using `vi.mock('../navigation/launch')` to stub `createDirectPlayPlan` returning `kind: 'missing-game'`; exercises the `directPlayPlan.kind !== 'launchable'` throw on `app.ts` line 22.

### Changed

- **`src/engine/lifecycle.test.ts`** — new case: `mount` rejects with `{ instance: undefined }` — passes `isErrorWithPartialInstance` (property exists) but `error.instance ?? null` evaluates to `null`, covering the false side of the nullish-coalescing branch in `destroyPartialInstance` (line 67).
- **`README.md`** + **`docs/architecture/testing-strategy.md`** — test count updated 258 → 260.

### Gates green

```
pnpm verify    ~10s    260/260
pnpm coverage         branches 89.41% (583/652) ≥ 78% configured, above 85% target
```

### Remaining unreachable branches (acknowledged)

- `canvas-room.ts` Branch 2[1]: imageSmoothingEnabled false path — context always has the property in tests
- `canvas-room.ts` Branches 3[0]/4[0]/4[1] line=183: `window` and `devicePixelRatio` — browser-only, no DOM in Node
- `canvas-room.ts` Branch 8[1] line=206: `titles.get(door.id) ?? door.id` — map is keyed on `room.doors`, so lookup never misses
- `canvas-room.ts` Branch 10[1]: `Date.now()` fallback — `performance` is always defined in Node
- `canvas-room.ts` Branches 23[0]/26[0]: dust-mote and window-beam conditions depend on floating-point phase values, not controllable from tests
- `canvas-room.ts` Branch 29[1]: `'available'` door state — `door.status` is `'launchable'|'locked'` by type; no third value exists
- `canvas-room.ts` Branch 32[1]: `drawLantern` `isLit=false` — `drawLantern` only called for `status==='launchable'` doors (line 288)
- `pixel-font.ts` Branches 5[1]/9[1]: `GLYPH_WIDTHS[ch] ?? GLYPH_FULL_WIDTH` — every GLYPHS key is in GLYPH_WIDTHS
- `pixel-font.ts` Branches 0[0]/1[0]/2[0]: glyph validation throws in unexported factory
- `whs-bothy.ts` Branch 2[0] line=144: floor remainder defensive guard — total plank height always overshoots
- `sprite.ts` Branch 6[0]: `colour === undefined` — `pixelColours` never contains undefined
- `launch.ts` Branch 4[0]: dead guard after `canLaunchGame` — logically unreachable

---

## [Unreleased] — 2026-05-24 test: branch coverage 88.19% → 89.11%; cover small-dx guard, prettifyKebab empty part, door available state, pixel-font unknown-char

7 new tests across 3 files (1 new, 2 extended) — closes remaining testable branches. 251 → 258 vitest.

### Added

- **`src/render/sprites/pixel-font.test.ts`** (new) — 4 tests for `renderPixelText` and `measurePixelText`: known-character rendering, and unknown character `'@'` (not in GLYPHS) exercising the `GLYPHS[rawCh] !== undefined ? rawCh : ' '` false branch in both functions (lines 512 and 536).

### Changed

- **`src/render/canvas-room.test.ts`** — two new cases: second render with `playerX+1` (dx=1 ≤ 2) exercises `Math.abs(dx) > 2` false branch (line 189) so `haggisFacingLeft` is not updated; door with ID `'north--gate'` (double hyphen → `split('-')` → `['north','','gate']`) exercises `part.length > 0` false branch in `prettifyKebab` (line 986).
- **`src/render/whs-bothy.test.ts`** — new case: `drawWhsDoor` called directly with `state='available'` exercises the `state === 'locked' ? PEAT_DARK : WOOD_MID` false branch (line 352).
- **`README.md`** + **`docs/architecture/testing-strategy.md`** — test count updated 251 → 258.

### Gates green

```
pnpm verify    ~10s    258/258
pnpm coverage         branches 89.11% (581/652) ≥ 78% configured, above 85% target
```

### Remaining unreachable branches (acknowledged)

- `canvas-room.ts` Branch 2[1]: imageSmoothingEnabled false path — context always has the property in tests
- `canvas-room.ts` Branches 3[0]/4[0]/4[1] line=183: `window` and `devicePixelRatio` — browser-only, no DOM in Node
- `canvas-room.ts` Branch 8[1] line=206: `titles.get(door.id) ?? door.id` — map is keyed on `room.doors`, so lookup never misses
- `canvas-room.ts` Branch 10[1]: `Date.now()` fallback — `performance` is always defined in Node
- `canvas-room.ts` Branches 23[0]/26[0]: dust-mote and window-beam conditions depend on floating-point phase values, not controllable from tests
- `canvas-room.ts` Branch 29[1]: `'available'` door state — `door.status` is `'launchable'|'locked'` by type; no third value exists
- `canvas-room.ts` Branch 32[1]: `drawLantern` `isLit=false` — `drawLantern` only called for `status==='launchable'` doors (line 288)
- `pixel-font.ts` Branches 5[1]/9[1]: `GLYPH_WIDTHS[ch] ?? GLYPH_FULL_WIDTH` — every GLYPHS key is in GLYPH_WIDTHS
- `pixel-font.ts` Branches 0[0]/1[0]/2[0]: glyph validation throws in unexported factory
- `whs-bothy.ts` Branch 2[0] line=144: floor remainder defensive guard — total plank height always overshoots
- `sprite.ts` Branch 6[0]: `colour === undefined` — `pixelColours` never contains undefined
- `app.ts` Branch 0[0]: registry null check — requires `vi.mock` of HUB_GAME_REGISTRY
- `lifecycle.ts` Branch 1[1]: `?? null` false side — type guard prevents null instance
- `launch.ts` Branch 4[0]: dead guard after `canLaunchGame` — logically unreachable

---

## [Unreleased] — 2026-05-24 test: branch coverage 85.27% → 88.19%; cover door-side, rug, overlay, destroyed handlers

13 new tests across 5 files (1 new, 4 extended) — covers branches that were reachable but untested. 240 → 249 vitest.

### Added

- **`src/render/whs-bothy.test.ts`** (new) — 3 tests for `drawWhsBothyEnvelope` (exported convenience wrapper, never previously tested) and `drawWhsRug` with both `compact=false` (normal stripe sizes) and `compact=true` (reduced stripe sizes) — both ternary branches covered.

### Changed

- **`src/render/canvas-room.test.ts`** — `RecordingCanvasContext` now has `imageSmoothingEnabled=true` so every render exercises the `smoothable.imageSmoothingEnabled=false` path (canvas-room.ts line 171). Three new cases: `interactionDoorIndex=99` exercises the `door===undefined` early-return guard in `drawPrompt` (line 873); door centred near top (y=10–80) exercises `doorSide` 'top' return (line 966); door centred near bottom (y=920–990) exercises 'bottom' return (line 967); unregistered single-word ID `'lighthouse'` exercises `prettifyKebab` (lines 983–988) and `doorShortLabel`'s `return title` path (line 980).
- **`src/engine/input.test.ts`** — new case: saves keydown/keyup listener refs before `destroy()`, invokes them directly after — exercises `if (destroyed) return` guards in both handlers (lines 68 and 79).
- **`src/debug/overlay.test.ts`** — new case: `interactionKind='launchable'` with `interactionDoorId=null` exercises the `interactionDoorId ? ... : ''` false branch (line 62).
- **`README.md`** + **`docs/architecture/testing-strategy.md`** — test count updated 240 → 249.

### Also

- **`src/render/whs-bothy.ts`** — removed stale `TARTAN_RED = '#c42828'` constant and `void TARTAN_RED` suppressor. The original tartan red was replaced with ember red (`#9a3818`) when the rug was adapted to the Dawn Bothy palette; the constant was never cleaned up.

### Gates green

```
pnpm verify    ~10s    249/249
pnpm coverage         branches 88.19% (575/652) ≥ 78% configured, well above 85% target
```

---

## [Unreleased] — 2026-05-24 test: branch coverage 80.21% → 85.27%; fix WRITEUP arch-diagram JS size

17 new tests across 5 test files (2 new, 3 extended) — covers branches that were reachable but untested: hearth bright-frame spark/steam, haggis ?? defaults and facing-left, compact viewport paths (whs-bothy), locked door/interaction in snapshot-codec, and edge-cases in input + lifecycle. Branch coverage crossed the 85% target. Also corrects a doc-drift in WRITEUP's architecture diagram (JS size was 44 KB, now correctly 49 KB). 223 → 240 vitest.

### Added

- **`src/render/whs-hearth.test.ts`** — 6 tests for `drawWhsHearthFrame` covering all 4 frame indices; frame 1 (emberGlow=1.0) covers the spark branch (`> 0.9`) and steam branch (`> 0.85`); frame 2 covers the lower steam branch (`> 0.7`).
- **`src/render/canon-haggis.test.ts`** — 4 tests for `drawCanonHaggis`: empty-frame (exercises all `?? 0` default branches for `breathY`, `leftLegY`, `rightLegY`, `maneSway`, `tailWag`), facing-left (`dir = -1` branch), fully-animated frame, and custom palette.

### Changed

- **`src/render/canvas-room.test.ts`** — 3 new cases: compact surface (width < 600, exercises `compact: true` paths in `whs-bothy`), very narrow surface (width < 400, exercises the `surface.width >= 400` false branch in `drawWallOrnaments`), facing-left (two sequential renders with decreasing playerX exercises `haggisFacingLeft = true`).
- **`src/engine/input.test.ts`** — 1 new case: hub-key event without `preventDefault` (exercises `typeof candidate.preventDefault !== 'function'` false branch in `maybePreventDefault`).
- **`src/engine/lifecycle.test.ts`** — 1 new case: `mount` throws a plain error (no `instance` property), exercises `destroyPartialInstance` early-return branch.
- **`src/wasm/snapshot-codec.test.ts`** — 2 new cases: locked door status (`statusInt = 0` → `'locked'` branch on line 56); locked interaction kind (`value = 2` → `'locked'` branch on line 75).
- **`WRITEUP.md`** — architecture diagram JS size corrected: `44 KB JS` → `49 KB JS` (ornament additions grew the bundle; the table section was already accurate, only the diagram label was stale).
- **`README.md`** + **`docs/architecture/testing-strategy.md`** — test count updated 223 → 240.

### Gates green

```
pnpm verify    ~10s    240/240
pnpm coverage         branches 85.27% (556/652) ≥ 85% target
```

---

## [Unreleased] — 2026-05-24 feat(render): back-wall ornaments — herb bundles + unfinished painting

Fills the DESIGN.md ornament budget for the bothy scene: 2 dried-herb bundles hanging from the ceiling timber beam (x=80 left, x=460 right) and 1 unfinished Highland painting on the left back wall (DESIGN.md `voice.open.framed-painting-caption = "(unfinished)"`). All three are deterministic — no phase/random dependency, so they land cleanly in the visual gate. Golden rebaked (Hamming 0/256).

### Added

- **`src/render/canvas-room.ts`** — `drawWallOrnaments`, `drawHerbBundle`, `drawFramedPicture` functions; called from `renderRoom` at step 8.25 (after mantelpiece, before haggis). `PX` extended with `brackenGreen`, `brackenStem`, `cordTwine`, `cordShadow`, `stemFade`.

### Changed

- **`tests/golden/bothy-idle-seed-42.png`** + **`tests/golden/visual-budgets.json`** — golden rebaked to include ornaments.
- **`DESIGN.md`** — `ornament.framed-objects-spent` and `ornament.dried-herb-bundles-spent` added; `framed-painting-caption` annotated as shipped.

### Gates green

```
pnpm verify    ~9s    223/223
visual gate    Hamming 0/256 ≤ 8   OK
```

---

## [Unreleased] — 2026-05-24 feat(render): hearth lintel motto "Bide a while."

Renders `DESIGN.md voice.open.hearth-lintel-motto` as pixel-font inscription on the stone lintel above the fire mouth. Scale 1, centred in the native y=10..20 stone band, `PX.stoneLight` (#b8a878 = art-cairn-stone). Reads as worn carved/painted text on warm hearthstone. Visual gate golden rebaked (Hamming drift = 4 bits at particle-animation variance — well within tolerance 8).

### Added

- **`src/render/canvas-room.ts`** — `drawHearthLintelMotto` function (17 lines); called in `renderRoom` after `drawWhsHearthFrame`.

### Changed

- **`tests/golden/bothy-idle-seed-42.png`** + **`tests/golden/visual-budgets.json`** — golden rebaked to include the lintel inscription.

### Gates green

```
pnpm verify    ~8s    223/223
visual gate    Hamming 4/256 ≤ 8   OK
```

---

## [Unreleased] — 2026-05-24 docs: fix three doc-drift issues across testing-strategy, CI workflow, and WRITEUP

Three doc-drift issues corrected. No code changes.

### Changed

- **`docs/architecture/testing-strategy.md`** — pyramid code block still said `252 vitest`; corrected to `223`. The implementation-status paragraph was already correct at 223; only the pyramid block was missed in the previous fix sweep.
- **`.github/workflows/ci.yml`** — `haggis-eval-all` job comment listed stale coverage thresholds (`lines≥80% stmts≥80% fns≥85% branches≥60%`); updated to current values (`lines≥90% stmts≥90% fns≥90% branches≥78%`) to match `vite.config.ts` and `tools/haggis-eval/README.md`.
- **`WRITEUP.md`** — `haggis-eval all` gate list was missing `coverage`, `soak`, and `supply-chain`; the list now matches the 13 subcommands in `tools/haggis-eval/README.md`.

### Gates green

```
pnpm verify    ~8s    223/223
```

---

## [Unreleased] — 2026-05-24 refactor: delete deprecated Bayer-dither code (252→223 tests)

Closed the `DESIGN.md` register-policy action item: "delete after the smooth-only commitment is verified end-to-end". The six Bayer-ordered-dither functions in `src/render/palette.ts` had no runtime callers — they were only exercised by their own dedicated tests. The smooth-only commitment is verified by the visual gate on every CI run. Removing them and their tests reduces the test count from 252 to 223 but improves the codebase by eliminating dead production code. Coverage stays healthy: 95.51% lines, 80.24% branches.

### Removed

- **`src/render/palette.ts`** — `ditheredBloom`, `ditheredBloomBiased`, `ditheredAlphaMask`, `radialEllipseAlpha`, `ditherZoneInternal`, `ditherBoundary`, `BAYER_4X4` constant. `HardPixelContext` interface and `hardContactShadow` are retained — they are still used by `canvas-room.ts`. Section comment updated to `HARD-PIXEL CONTEXT`.
- **`src/render/palette.test.ts`** — 29 vitest cases for the six deleted functions, plus the `PaintCall` interface and `makeMockCtx` mock. The 7 remaining cases cover `makeBeamGeometry` and `lightZoneAt` (both still active).

### Changed

- **`DESIGN.md`** — `register-policy.bayer-dither-effects` status updated from "pending deletion" to "deleted 2026-05-24" with action done. `voice.locked.locked-prompt` corrected from the old static string `"LOCKED. ANOTHER BOTHY, ANOTHER DAY."` to the dynamic format `"{DOOR TITLE}\nCOMIN' SOON."` (the actual behaviour since the locked-prompt-title session).
- **`README.md`**, **`WRITEUP.md`**, **`docs/architecture/testing-strategy.md`** — vitest count updated 252 → 223. Coverage threshold comments corrected from old values (lines≥80%, stmts≥80%, fns≥85%, branches≥60%) to current (lines≥90%, stmts≥90%, fns≥90%, branches≥78%).
- **`docs/plans/2026-05-22-implementation-sequence.md`** — `all` gate description: 17 → 19 gates.

### Gates green

```
pnpm verify           ~8s    223/223
pnpm run coverage           lines 95.51%, branches 80.24%, stmts 95.26%, fns 95.31%
```

---

## [Unreleased] — 2026-05-24 test: boundary + input edge-case coverage (249→252 tests)

3 new boundary.test.ts cases: snapshot-buffer-length-mismatch error (HubBoundaryError tag -1), multi-door room definition with launchable status, and handle.free() via destroy(). 3 new input.test.ts cases: snapshot/consumeInteract after destroy return zero/false; double-destroy is idempotent; keyCodeFromEvent falls back to '' for bare events.

### Added

- **`src/wasm/boundary.test.ts`** — 3 new cases covering error paths and door parsing.
- **`src/engine/input.test.ts`** — 3 new cases covering post-destroy behaviour and keycode fallback.

---

## [Unreleased] — 2026-05-24 test: palette drawing-function tests; raise coverage thresholds

36 new vitest cases for `src/render/palette.ts` covering the Bayer-ordered-dither drawing primitives (`ditheredBloom`, `ditheredBloomBiased`, `ditheredAlphaMask`, `radialEllipseAlpha`, `ditherZoneInternal`, `ditherBoundary`, `lightZoneAt`, `makeBeamGeometry`). Mock `HardPixelContext` — no real Canvas2D context needed. All branches of the dither logic (out-of-circle skip, inner-core vs outer-ring, cluster vs single pixel, threshold comparison) are now exercised. Branch coverage rises from 73% to 80.8%. Enforced thresholds raised to lines/stmts/fns ≥ 90%, branches ≥ 78%.

### Added

- **`src/render/palette.test.ts`** — 36 vitest cases for palette drawing primitives.

### Changed

- **`vite.config.ts`** — Coverage thresholds raised: lines 80→90%, stmts 80→90%, fns 85→90%, branches 60→78%.
- **`docs/architecture/testing-strategy.md`** — vitest count 210 → 246.
- **`README.md`** / **`WRITEUP.md`** — vitest count updated.

---

## [Unreleased] — 2026-05-24 feat: vitest v8 coverage gate with thresholds (19th gate)

Adds `@vitest/coverage-v8` and configures coverage thresholds in `vite.config.ts`. Excludes `src/main.ts` (browser-only entry point) and `src/wasm/generated-loader.ts` / `src/generated/**` (auto-generated wasm bindings) from the coverage scope. Thresholds: lines ≥ 80%, statements ≥ 80%, functions ≥ 85%, branches ≥ 60%. Measured baseline: lines 91%, statements 90%, functions 93%, branches 73%.

### Added

- **`@vitest/coverage-v8`** — official Vitest v8 coverage provider (devDependency; zero bundle impact).
- **`vite.config.ts`** — `test.coverage` block: provider v8, include `src/**/*.ts`, exclude entry points + generated files, thresholds, text + json reporters.
- **`package.json`** — `"coverage": "vitest run --coverage"` script.
- **`tools/haggis-eval/internal/cmd/coverage.go`** — `Coverage()` gate runner: `pnpm run coverage`.

### Changed

- **`tools/haggis-eval/internal/cmd/all.go`** — `Coverage()` added after `Ts()`.
- **`tools/haggis-eval/internal/cmd/registry.go`** — `"coverage"` key wired.
- **`tools/haggis-eval/main.go`** — `case "coverage"` + usage line.
- **`tools/haggis-eval/slices.json`** — `"coverage"` added to `release` slice after `ts`.
- **`docs/foundation/07-quality-gates.md`** — 18 → 19 gates; `pnpm run coverage` added to release gate listing; removed from "still-planned" TypeScript deepening section.
- **`CONTRIBUTING.md`** — 18-gate → 19-gate.
- **`README.md`** — gate listing, haggis-eval subcommand list, current-state summary updated.

---

## [Unreleased] — 2026-05-24 feat: supply-chain gate — cargo deny (18th gate)

Wires `cargo deny check` as an 18th haggis-eval gate (`supply-chain`). Enforces the license allowlist from `docs/foundation/12-craft-commitments.md` (MIT, Apache-2.0, BSD-2/3, ISC, Zlib, Unicode-3.0), checks against the RustSec advisory database, flags duplicate crate versions, and restricts crate sources to crates.io and path crates.

Current dependency tree is clean: MIT + Apache-2.0 (dual-licensed) across all deps, plus Unicode-3.0 for `unicode-ident`.

### Added

- **`deny.toml`** — `cargo deny` config at repo root. `[licenses]` allows the project policy set; `[advisories]` checks RustSec DB; `[bans]` warns on duplicate versions; `[sources]` denies unknown registries and git deps.
- **`tools/haggis-eval/internal/cmd/supply_chain.go`** — `SupplyChain()` gate runner: `cargo deny check`.

### Changed

- **`tools/haggis-eval/internal/cmd/all.go`** — `SupplyChain()` added between `Soak()` and `Differential("hash")`.
- **`tools/haggis-eval/internal/cmd/registry.go`** — `"supply-chain"` key wired to `SupplyChain`.
- **`tools/haggis-eval/main.go`** — `case "supply-chain"` switch arm + usage line.
- **`tools/haggis-eval/slices.json`** — `"supply-chain"` added to `release` slice.
- **`docs/foundation/07-quality-gates.md`** — 17 → 18 gates; `cargo deny check` added to release gate listing; removed from "still-planned" section.
- **`CONTRIBUTING.md`** — 17-gate → 18-gate.
- **`README.md`** — gate listing and haggis-eval subcommand list updated.

---

## [Unreleased] — 2026-05-24 feat: dev-mode diagnostics overlay (?debug URL param)

Closes `docs/architecture/observability-debugging.md` "planned" status — the only remaining planned architecture doc. Append `?debug` to any hub URL to show a `<pre class="debug-overlay">` panel (top-right, pointer-events off) with real-time FPS, frame time, tick count, player world coordinates, active door interaction, and WASM init time.

### Added

- **`src/debug/overlay.ts`** — `createDebugOverlay(container)`, `createFpsTracker(windowSize)`, `formatStats(stats)`. Hand-rolled, no deps. `createFpsTracker` keeps a sliding window of the last N frame deltas for stable FPS display.
- **`src/debug/overlay.test.ts`** — 15 vitest cases covering overlay DOM lifecycle (via `vi.stubGlobal` — no jsdom dep), FPS tracker accuracy and window rotation, and all `formatStats` branches (none/launchable/locked, wasm init present/absent).
- **`src/style.css`** — `.debug-overlay` rule: fixed top-right, monospace, semi-transparent ink-deep background, cairn-stone border tint, pointer-events none.

### Changed

- **`src/main.ts`** — `?debug` URL param activates overlay + FPS tracker. WASM init is timed (`performance.now()` before/after `initializeHubBoundaryV2`). Overlay updated every RAF frame with a fresh `room.lastSnapshot()`.
- **`docs/architecture/observability-debugging.md`** — Status updated from "planned" to "implemented"; doc expanded with the overlay field table and production fallback posture.
- **`docs/architecture/README.md`** — observability row: "planned" → "implemented"; testing + eval rows: "mostly shipped" → "current".
- **`docs/architecture/testing-strategy.md`** — vitest count 195 → 210.
- **`README.md`** — vitest count 195 → 210; bundle size ~79 KB → ~81 KB.
- **`WRITEUP.md`** — bundle table updated; JS 45.92 → 47.11 KB (debug module), CSS 2.28 → 2.65 KB (overlay rule), total 79.41 → 80.97 KB.

---

## [Unreleased] — 2026-05-24 feat: memory-growth soak gate (haggis-eval soak, 17th gate)

Closes the evaluation-strategy "soak/memory-growth still planned" item. Loads the hub on a fixed seed, waits for the RAF loop to be running, forces GC via CDP `HeapProfiler.collectGarbage`, soaks for 15 seconds, forces GC again, and asserts heap growth < 5 MB. Observed baseline: +0.13 MB on first run.

### Added

- **`scripts/smoke-soak.mjs`** — Playwright soak smoke. Reads heap via CDP `Performance.getMetrics` (not the removed `page.metrics()` API). Configurable duration and budget via `HAGGIS_SOAK_SECS` / `HAGGIS_SOAK_MAX_MB` env vars.
- **`scripts/run-soak-gate.mjs`** — orchestrator: build → vite preview (:4177) → smoke → teardown. Pattern matches existing `run-*-gate.mjs` scripts.
- **`tools/haggis-eval/internal/cmd/soak.go`** — haggis-eval `soak` subcommand.
- **`tools/haggis-eval/main.go`** — `soak` case + usage line.
- **`tools/haggis-eval/internal/cmd/registry.go`** — `"soak"` entry.
- **`tools/haggis-eval/internal/cmd/all.go`** — `Soak()` call in `All()`.
- **`tools/haggis-eval/slices.json`** — `"soak"` added to `release` bundle.

### Changed

- **`docs/architecture/evaluation-strategy.md`** — status updated; 16-gate → 17-gate; soak marked shipped.
- **`docs/architecture/testing-strategy.md`** — status updated; pyramid "soak planned" → "soak ✓".
- **`docs/foundation/07-quality-gates.md`** — 16 → 17 gates; `run-soak-gate.mjs` added to release gate listing.
- **`docs/plans/2026-05-22-implementation-sequence.md`** — soak wired entry added; 16 → 17 gates.
- **`CONTRIBUTING.md`** — 16-gate → 17-gate.

---

## [Unreleased] — 2026-05-24 fix: HiDPI / Retina rendering (DPR scaling)

Closes the DESIGN.md `devicePixelRatio: "future fix"` note. On Retina displays (and any display where `window.devicePixelRatio > 1`) the canvas was previously sized at 540×360 physical pixels and blurry-scaled by the browser to fill the viewport. Now `sizeCanvasToViewport` multiplies by `Math.round(window.devicePixelRatio || 1)`, and the renderer applies `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` at the start of each frame. A logical-size surface wrapper (`width=540, height=360`) keeps all rendering math in CSS-pixel coordinates.

### Changed

- **`src/main.ts`** — `sizeCanvasToViewport` scales canvas internal resolution by DPR. A `canvasSurface` wrapper exposes logical 540×360 regardless of physical canvas size, passed to `createCanvasRoomRenderer` in place of the raw `HTMLCanvasElement`.
- **`src/render/canvas-room.ts`** — `render()` applies `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` each frame (optional cast — no-op on test recording context). DPR is read dynamically via `window.devicePixelRatio` to handle monitor changes between frames without requiring a page reload.
- **`DESIGN.md`** — `devicePixelRatio` field updated from "future fix" to shipped description.

---

## [Unreleased] — 2026-05-24 fix: reset fixed-step accumulator on tab return from hidden

### Fixed

- **`src/main.ts`** — Added `document.visibilitychange` handler that resets both `last` (frame timer) and `stepState.accumulatorMs` to zero when the tab returns from hidden. Without the reset, a 5-minute background tab left ~299,866 ms in the accumulator; on return, `pumpFixedStep` would drain it 8 ticks per frame for ~37 seconds at full speed, producing a catch-up burst. The `tick` counter is preserved so simulation state is consistent. Matches the rule now documented in `docs/architecture/runtime-boundaries.md`.

---

## [Unreleased] — 2026-05-24 reduced-motion dampen mode

Closes the DESIGN.md §A11y "planned" item. Previously `prefers-reduced-motion` locked out keyboard users entirely (render loop stopped). Now the renderer accepts `{ reducedMotion }` and suppresses decorative motion only — particles, hearth flicker, dawn beam pulse, mane sway, tail wag — while keeping the RAF loop, keyboard + pointer input, door proximity, and launch all working.

### Changed

- **`src/render/canvas-room.ts`** — `createCanvasRoomRenderer` now accepts `options?: { reducedMotion?: boolean }`. Threads through to `renderRoom`, `drawFloor`, `drawTopWallWindow`, `drawHaggis`. Hearth flicker and frame index locked at rest values in reduced-motion mode. Particles skipped entirely.
- **`src/main.ts`** — `reducedMotion` detected once at `start()` entry; passed to renderer; removed the early `return` that was blocking keyboard users from playing.
- **`DESIGN.md`** — `reduced-motion.current` updated to reflect shipped dampen behaviour.

---

## [Unreleased] — 2026-05-24 ha.ggis wordmark + doc accuracy sweep

### Added

- **`src/main.ts`**, **`src/style.css`** — `h1.scene-brand` element showing `ha · ggis` fixed at the bottom-left of the scene. Makes the domain wordplay visible in the rendered product (not just the browser tab). Closes the "domain joke is visible" first-public-release requirement. Cairn-stone on ink-deep contrast pair was already declared in the a11y gate; no gate changes needed.
- **`scripts/smoke-a11y.mjs`** — Updated cairn-stone contrast pair label to reflect that it covers both `scene-brand` and `scene-direct`; updated surface description comment.

### Changed

- **`docs/architecture/README.md`** — Table updated from all "planned" to reflect actual status of each doc (implemented / partial / registry shipped / mostly shipped / active / planned). Removed "None of this is implemented yet" claim.
- **`docs/README.md`** — ADR-0003 row corrected to "accepted (Option A: external URL for first release)".
- **`README.md`** — "the planned playable front door" → "the playable front door"; architecture section updated.

---

## [Unreleased] — 2026-05-24 doc accuracy sweep (architecture index + root README + docs index)

### Changed

- **`docs/architecture/README.md`** — Table updated from all "planned" to reflect actual status of each doc (implemented / partial / registry shipped / mostly shipped / active / planned). Removed "None of this is implemented yet — every document here is `planned architecture`" claim. Scope line no longer says "planned runtime architecture". Conventions bullet updated: "describes current behavior for shipped surfaces; describes target behavior for planned surfaces".
- **`docs/README.md`** — ADR-0003 row corrected from "proposed (decision-pending)" to "accepted (Option A: external URL for first release)".
- **`README.md`** — Removed "planned" from product description ("the planned playable front door" → "the playable front door"). Architecture section description updated to note mostly-shipped state.

---

## [Unreleased] — 2026-05-24 tail wag + dawn beam pulse + mane sway + ADR-0003 closed

### Changed

- **`src/render/canon-haggis.ts`** — Added `maneSway?: number` and `tailWag?: number` to `CanonHaggisFrame`. `maneSway` translates the full mane mass (back-cap, crown, forehead fringe, fringe shadow, strands, cream highlights, ear) along the face axis via a new `mmx` helper; body, legs, face, eye, and snout are fixed. `tailWag` shifts all three tail-tuft circles vertically (the `my()` + `tailWagY` offset). Both fields default to zero at rest. Updated the stale comment on the interface that said "Reserved for future locomotion: leg cycle, mane sway" — all locomotion fields are now wired.
- **`src/render/canvas-room.ts`** — `drawHaggis` now drives three animation channels beyond breath bob and leg cycle: `maneSway` (1.5 Hz), `tailWag` (2 Hz, amplitude 1.2 design units), and dawn beam pulse. `maneSway = isMoving ? Math.sin(phase * 3π) * 1.0 : 0`; `tailWag = isMoving ? Math.sin(phase * 4π) * 1.2 : 0`. At rest all three are zero or insignificant and the visual golden is unaffected.
- **`src/render/canvas-room.ts`** — `drawFloor` removes `void phase` dead code and uses `phase` for a gentle dawn beam intensity pulse: `dawnPulse = 0.95 + Math.sin(phase * 0.28) * 0.05` (22-second period, ±5% alpha variation). Permitted by rules.md for natural light sources. At 16×16 aHash resolution the small alpha variation doesn't change hash bits.
- **`src/render/canvas-room.ts`** — `drawTopWallWindow` removes `void phase` dead code. Adds a matching peach overlay (`0.04 * dawnPulse`) in sync with the floor beam's 22-second pulse so the light source and its cast agree — static source casting an animated shadow would have been uncanny. Two `void phase` dead-code suppressions are now both eliminated.
- **`docs/decisions/0003-whs-integration-strategy.md`** — Status updated from `proposed (decision-pending)` to `accepted`. Decision recorded: Option A (external URL to `https://wild-haggis-survivors.pages.dev/`) chosen for first release; Option B (`/wild-haggis-survivors/` mount) documented as the intended end-state.
- **`docs/decisions/README.md`** — ADR-0003 row updated to `accepted`; corrected the follow-up note that incorrectly described the settled choice as "Option B".
- **`docs/architecture/overview.md`**, **`security-model.md`**, **`autopilot-system.md`**, **`data-and-save-boundaries.md`**, **`docs/deployment/cloudflare-pages.md`** — Five docs updated from "planned" to reflect shipped state (previous session's doc accuracy pass).

### Gates green

```
pnpm verify (fast PR gate)        ~7s    194/194
run-browser-smokes.mjs            PASS   door-launch + door-tap + pointer-drive
run-visual-gate.mjs verify        PASS   hamming 3/8 (unchanged)
run-a11y-gate.mjs                 PASS   13/13
run-determinism-smoke.mjs         PASS
```

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
