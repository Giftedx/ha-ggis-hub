# ha.ggis Hub — engineering writeup

> A ~79 KB hand-rolled Rust + WASM + TypeScript playable hub, with three-language FNV-1a, a WAT-authored RNG, cryptographically signed eval reports, and Mozilla Observatory A+. The visible product is the bothy; this writeup is for the layer underneath.

**Live:** <https://ha.ggis.xyz/>
**Repo:** private during development — public on first release.
**Sister project:** [Wild Haggis Survivors](https://wild-haggis-survivors.pages.dev/) (linked from the hub)

---

## The pitch in one paragraph

`ha + ggis = haggis`. The URL is the joke. The product is a wee front door — a playable bothy room at dawn where the visitor walks a wild haggis up to a door and that door launches one of a planned family of haggis-themed Highland games. Wild Haggis Survivors is the first game in the family; more doors will open. The hub itself is intentionally small in scope, with the engineering bar set deliberately high underneath, to demonstrate that "small" and "perfect" can coexist without the project becoming either a generic landing page or a barely-working MVP.

## The architecture, in one diagram

```
┌─────────────────────────────────────────────────────────┐
│  TypeScript / Vite host  (44 KB JS, strict mode)        │
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

### Cryptographically signed gate reports

`haggis-eval all` runs every wired gate (`rust`, `ts`, `security`, `browser`, `determinism`, `perf`, `visual`, `a11y`, `differential rng`, `differential hash`) and writes a single JSON report to `target/haggis-eval/all-<utc>.json`. The report has a `signature` field which is the FNV-1a 64 hash of the report's own payload (every other field). Re-hashing the payload reproduces the signature; any post-hoc edit changes the hash and the report no longer validates.

This is not strong cryptography — anyone can re-sign an edited report. It's a tamper-*evidence* primitive: a deploy log can record signatures, and a divergent signature on re-verification proves the report was rewritten between gate execution and deploy capture.

### ~79 KB total client bundle

| Asset | Size | Gzip |
|---|---|---|
| `dist/index.html` | 3.49 KB | 1.23 KB |
| `dist/assets/index-*.js` | 45.45 KB | 15.83 KB |
| `dist/assets/hub_wasm_bg-*.wasm` | 27.72 KB | 12.64 KB |
| `dist/assets/index-*.css` | 2.28 KB | 0.88 KB |
| **Total** | **78.94 KB** | **30.58 KB** |

For comparison, the median JS bundle of the [HTTP Archive top-1M sites](https://httparchive.org/) is ~500 KB compressed. The hub ships less than 30 KB compressed for a full Rust + WASM + TypeScript playable hub with a deterministic core, a fixed-step simulation, an input log writer, a procedural Canvas2D renderer, a pointer-drive + keyboard input layer, a snapshot codec, and a registry with launch planning.

There is no UI framework, no game engine, no Tailwind, no PostCSS, no Lodash, no animation library. Vite is the build tool, that's it.

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

The autopilot rules also have known limits: agents handle the engineering layer well because gates are machine-checkable; they handle aesthetic less well because no machine oracle exists for "does this look right". The first iteration of a **visual gate** now ships at `scripts/smoke-visual-gate.mjs` — capture the playfield canvas at a deterministic seed, resize to 16×16 grayscale via `sharp`, compute a 256-bit average hash, compare against the recorded golden via Hamming distance with per-scene tolerance. Catches palette and layout drift; absorbs particle-animation variance. First iteration; the script is one function-swap away from pHash or pixel-level pixelmatch if stronger guarantees become useful. See `tests/golden/README.md`.

## Reproduce locally

```bash
# Repo is private during development; replace with your fork / mirror.
cd ha-ggis-hub

# TypeScript + Vite host
pnpm install --frozen-lockfile
pnpm verify          # tsc --noEmit → vitest 194 cases → vite build → verify-dist

# Rust workspace
cargo fmt --all -- --check
cargo test --workspace --exclude hub-wasm
cargo clippy --workspace --all-targets -- -D warnings
RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown

# Single-binary orchestrator (runs everything above + signs a JSON report)
cd tools/haggis-eval && go build .
./haggis-eval all
cat target/haggis-eval/all-*.json | jq .
```

Browser smokes (each builds dist + spins up `vite preview` internally — no external server needed):

```bash
node scripts/run-browser-smokes.mjs    # 3 smokes: door-launch + door-tap + pointer-drive
node scripts/run-determinism-smoke.mjs # same-seed state-hash equality across runs
node scripts/run-visual-gate.mjs verify # perceptual aHash diff vs tests/golden/
node scripts/run-a11y-gate.mjs          # 13 WCAG 2.2 AA spot-checks (hand-rolled)
```

## Where the art now stands

The three art gaps called out in earlier iterations — daylight loch in the window, WHS-sprite stand-in for the haggis, and flagstone floor — have been closed against the [ADR-0006](docs/decisions/0006-hub-visual-direction-highland-dawn-bothy.md) Highland Dawn Bothy spec. The window is a stacked dawn-pink + heather-purple sky with a soft sun glow and far Highland silhouette. The haggis is a fresh hand-rolled drawer at [`src/render/canon-haggis.ts`](src/render/canon-haggis.ts) keyed to the canonical silhouette in [`public/og.svg`](public/og.svg): low ginger-brown oval body, asymmetric cream mane draping over the face side, irregular strands cascading past the body outline, black face skin, snout protruding forward, eye half-hidden by the mane fringe. The haggis faces the direction of last horizontal movement and animates a full locomotion ensemble while walking: leg cycle (back/front pairs alternating at 3 Hz), mane sway at half stride frequency (1.5 Hz, pendulum lag behind the body), and tail wag at 2 Hz. The dawn beam through the back-wall window pulses at ±5% opacity over a 22-second period — the early-morning light shifting quality as if thin clouds were drifting on the horizon. No animation library involved; the whole thing is phased sinusoids and position-delta tracking inside the renderer closure. The floor is now peat-stained planks with grain lines and scattered knots, not flagstones. The visual gate at [`tests/golden/`](tests/golden/) was rebaked against the new render and verifies cleanly. The og.svg remains the locked visual brief; the in-game realisation matches it within the latitude of the dim bothy lighting.

## Why MIT

[The license](LICENSE). The engineering primitives — the C FNV-1a, the WAT xoshiro128\*\*, the signed-report orchestrator, the hand-rolled Canvas2D renderer scaffolding — are intended to be reused. If any of them helps you build your own thing, take them. The lobby brand belongs to ha.ggis.xyz; the techniques are yours.

---

*Code: [MIT](LICENSE). Brand and assets: © Michael McMillan 2026. Wild Haggis Survivors is a separate project, separately licensed, linked here as the first game in the haggis-themed family.*
