# Architecture Documentation

Status: section index  
Scope: planned runtime architecture, boundaries, testing, evaluation, observability, and security  
Related: [Documentation index](../README.md), [Stack decision record](../foundation/05-stack-decision-record.md), [ADR-0001](../decisions/0001-rust-wasm-core-typescript-host.md)

## What this section is for

Architecture docs describe the *target* system shape: how the Rust core, WASM boundary, TypeScript host, renderer, and deployment are intended to fit together. None of this is implemented yet — every document here is `planned architecture` until the corresponding code exists.

Foundation docs (`docs/foundation/`) state policy. ADRs (`docs/decisions/`) record specific choices. Architecture docs describe how those choices come together as a system.

## Documents

| File | Status | Scope |
|------|--------|-------|
| [overview.md](overview.md) | planned | Top-level system shape, ownership rules, planned top-level layout. Read first. |
| [runtime-boundaries.md](runtime-boundaries.md) | planned | Game module / instance contracts, frame loop model, error handling. |
| [data-and-save-boundaries.md](data-and-save-boundaries.md) | planned | Game registry shape, hub persistence keys, the Wild Haggis Survivors save boundary. |
| [testing-strategy.md](testing-strategy.md) | planned | Where unit, property, WASM-boundary, browser, visual, and performance tests live. |
| [evaluation-strategy.md](evaluation-strategy.md) | planned | Evals beyond tests — human playability, core simulation, browser UX, performance, agent-readable acceptance. |
| [autopilot-system.md](autopilot-system.md) | planned | How autonomous agents are intended to plan, build, review, run gates, and improve the project over time. |
| [security-model.md](security-model.md) | planned | Threat model, static-app rules, WASM-boundary input handling, deployment hardening. |
| [observability-debugging.md](observability-debugging.md) | planned | Dev-only diagnostics, production posture, debug invariants. |

## Reading order

For first-time readers:

1. [overview.md](overview.md)
2. [runtime-boundaries.md](runtime-boundaries.md)
3. [data-and-save-boundaries.md](data-and-save-boundaries.md)
4. [testing-strategy.md](testing-strategy.md)
5. [security-model.md](security-model.md)
6. The remaining docs in any order.

Agents working on a specific slice should read whichever architecture doc covers the surface they will touch, plus the related foundation doc and ADR.

## Conventions

Every doc in this section follows the documentation [style guide](../style-guide.md):

- starts with `Status:`, `Scope:`, and `Related:` lines
- describes target behavior, not current behavior, while implementation is absent
- never claims a file or command exists unless it is in the actual repository

When implementation begins, the corresponding architecture doc must be updated in the same slice as the code (see [Quality gates](../foundation/07-quality-gates.md) and [Agent operating mode](../foundation/08-agent-operating-mode.md)).
