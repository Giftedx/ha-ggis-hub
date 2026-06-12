# Evaluation Strategy

Status: current architecture (all layers shipped as of 2026-05-24; soak/memory-growth shipped 2026-05-24)
Scope: evals that let humans and agents judge whether the project is improving
Related: [Testing strategy](testing-strategy.md), [Autopilot rules](../foundation/11-quality-manifesto.md#autopilot-rules), [Quality manifesto](../foundation/11-quality-manifesto.md)

## Implementation status

The "should eventually cover" lists below are fully realised as of 2026-05-24. `tools/haggis-eval` orchestrates a 16-gate-subcommand (25 individual checks) FNV-signed tamper-evident report matrix that covers correctness (cargo + vitest), docs/report claim drift (`node scripts/check-doc-claims.mjs`), browser UX (7 chromium smokes — 6 core + a11y), determinism (state-hash equality across same-seed replays), visual drift (perceptual aHash with per-scene tolerance), perf budgets (per-asset byte caps + W3C Paint Timing API medians for FCP/LCP/DCL/load + a `hub:firstFrame` user-mark for the canvas-aware paint moment), a memory-growth soak (15-second RAF loop; CDP-forced GC before/after; 5 MB heap-growth budget), and the hard-language differential showcase (C-vs-Rust hash + WAT-vs-Rust RNG fuzz). Each `haggis-eval all` run writes an FNV-signed tamper-evident JSON report to `target/haggis-eval/all-<utc>.json`; the `signature` field is a keyless non-cryptographic FNV-1a 64 checksum of the report payload, so accidental or post-hoc edits are detectable when the checksum is not recomputed. The `haggis-eval verify-report <path>` command recomputes that checksum for an existing report and fails if the payload and signature no longer match. The lab-perf eval is hand-rolled — no Lighthouse npm dep, the W3C primitives directly via chromium-headless. The a11y eval is also hand-rolled — no axe-core / pa11y dep, 26 WCAG 2.2 AA spot-checks driven through Playwright (page language, viewport zoom, page title, canvas accessible name, persistent fallback help, live door status messages, interactive element accessible name, label-in-name, keyboard reachability, focus indicator visibility, computed contrast ratio on every declared text pair, self-hosted font load verification, and runtime page-error check). The soak eval is hand-rolled — no leak-detection library dep; CDP's `HeapProfiler.collectGarbage` + `Performance.getMetrics` directly.

## Purpose

Tests prove known behavior. Evals answer a broader question: is the project becoming more playable, polished, understandable, robust, and technically impressive?

## Eval layers

### Human playability eval

For every public-facing slice, a human should be able to answer:

- What is this?
- How do I interact?
- How do I play Wild Haggis Survivors?
- What does `ha.ggis` mean?
- What is locked or coming later?

### Agent-readable acceptance eval

Each implementation slice should have a checklist an agent can verify without taste-guessing:

- files changed match plan
- tests added for behavior
- docs updated for decisions
- no new dependency without rationale
- quality gate run and reported honestly

### Core simulation eval

Headless Rust evals should eventually cover:

- deterministic replay from input sequence
- movement invariants across random inputs
- door interaction correctness
- save/load round trips
- invalid input robustness

### Browser UX eval

Playwright evals should eventually cover:

- load with no console errors
- direct play path
- keyboard path
- reduced-motion path
- fallback after WASM/renderer failure
- visual snapshot of stable first room state

### Performance eval

Measure:

- initial JS/CSS/WASM gzip size
- first contentful/app render
- WASM initialization time
- frame-time p95 for normal and stress scenes
- memory growth over a short soak

## Eval artifact policy

When an eval fails, preserve the failure as either:

- a regression test
- a benchmark threshold update with rationale
- an issue/plan item if not immediately fixable

Do not let failed eval knowledge disappear into chat history.
