# Agent Instructions for ha.ggis Hub

This file is the fast path for autonomous agents entering the repository. It summarizes the canonical docs; it does not replace them.

## Required reading before edits

1. `README.md`
2. `docs/README.md`
3. `docs/foundation/11-quality-manifesto.md` (covers engineering principles and autopilot rules)
4. `docs/foundation/00-project-charter.md` (covers product vision)
5. `docs/foundation/05-stack-decision-record.md`
6. `docs/foundation/07-quality-gates.md` (covers technical bar and release definition)
7. `docs/foundation/12-craft-commitments.md` (covers dependency policy)
8. Any ADR related to the files you will touch ([ADR index](docs/decisions/README.md))

## Current phase

End-to-end functional. Rust workspace (`hub-core`, `hub-wasm`, `hub-hardlang`), WASM boundary, TypeScript/Vite host, procedural Canvas2D bothy renderer, Playwright smokes (door-launch, door-tap, pointer-drive), determinism + visual + a11y + security + perf + differential gates, signed JSON reports via `tools/haggis-eval`, two-tier CI in `.github/workflows/ci.yml`, deploy headers + manifest + OG card in `public/`. The plan slice history is in [`docs/plans/2026-05-22-implementation-sequence.md`](docs/plans/2026-05-22-implementation-sequence.md); the running ledger of changes is in [`CHANGELOG.md`](CHANGELOG.md).

## Prime rule

Do not implement from archived plans. `docs/archive/` is provenance only. The historical [foundation plan](docs/plans/2026-05-22-ha-ggis-hub-foundation.md) is also provenance — its actions are done.

`.hermes/` contains external tooling state, not canonical content.

## Architecture default

The accepted foundation direction is:

```text
Rust hub-core -> WASM wrapper -> TypeScript/Vite host -> Canvas2D renderer
```

Renderer is hand-rolled Canvas2D per [ADR-0005](docs/decisions/0005-canvas2d-first-room-renderer.md); visual direction is locked by [ADR-0006](docs/decisions/0006-hub-visual-direction-highland-dawn-bothy.md).

## Agent behavior

- Make routine doc/link/drift fixes autonomously.
- Do not add dependencies without dependency rationale or ADR.
- Do not weaken quality gates to pass.
- Update docs and ADRs when design changes.
- Label planned commands as planned until they actually run.
- Never claim a check passed unless you ran it.
