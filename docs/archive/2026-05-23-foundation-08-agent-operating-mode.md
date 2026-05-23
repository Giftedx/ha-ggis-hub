# 08 Agent Operating Mode

> **Superseded and archived 2026-05-23.** Content distilled into [Quality manifesto — Autopilot rules](../foundation/11-quality-manifesto.md#autopilot-rules) as part of the foundation prune. Preserved for provenance.

Status: canonical foundation policy
Scope: how autonomous agents plan, edit, verify, and report in this repo
Related: [Quality gates](07-quality-gates.md), [Engineering principles](01-engineering-principles.md), [First Perfect Slice](10-first-perfect-slice.md)

## Prime directive

Agents may work autonomously, but autonomy must increase quality, not bypass it.

## Required pre-flight

Before changing files, an agent must inspect:

1. `README.md`
2. `docs/README.md`
3. relevant `docs/foundation/*` files
4. relevant ADRs under `docs/decisions/`
5. current file tree and git status

## Planning rules

- Pick a coherent slice.
- Keep foundation decisions and implementation plans aligned.
- Do not implement from archived plans.
- If a decision changes, update the ADR or create a new ADR.
- Prefer testable core work over visual-only progress unless the slice is explicitly art/UX.

## Implementation rules

- Use TDD for Rust core behavior and pure TypeScript logic.
- Keep browser rendering separate from simulation truth.
- Add tests in the same slice as the behavior.
- Do not add dependencies without following [Dependency policy](06-dependency-policy.md).
- Do not weaken lint, type, test, or security gates to pass.
- Avoid TODOs in production code. If unavoidable, link them to a tracked issue/plan and explain why they are safe.

## Verification rules

Run the narrowest relevant verification first, then the broader gate appropriate for the slice.

Examples:

- Rust core change: run Rust tests and clippy for the affected workspace.
- TypeScript pure logic change: run Vitest and typecheck.
- Browser behavior change: run Playwright smoke and check console errors.
- Docs-only change: run link/audit checks and cross-check claims against actual files.

## Reporting rules

A completion report must list:

- files changed
- behavior changed
- tests/checks run
- checks not run and why
- open risks
- any docs or ADRs updated

Never claim a check passed unless it was actually run.

## Stop/escalate conditions

Escalate to the user only for genuinely product-shaping decisions, such as:

- final renderer choice if evidence is inconclusive
- public domain/deployment account decisions
- asset style direction requiring taste approval
- accepting a major dependency with meaningful tradeoffs
- weakening a release blocker

Routine doc fixes, link fixes, drift corrections, and consistency edits should be made autonomously.
