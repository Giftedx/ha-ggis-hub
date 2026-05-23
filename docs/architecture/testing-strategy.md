# Testing Strategy

Status: planned architecture
Scope: what gets tested where and why
Related: [Quality gates](../foundation/07-quality-gates.md), [Technical bar](../foundation/07-quality-gates.md#technical-bar)

## Testing pyramid for this project

```text
Many: Rust unit/property tests for deterministic core
Many: TypeScript unit tests for pure host logic
Some: WASM boundary tests
Some: Playwright smoke/accessibility/console tests
Few: visual/performance/soak tests, focused on critical flows
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

Use property tests for invariants once the core has enough shape.

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
