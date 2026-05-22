# Evaluation Strategy

Status: planned architecture
Scope: evals that let humans and agents judge whether the project is improving
Related: [Testing strategy](testing-strategy.md), [Agent operating mode](../foundation/08-agent-operating-mode.md), [Quality manifesto](../foundation/11-quality-manifesto.md)

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
