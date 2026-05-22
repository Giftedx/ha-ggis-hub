# 01 Engineering Principles

Status: canonical foundation policy
Scope: engineering values that guide every implementation decision
Related: [Technical bar](02-technical-bar.md), [Dependency policy](06-dependency-policy.md), [Quality gates](07-quality-gates.md)

## 1. No slop

No rushed scaffolds, no dependency soup, no untested core behavior, no TODO-driven architecture, and no “we will clean this later” foundations.

Temporary code may exist only inside clearly scoped experiments or spikes, not in the public path.

## 2. Small scope beats weak scope

The first release should be small enough to finish, but not hollow. A tiny polished room with serious architecture is better than a large fragile playground.

## 3. Explain decisions, do not merely state them

Every major technical choice needs the reason, alternatives considered, consequences, and reversal cost. Use ADRs for decisions that shape the architecture.

## 4. Prefer deterministic, testable core logic

Core state transitions should be testable without a browser when reasonable. Rendering should present state; it should not be the source of truth.

## 5. Use systems languages where they earn their keep

Rust/WASM is preferred for deterministic simulation, validation, replay, save schema, and future agent-evaluable logic. Browser orchestration remains TypeScript because the DOM, CSS, input, audio unlock, and deployment toolchain are native browser concerns.

## 6. Hand-roll central primitives when that improves quality

Hand-rolling is encouraged for central identity-bearing systems where control, correctness, and learning matter. It is discouraged for security-sensitive or commodity problems where battle-tested implementations are safer.

## 7. Dependencies are liabilities until proven otherwise

Every dependency adds supply-chain, bundle-size, maintenance, license, and security cost. Add dependencies by policy, not convenience.

## 8. Tests are part of the product

Tests, browser smoke checks, benchmarks, fuzz targets, and quality gates are not chores after coding. They are how the project earns trust.

## 9. Accessibility and fallback paths matter

The hub may be playful, but visitors still need obvious controls, direct links, reduced-motion behavior, keyboard support, and graceful failure states.

## 10. Agent autonomy requires guardrails

Agents may plan, research, implement, review, and verify, but only through documented rules. Agents must not weaken quality gates, invent unrecorded architecture, or claim success without verification.
