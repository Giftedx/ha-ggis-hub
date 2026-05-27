# Testing Strategy

Status: current architecture (all layers shipped; lab-perf + a11y + soak shipped 2026-05-24 hand-rolled)
Scope: what gets tested where and why
Related: [Quality gates](../foundation/07-quality-gates.md), [Technical bar](../foundation/07-quality-gates.md#technical-bar)

## Implementation status

The pyramid is fully realised as of 2026-05-24. 214 vitest cases, cargo workspace tests, five chromium smokes (`scripts/smoke-door-launch.mjs`, `smoke-door-tap.mjs`, `smoke-pointer-drive.mjs`, `smoke-music-toggle.mjs`, `smoke-a11y.mjs`), a determinism smoke (`smoke-determinism.mjs`), a perceptual visual gate (`smoke-visual-gate.mjs` against `tests/golden/`), per-asset perf budgets (`scripts/perf-budgets.mjs`), a hand-rolled paint-timing gate (`scripts/smoke-paint-timing.mjs` reading the W3C Paint Timing API + a `hub:firstFrame` user-mark via Playwright; no Lighthouse dep), a hand-rolled accessibility gate (`scripts/smoke-a11y.mjs` running 26 WCAG 2.2 AA spot-checks via Playwright; no axe-core / pa11y dep), a memory-growth soak (`scripts/smoke-soak.mjs` running the RAF loop 15s, forcing GC via CDP before/after, asserting heap growth < 5 MB; no leak-detection dep), and deploy-headers assertions (`scripts/deploy-config.test.ts`). All orchestrated by `tools/haggis-eval` and run in CI.

## Testing pyramid for this project

```text
Many: Rust unit/property tests for deterministic core              ✓ shipped
Many: TypeScript unit tests for pure host logic                    ✓ shipped (214 vitest)
Some: WASM boundary tests                                          ✓ shipped
Some: Playwright smoke/accessibility/console tests                 ✓ shipped (5 smokes + a11y gate)
Few:  visual/performance/soak tests, focused on critical flows     ✓ visual + bundle-budgets + paint-timing + soak (memory-growth)
```

## Rust core tests

Test:

- movement bounds
- diagonal normalization
- fixed-tick determinism
- door proximity
- launch eligibility
- registry validation
- save migration when saves exist
- locked-door interaction kind and door index
- all four world-boundary clamping directions (left/right/top/bottom)

Property tests (proptest) cover:

- `sim`: bounds invariant under any seed + any input sequence; input signum round-trip for arbitrary i8
- `replay`: replay matches direct execution for any seed + any set of input changes
- `hash`: streaming vs one-shot equivalence for arbitrary byte sequences
- `rng`: seeded-identical streams; bounded output

## TypeScript tests

Test:

- registry mapping
- launch URL selection
- input mapping
- lifecycle helpers
- error state helpers
- reduced-motion preference handling

## WASM tests

Test:

- module initializes
- exported boundary accepts valid inputs
- invalid inputs do not panic
- snapshots are stable enough for host consumption

## Browser tests

Playwright smoke tests should assert:

- page loads
- no console errors
- direct play button exists
- canvas/renderer mounts or fallback appears
- keyboard interaction works once implemented
- reduced-motion/non-canvas fallback remains usable

## Visual tests

Use deterministic seeds, fixed viewport, and stable timing. Visual tests should cover only intentional stable states, not every animation frame.

## Performance tests

Measure:

- first app render
- WASM initialization
- steady frame p95
- bundle size
- no obvious memory growth over soak

Performance budgets are in [Quality gates](../foundation/07-quality-gates.md).
