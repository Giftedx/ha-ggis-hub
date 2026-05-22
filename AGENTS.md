# Agent Instructions for ha.ggis Hub

This file is the fast path for autonomous agents entering the repository. It summarizes the canonical docs; it does not replace them.

## Required reading before edits

1. `README.md`
2. `docs/README.md`
3. `docs/foundation/11-quality-manifesto.md`
4. `docs/foundation/00-project-charter.md`
5. `docs/foundation/01-engineering-principles.md`
6. `docs/foundation/08-agent-operating-mode.md`
7. `docs/foundation/05-stack-decision-record.md`
8. `docs/foundation/07-quality-gates.md`
9. `docs/foundation/12-craft-commitments.md`
10. Any ADR related to the files you will touch ([ADR index](docs/decisions/README.md))

## Current phase

Foundation phase. No app scaffold exists yet. Do not pretend `package.json`, `Cargo.toml`, Vite, Rust crates, CI, or Cloudflare config exist until created in an implementation slice. The next-phase roadmap is [`docs/plans/2026-05-22-implementation-sequence.md`](docs/plans/2026-05-22-implementation-sequence.md).

## Prime rule

Do not implement from archived plans. `docs/archive/` is provenance only. The historical [foundation plan](docs/plans/2026-05-22-ha-ggis-hub-foundation.md) is also provenance — its actions are done.

`.hermes/` contains external tooling state, not canonical content.

## Architecture default

The accepted foundation direction is:

```text
Rust hub-core -> WASM wrapper -> TypeScript/Vite host -> replaceable renderer
```

Renderer is not selected yet. Canvas2D and PixiJS are the leading first-slice candidates.

## Agent behavior

- Make routine doc/link/drift fixes autonomously.
- Do not add dependencies without dependency rationale or ADR.
- Do not weaken quality gates to pass.
- Update docs and ADRs when design changes.
- Label planned commands as planned until they actually run.
- Never claim a check passed unless you ran it.
