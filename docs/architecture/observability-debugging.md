# Observability and Debugging

Status: planned architecture  
Scope: diagnostics needed to keep the hub debuggable without polluting production  
Related: [Testing strategy](testing-strategy.md), [Runtime boundaries](runtime-boundaries.md)

## Principle

A premium interactive app needs observability even if it has no backend.

## Development diagnostics

Planned dev-only diagnostics:

- FPS/frame-time overlay
- simulation tick counter
- WASM initialization timing
- current room/player coordinates
- active door/proximity state
- renderer resource counts where available
- console grouping for lifecycle transitions

## Production diagnostics

Production should avoid noisy logs. User-facing failures should show clean fallback UI with direct links.

Optional later:

- privacy-conscious error reporting
- build version/hash display in diagnostics panel
- local export of debug snapshot/replay

## Debug invariants

Debug tools must not become required for normal play. A real visitor should understand the first slice without opening devtools.
