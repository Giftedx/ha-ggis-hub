# 06 Dependency Policy

Status: canonical foundation policy  
Scope: how dependencies are selected, justified, audited, and removed  
Related: [Engineering principles](01-engineering-principles.md), [Quality gates](07-quality-gates.md)

## Principle

Every dependency is a liability until proven valuable.

Dependencies add bundle size, supply-chain risk, license obligations, maintenance burden, security exposure, and architectural gravity. Convenience is not enough.

## Dependency classes

### Allowed by foundation decision

These are accepted as part of the planned foundation, subject to normal version/license/security checks:

- Rust toolchain and Cargo workspace
- wasm-bindgen / wasm-pack for WASM boundary
- TypeScript
- Vite
- pnpm
- Vitest
- Playwright
- proptest for Rust property tests
- cargo-audit / cargo-deny / cargo-nextest / cargo-llvm-cov for quality gates
- `clang` toolchain — for compiling the C primitives committed in [Craft commitments](12-craft-commitments.md) (currently the FNV-1a hash) to WebAssembly
- Go toolchain — for building the `haggis-eval` CLI committed in [Craft commitments](12-craft-commitments.md)

### Requires ADR or dependency rationale

- renderer dependency such as PixiJS
- any UI framework
- any game engine such as Phaser or Bevy
- analytics/error tracking SDKs
- external asset pipeline tools
- routing frameworks
- state-management libraries

### Suspicious by default

- broad utility libraries for tiny helpers
- unmaintained packages
- packages with unclear licenses
- packages that force weak CSP
- packages with large transitive dependency trees
- packages that duplicate native platform features

## Required rationale for new dependencies

When adding a dependency, document:

- name and version range
- purpose
- why hand-rolling is worse
- bundle/runtime impact if frontend
- license
- maintenance signal
- security considerations
- removal/replacement plan if it disappoints

Use `docs/decisions/` for architectural dependencies and the relevant implementation plan for small tooling dependencies.

## Lockfiles

Lockfiles are mandatory:

- frontend: `pnpm-lock.yaml`
- Rust: `Cargo.lock` should be committed for this application repo

CI must use frozen/locked installs.

## License posture

Default acceptable licenses:

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- Zlib

Licenses requiring review:

- MPL-2.0
- LGPL
- GPL
- AGPL
- unknown/custom licenses

## Removal policy

Dependencies that are unused, replaceable by simple local code, or responsible for recurring problems should be removed. Dependency cleanup is quality work, not churn.
