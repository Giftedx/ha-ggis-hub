# Architecture Overview

Status: planned architecture  
Scope: top-level system model for the implementation phase  
Related: [Stack decision record](../foundation/05-stack-decision-record.md), [Runtime boundaries](runtime-boundaries.md), [ADR-0001](../decisions/0001-rust-wasm-core-typescript-host.md)

## System shape

```text
Browser
  |
  | loads static assets from CDN
  v
TypeScript/Vite host
  |-- DOM shell, routes, direct links
  |-- input capture and audio unlock
  |-- renderer lifecycle
  |-- game adapter lifecycle
  |
  v
WASM wrapper
  |
  v
Rust hub-core
  |-- deterministic simulation
  |-- movement and bounds
  |-- door proximity and interactions
  |-- registry validation
  |-- save/schema logic later
```

## Ownership rules

- Rust core owns deterministic truth.
- WASM wrapper owns serialization and boundary shape.
- TypeScript host owns browser APIs.
- Renderer owns pixels only.
- Deployment config owns headers, caching, redirects, and source-map posture.

## Planned top-level layout

```text
crates/
  hub-core/        # Rust deterministic core
  hub-wasm/        # wasm-bindgen boundary around hub-core
asm/
  *.wat            # hand-written WebAssembly Text — see Craft commitments
c/
  *.c              # small C primitives compiled into the WASM core
src/
  app/
  engine/
  games/
  navigation/
  render/
  ui/
  wasm/
tests/
  e2e/
  visual/
  performance/
tools/
  haggis-eval/     # Go CLI orchestrating the full eval set
public/
  _headers
  _redirects
```

This layout is planned and should be created in implementation slices, not all at once without tests. The `asm/`, `c/`, and `tools/` directories exist to host the hard-language artifacts committed in [Craft commitments](../foundation/12-craft-commitments.md); they only appear when those artifacts land.

## First implementation principle

The first slice should prove the boundary, not maximize features. A moving haggis, one active door, one locked door, and verified launch behavior are enough if the architecture is correct.
