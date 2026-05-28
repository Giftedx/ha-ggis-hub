# ha.ggis Hub — engineering writeup

> A ~92 KB hand-rolled Rust + WASM + TypeScript playable hub, with three-language FNV-1a, a WAT-authored RNG, cryptographically signed eval reports, and Mozilla Observatory A+. The visible product is the bothy; this writeup is for the layer underneath.

**Live:** <https://ha.ggis.xyz/>
**Repo:** private during development — public on first release.
**Sister project:** [Wild Haggis Survivors](https://wild-haggis-survivors.pages.dev/) (linked from the hub)

---

## The pitch in one paragraph

`ha + ggis = haggis`. The URL is the joke. The product is a wee front door — a playable bothy room at dawn where the visitor walks The Wee Chieftain, a living whole-haggis food mascot, up to a door and that door launches one of a planned family of haggis-themed Highland games. Wild Haggis Survivors is the first game in the family; more doors will open. The hub itself is intentionally small in scope, with the engineering bar set deliberately high underneath, to demonstrate that "small" and "perfect" can coexist without the project becoming either a generic landing page or a barely-working MVP.

## The architecture, in one diagram

```
┌─────────────────────────────────────────────────────────┐
│  TypeScript / Vite host  (55 KB JS, strict mode)        │
│  - Lifecycle, input sampling, fixed-step pump           │
│  - Pointer-drive + keyboard, single launch entry point  │
│  - Hand-rolled Canvas2D renderer (no engine, no library)│
│  - Generated WASM loader + decoded snapshot codec       │
└───────────────────────────┬─────────────────────────────┘
                            │ typed boundary
┌───────────────────────────┴─────────────────────────────┐
│  hub-wasm  (Rust → wasm32-unknown-unknown, 28 KB)       │
│  - Single seam for the host. wasm-bindgen-free.         │
└───────────────────────────┬─────────────────────────────┘
                            │ pure Rust API
┌───────────────────────────┴─────────────────────────────┐
│  hub-core  (Rust, deterministic)                        │
│  - Position, bounds, input vector, player state, doors  │
│  - Fixed-tick movement + door proximity                 │
│  - FNV-1a state hash (canonical reference impl)         │
└─────────────────────────────────────────────────────────┘

┌─── Separately exercised, not on runtime path ──────────┐
│  hub-hardlang  (Rust + C FFI + WAT)                    │
│  - C FNV-1a kernel (c/fnv1a.c) + Rust safe wrapper     │
│  - WAT xoshiro128** (asm/xoshiro128_starstar.wat)      │
│  - Diff-tested vs hub-core across 100 000+ cases       │
└────────────────────────────────────────────────────────┘

┌─── Orchestration ──────────────────────────────────────┐
│  haggis-eval  (Go, stdlib only)                        │
│  - Wraps every project gate behind one CLI             │
│  - Emits cryptographically signed JSON reports         │
└────────────────────────────────────────────────────────┘
```

## What's interesting

### Three independent FNV-1a 64 implementations, byte-for-byte identical

The FNV-1a 64 hash is implemented three times, on purpose, in three languages, and diff-tested in CI against the four published canonical reference vectors.

| Language | Path | Used for |
|---|---|---|
| Rust | `crates/hub-core/src/hash.rs` | Runtime state hash on every snapshot, used by the determinism smoke test |
| C    | `c/fnv1a.c` (linked into `crates/hub-hardlang` via `cc` build-script) | Differential test target; demonstrates the Rust FFI seam |
| Go   | `tools/haggis-eval/internal/fnv/` | Signs the orchestrator's JSON reports |

Reference vectors (agreed by all three impls):

```
""                  → 0xcbf29ce484222325
"a"                 → 0xaf63dc4c8601ec8c
"foobar"            → 0x85944171f73967e8
"chongo was here!\n"→ 0x46810940eff5f915
```

Reproduce: `cargo test --workspace --exclude hub-wasm` (Rust + C), `cd tools/haggis-eval && go test ./internal/fnv/` (Go).

The C kernel exists in a single Rust crate (`hub-hardlang`) which is also the *only* crate in the workspace allowed to relax the `unsafe_code = "forbid"` lint, and only to `deny` with one scoped `#![allow(unsafe_code)]` block for the `extern "C"` declaration. Every other crate stays strictly safe.

### WAT xoshiro128\*\* compiled at test time

`asm/xoshiro128_starstar.wat` is hand-written WebAssembly Text implementing Blackman & Vigna's xoshiro128\*\* PRNG. The integration test at `crates/hub-hardlang/tests/differential_rng.rs` compiles it via the `wat` crate, instantiates under `wasmi`, and differentially exercises it against the Rust reference implementation in `hub-core::rng` across 100 000+ cases.

The WAT and `wasmi` are `[dev-dependencies]` — they never enter the production build graph. The runtime hub uses only the Rust implementation; the WAT lives to prove the bytecode-level kernel agrees.

### Property tests for deterministic core invariants

Six proptest scenarios cover invariants that are hard to exhaust with example-based tests:

- **Bounds invariant** (`sim.rs`): for any seed and any sequence of up to 50 ticks with arbitrary axis inputs, player position stays within `[PLAYER_HALF, WORLD_W - PLAYER_HALF] × [PLAYER_HALF, WORLD_H - PLAYER_HALF]`. Exercises the clamping arithmetic across the full i8 input space and across varied starting states.
- **Input signum** (`sim.rs`): `from_axes(x, y, interact).x() == x.signum()` for all 256 `i8` values. The explicit tests only checked {−127, 0, 127}; this one proves the match arms are exhaustive.
- **Interaction hitbox geometry** (`sim.rs`): for any valid in-bounds player position, the interaction kind reported by the snapshot matches what the `INTERACTION_CENTER_ABOVE_FEET` geometry predicts by computing the AABB intersection manually. Covers the full position space rather than hand-crafted examples, proving the hitbox shift constant is applied consistently.
- **Replay faithfulness** (`replay.rs`): for any seed and any `btree_map` of 0–10 input changes (sorted, deduplicated tick_indexes → valid log order), drives a `Sim` directly while writing to a `LogWriter`, then replays the log and asserts the final state hashes and tick counts match. Proves replay correctness across arbitrary sessions, not just the fixed 20-tick scripted test.
- **Log round-trip** (`log.rs`): any set of records encodes and decodes with seed, record count, tick_indexes, input axes, and final hash all preserved exactly. Exercises the FNV-1a body digest for arbitrary payloads.
- **Hash streaming** (`hash.rs`): `update()` in arbitrary chunk sizes produces the same digest as `update()` in one shot. The existing `rng.rs` scenarios add determinism and bounded-output coverage.

### Cryptographically signed gate reports

`haggis-eval all` runs every wired gate (`rust`, `rust-cov`, `ts`, `coverage`, `security`, `perf`, `browser`, `multi-browser`, `determinism`, `visual`, `a11y`, `soak`, `supply-chain`, `differential rng`, `differential hash`) and writes a single JSON report to `target/haggis-eval/all-<utc>.json`. The report has a `signature` field which is the FNV-1a 64 hash of the report's own payload (every other field). Re-hashing the payload reproduces the signature; any post-hoc edit changes the hash and the report no longer validates.

This is not strong cryptography — anyone can re-sign an edited report. It's a tamper-*evidence* primitive: a deploy log can record signatures, and a divergent signature on re-verification proves the report was rewritten between gate execution and deploy capture.

### ~92 KB total client bundle

| Asset | Size | Gzip |
|---|---|---|
| `dist/index.html` | 3.60 kB | 1.29 kB |
| `dist/assets/index-*.js` | 54.99 kB | 18.58 kB |
| `dist/assets/hub_wasm_bg-*.wasm` | 28.01 kB | 12.69 kB |
| `dist/assets/index-*.css` | 5.25 kB | 1.55 kB |
| **Total** | **91.85 kB** | **34.11 kB** |

For comparison, the median JS bundle of the [HTTP Archive top-1M sites](https://httparchive.org/) is ~500 KB compressed. The hub ships under 35 KB compressed for a full Rust + WASM + TypeScript playable hub with a deterministic core, a fixed-step simulation, an input log writer, a procedural Canvas2D renderer with painted WebP backdrop, a pointer-drive + keyboard input layer, a snapshot codec, a registry with launch planning, opt-in hub music, self-hosted Old Standard TT serif, and hand-rolled wall ornaments (two herb bundles + one unfinished painting) in the bothy scene.

There is no UI framework, no game engine, no Tailwind, no PostCSS, no Lodash, no animation library. Vite is the build tool; Prettier enforces consistent formatting. That's it.

### Strict security posture

`public/_headers` ships:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Origin-Agent-Cluster: ?1`
- `Content-Security-Policy: default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self' 'wasm-unsafe-eval'; …` — no `unsafe-eval`, only the `wasm-unsafe-eval` token required for WebAssembly compilation.
- A `Permissions-Policy` line denying ~30 features explicitly, including `browsing-topics=()` and `interest-cohort=()` (no Topics API, no FLoC).

These are not "set it and forget it" — `scripts/deploy-config.test.ts` asserts that every required header is present, that the CSP locks the right directives, and that hashed assets get the immutable cache while HTML stays must-revalidate. CI catches any accidental relaxation before deploy.

### ADR discipline + autopilot rules

Every architectural decision is a numbered, dated, status-tracked record in `docs/decisions/` with supersession links. Six ADRs cover renderer choice, language and craft philosophy, WHS integration boundary, the Canvas2D first-room renderer, and the Highland-dawn-bothy visual direction.

The project is explicitly autopilot-friendly: `AGENTS.md` is the agent-side entry point, listing required reading order before any edit, the prime rule (do not implement from archived plans), and behavioural constraints (do not add dependencies without rationale, do not weaken gates, update docs when design changes). This is paired with a quality manifesto that states the bar: "perfect at the current stage, or actively being made perfect — doing nothing is not acceptable while the foundation is unfinished, cutting corners is not acceptable because the corner will become the architecture."

The autopilot rules also have known limits: agents handle the engineering layer well because gates are machine-checkable; they handle aesthetic less well because no machine oracle exists for "does this look right". The first iteration of a **visual gate** now ships at `scripts/smoke-visual-gate.mjs` — capture the playfield canvas at a deterministic seed plus fixed animation phase, resize to 16×16 grayscale via `sharp`, compute a 256-bit average hash, compare against the recorded golden via Hamming distance with per-scene tolerance. Catches palette and layout drift while keeping animation timing from spending the Hamming budget. First iteration; the script is one function-swap away from pHash or pixel-level pixelmatch if stronger guarantees become useful. See `tests/golden/README.md`.

## Reproduce locally

```bash
# Repo is private during development; replace with your fork / mirror.
cd ha-ggis-hub

# TypeScript + Vite host
pnpm install --frozen-lockfile
pnpm verify          # tsc --noEmit → eslint → prettier --check → vitest 222 cases → vite build → verify-dist
pnpm run coverage    # vitest v8 coverage (100% lines/stmts/fns/branches — enforced by threshold)

# Rust workspace
cargo fmt --all -- --check
cargo test --workspace --exclude hub-wasm
cargo clippy --workspace --all-targets -- -D warnings
RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown
# Rust coverage (requires: rustup component add llvm-tools-preview; cargo install cargo-llvm-cov)
cargo llvm-cov --workspace --exclude hub-wasm --fail-under-lines 100 --fail-under-functions 100

# Single-binary orchestrator (runs everything above + signs a JSON report)
cd tools/haggis-eval && go build .
./haggis-eval all
cat target/haggis-eval/all-*.json | jq .
```

Browser smokes (each builds dist + spins up `vite preview` internally — no external server needed):

```bash
node scripts/run-browser-smokes.mjs    # 7 chromium smokes: door-launch + door-tap + pointer-drive + music-toggle + reduced-motion + locked-door + a11y
PLAYWRIGHT_BROWSER=firefox node scripts/run-browser-smokes.mjs  # 6 core smokes on Firefox
PLAYWRIGHT_BROWSER=webkit  node scripts/run-browser-smokes.mjs  # 6 core smokes on WebKit
node scripts/run-determinism-smoke.mjs # same-seed state-hash equality across runs
node scripts/run-visual-gate.mjs verify # perceptual aHash diff vs tests/golden/
node scripts/run-a11y-gate.mjs          # 26 WCAG 2.2 AA spot-checks (hand-rolled)
node scripts/run-soak-gate.mjs          # memory-growth soak (15s; heap budget 5 MB)
cargo deny check                        # license compliance + RustSec advisories
cargo machete                           # unused Rust dependencies
gitleaks detect --source . --no-banner  # secret scan across git history
osv-scanner --recursive .               # cross-ecosystem CVE scan (Cargo + npm + Go)
```

## Where the art now stands

The scene composites a painted 1080×720 Highland Dawn Bothy backdrop (WebP at [`public/art/bothy-storybook-backdrop.webp`](public/art/bothy-storybook-backdrop.webp)) over a procedural Canvas2D diorama that acts as the fallback when the image has not loaded. The backdrop carries the main composition — stone inglenook hearth, panoramic dawn through the back window, shelf props, flagstone floor — while the procedural layer remains the interactive gameplay surface: door hit-tests, door grounding, the hearth lintel "BIDE A WHILE." motto, and the haggis walk cycle all run on Canvas2D regardless of backdrop state. Door fixtures are Canvas2D overlays on both paths: the launchable door gets a lit lantern and a full-brightness bone-coloured sign; the locked door gets a dimmed heather-purple sign at 0.65 opacity — same sprite, same pixel font, different colour and alpha so the distinction reads immediately without the locked door disappearing entirely.

The haggis is a fresh hub-original drawer at [`src/render/bothy-haggis.ts`](src/render/bothy-haggis.ts) — the Wee Chieftain — designed around the food joke that gives the creature its name. The shape language is the dish itself: squat cooked casing with surface oat flecks and seam texture so the mascot reads as food rather than a brown oval. Large cream eyes (outline 4.8×, white 4.0×, eyelid arc half-covering the top so the look is focused rather than vacant), bold single-arc brows at 86% alpha that read clearly at room scale, and a wide confident smile. Four asymmetric drift legs animate the canonical tourist-folklore "haggis can only circle the hill one way" drift. The whole mascot renders at scale 2.0 (body outline ≈100 px wide on the 540 px canvas) — large enough to read as a character at bothy scale without filling the doorway. The haggis animates at idle (breath bob) and during the walk cycle (front + back leg pairs alternate at 3 Hz). No animation library involved; the whole thing is phased sinusoids and position-delta tracking inside the renderer closure. A close-cropped version of the Wee Chieftain ships in [`public/favicon.svg`](public/favicon.svg) (browser tab); [`public/og.svg`](public/og.svg) carries the social card (1200×630) — the og.svg haggis is kept in sync with `bothy-haggis.ts` design units so both surfaces show the same character.

The hub chrome (brand line, links, music button, status) renders in self-hosted Old Standard TT (`public/fonts/`), locking the humanist-serif register across Windows, macOS, and Linux without FOUT. The italic 400 weight is preloaded so the chrome renders in-font on first paint.

Opt-in hub music ships at [`public/music/`](public/music/) — two rendered MP3 tracks from the Wario Synth Game Boy-style output, started only from the music button, preloaded at `none`. The music smoke test asserts no MP3 fetch before opt-in, then asserts the audio element unpauses after the first click.

## Why MIT

[The license](LICENSE). The engineering primitives — the C FNV-1a, the WAT xoshiro128\*\*, the signed-report orchestrator, the hand-rolled Canvas2D renderer scaffolding — are intended to be reused. If any of them helps you build your own thing, take them. The lobby brand belongs to ha.ggis.xyz; the techniques are yours.

---

*Code: [MIT](LICENSE). Brand and assets: © Michael McMillan 2026. Wild Haggis Survivors is a separate project, separately licensed, linked here as the first game in the haggis-themed family.*
