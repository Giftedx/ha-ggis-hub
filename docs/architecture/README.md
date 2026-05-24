# Architecture Documentation

Status: section index
Scope: shipped and planned runtime architecture, boundaries, testing, evaluation, observability, and security
Related: [Documentation index](../README.md), [Stack decision record](../foundation/05-stack-decision-record.md), [ADR-0001](../decisions/0001-rust-wasm-core-typescript-host.md)

## What this section is for

Architecture docs describe the system shape: how the Rust core, WASM boundary, TypeScript host, renderer, and deployment fit together. Most of the core architecture is now shipped. Docs marked `planned` describe surfaces that are still future work.

Foundation docs (`docs/foundation/`) state policy. ADRs (`docs/decisions/`) record specific choices. Architecture docs describe how those choices come together as a system.

## Documents

| File | Status | Scope |
|------|--------|-------|
| [overview.md](overview.md) | implemented | Top-level system shape, ownership rules, repo layout. Read first. |
| [runtime-boundaries.md](runtime-boundaries.md) | current; routing lifecycle planned | Game module / instance contracts, frame loop model, error handling. |
| [data-and-save-boundaries.md](data-and-save-boundaries.md) | registry shipped; save deferred | Game registry shape, hub persistence keys, the Wild Haggis Survivors save boundary. |
| [testing-strategy.md](testing-strategy.md) | mostly shipped | Where unit, property, WASM-boundary, browser, visual, and performance tests live. |
| [evaluation-strategy.md](evaluation-strategy.md) | mostly shipped | Evals beyond tests — core simulation, browser UX, paint timing, a11y, visual drift. |
| [autopilot-system.md](autopilot-system.md) | active | How autonomous agents plan, build, review, run gates, and improve the project over time. |
| [security-model.md](security-model.md) | implemented | Threat model, static-app rules, WASM-boundary input handling, deployment hardening. |
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
- describes current behavior for shipped surfaces; describes target behavior for planned surfaces
- never claims a file or command exists unless it is in the actual repository

When implementation begins, the corresponding architecture doc must be updated in the same slice as the code (see [Quality gates](../foundation/07-quality-gates.md) and [Autopilot rules](../foundation/11-quality-manifesto.md#autopilot-rules)).
