# Autopilot System

Status: planned architecture
Scope: how AI agents should safely plan, implement, review, and improve the project over time
Related: [Agent operating mode](../foundation/08-agent-operating-mode.md), [Evaluation strategy](evaluation-strategy.md), [Quality manifesto](../foundation/11-quality-manifesto.md)

## Goal

Create a project that agents can advance autonomously without degrading quality.

## Autopilot loop

```text
inspect docs/status
  -> choose coherent slice
  -> write/update plan
  -> implement with tests
  -> run relevant gates
  -> review spec compliance
  -> review quality/security/performance
  -> update docs/ADRs
  -> report honestly
```

## Agent roles

### Planner

- reads foundation docs
- selects next coherent slice
- writes exact files/commands/acceptance criteria
- identifies required ADR changes

### Builder

- implements the slice
- uses tests before or alongside code
- avoids unplanned dependency additions

### Reviewer

- checks spec compliance
- checks code quality
- checks docs/ADR drift
- requires verification evidence

### Gate runner

- runs the correct quality gate
- reports exact commands and results
- does not summarize failures away

## Anti-patterns

- one tiny trivial change then stopping while larger planned slice remains unfinished
- adding a dependency to avoid thinking
- visual progress with no testable core
- claiming “done” without running checks
- changing architecture without an ADR
- leaving docs stale because “it was just implementation”

## Autopilot readiness levels

### Level 0: Docs only

Current phase. Agents may strengthen docs and plans.

### Level 1: Skeleton

Toolchains exist. Agents may add tiny tested core slices.

### Level 2: Verified vertical slices

Rust/WASM/TS/Playwright gates exist. Agents may build end-to-end features.

### Level 3: Eval-guided iteration

Headless simulation evals, browser evals, and performance budgets guide autonomous improvement.

### Level 4: Release stewardship

Agents can prepare releases, run full gates, and produce rollback-ready reports, but production domain changes still require user approval.
