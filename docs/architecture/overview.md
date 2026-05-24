# Architecture Overview

Status: implemented — reflects shipped state
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

## Top-level layout

```text
crates/
  hub-core/        # Rust deterministic core
  hub-wasm/        # wasm-bindgen-free WASM boundary
  hub-hardlang/    # C FFI + WAT differential-test crate
asm/
  *.wat            # hand-written WebAssembly Text (xoshiro128**)
c/
  *.c              # C primitives linked into hub-hardlang (FNV-1a)
src/
  app/
  games/
  render/
  wasm/
tests/
  golden/          # visual gate: aHash goldens + tolerance config
tools/
  haggis-eval/     # Go CLI orchestrating the full eval set
public/
  _headers         # shipped Cloudflare Pages security headers
  _redirects       # SPA fallback
```
