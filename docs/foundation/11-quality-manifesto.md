# 11 Quality Manifesto

Status: canonical foundation policy
Scope: uncompromising project bar, language taste, hand-rolled craft, autopilot philosophy, engineering principles, and autopilot rules
Related: [Quality gates](07-quality-gates.md), [Craft commitments](12-craft-commitments.md), [ADR-0004](../decisions/0004-language-and-craft-philosophy.md)

## Manifesto

ha.ggis Hub is a labour of love and a professional portfolio artifact. It is not a disposable MVP, not a template site, not a half-working demo, and not a place for dependency soup.

The acceptable states are:

1. perfect for the current stage, or
2. actively being made perfect.

Doing nothing is not acceptable while the foundation is unfinished. Cutting corners is not acceptable because the corner will become the architecture.

## What “perfect” means here

Perfect does not mean infinite scope. It means the chosen scope has no avoidable slop.

A tiny slice can be perfect if it has:

- a deliberate architecture
- a clear reason for every language and dependency
- tested core behavior
- secure deployment posture
- measured performance budgets
- readable docs
- clean failure states
- agent-safe operating rules
- visible craft and personality

A large slice is not acceptable if it hides weak foundations.

## Language taste

Preferred languages and targets:

- Rust
- WebAssembly
- C where a low-level systems component truly earns it
- Go where service/CLI/orchestration simplicity is the premium choice
- Assembly only for deliberate showcase kernels, learning artifacts, or measured micro-optimizations

The project should use systems-level tools where they create correctness, speed, control, or technical signal. It should not use hard technology as vanity.

## Library posture

Libraries are allowed only when they beat hand-rolled code under the project’s quality criteria.

Hand-roll when:

- the code is central to the project identity
- the primitive is small enough to own
- tests/evals can prove it
- owning it improves performance, clarity, security, or portfolio value

Use a library when:

- the domain is security-sensitive and battle-tested code is safer
- the implementation cost would distract from the core product
- the library is small, maintained, typed, licensed cleanly, and easy to replace
- the dependency rationale is documented

Never add a package because it saves five minutes.

The catalogue of primitives this project commits to hand-rolling, and the artifacts this project commits to writing in C, WebAssembly Text, and Go, is [Craft commitments](12-craft-commitments.md). That doc is the source of truth — this section states the values; that doc states the commitments.

## AI autopilot philosophy

Agents are not here to make a barely working shell. Agents are here to research, think, build, test, critique, document, and iterate toward a premium result.

Autopilot only works when the rules are strong:

- agents read docs before editing
- agents work in coherent slices
- agents use tests/evals as steering signals
- agents update docs and ADRs when reality changes
- agents do not weaken gates
- agents do not claim success without verification
- agents reflect and improve reusable process after difficult work

## Suckless standard

The project should be simple where possible and deep where valuable.

Suckless here means:

- fewer moving parts
- sharper boundaries
- less framework gravity
- less hidden state
- less magic
- more explicit behavior
- more measurable quality
- more ownership of core craft

It does not mean under-engineered. It means engineered without waste.

## Public promise

A visitor should feel the charm.
A senior engineer should see the discipline.
A future agent should see the path forward.

## Engineering principles

### 1. No slop

No rushed scaffolds, no dependency soup, no untested core behavior, no TODO-driven architecture, and no “we will clean this later” foundations.

Temporary code may exist only inside clearly scoped experiments or spikes, not in the public path.

### 2. Small scope beats weak scope

The first release should be small enough to finish, but not hollow. A tiny polished room with serious architecture is better than a large fragile playground.

### 3. Explain decisions, do not merely state them

Every major technical choice needs the reason, alternatives considered, consequences, and reversal cost. Use ADRs for decisions that shape the architecture.

### 4. Prefer deterministic, testable core logic

Core state transitions should be testable without a browser when reasonable. Rendering should present state; it should not be the source of truth.

### 5. Use systems languages where they earn their keep

Rust/WASM is preferred for deterministic simulation, validation, replay, save schema, and future agent-evaluable logic. Browser orchestration remains TypeScript because the DOM, CSS, input, audio unlock, and deployment toolchain are native browser concerns.

### 6. Hand-roll central primitives when that improves quality

Hand-rolling is encouraged for central identity-bearing systems where control, correctness, and learning matter. It is discouraged for security-sensitive or commodity problems where battle-tested implementations are safer.

### 7. Dependencies are liabilities until proven otherwise

Every dependency adds supply-chain, bundle-size, maintenance, license, and security cost. Add dependencies by policy, not convenience.

### 8. Tests are part of the product

Tests, browser smoke checks, benchmarks, fuzz targets, and quality gates are not chores after coding. They are how the project earns trust.

### 9. Accessibility and fallback paths matter

The hub may be playful, but visitors still need obvious controls, direct links, reduced-motion behavior, keyboard support, and graceful failure states.

### 10. Agent autonomy requires guardrails

Agents may plan, research, implement, review, and verify, but only through documented rules. Agents must not weaken quality gates, invent unrecorded architecture, or claim success without verification.

## Autopilot rules

### Prime directive

Agents may work autonomously, but autonomy must increase quality, not bypass it.

### Required pre-flight

Before changing files, an agent must inspect:

1. `README.md`
2. `docs/README.md`
3. relevant `docs/foundation/*` files
4. relevant ADRs under `docs/decisions/`
5. current file tree and git status

### Planning rules

- Pick a coherent slice.
- Keep foundation decisions and implementation plans aligned.
- Do not implement from archived plans.
- If a decision changes, update the ADR or create a new ADR.
- Prefer testable core work over visual-only progress unless the slice is explicitly art/UX.

### Implementation rules

- Use TDD for Rust core behavior and pure TypeScript logic.
- Keep browser rendering separate from simulation truth.
- Add tests in the same slice as the behavior.
- Do not add dependencies without following the [Dependency policy](12-craft-commitments.md#dependency-policy).
- Do not weaken lint, type, test, or security gates to pass.
- Avoid TODOs in production code. If unavoidable, link them to a tracked issue/plan and explain why they are safe.

### Verification rules

Run the narrowest relevant verification first, then the broader gate appropriate for the slice.

Examples:

- Rust core change: run Rust tests and clippy for the affected workspace.
- TypeScript pure logic change: run Vitest and typecheck.
- Browser behavior change: run Playwright smoke and check console errors.
- Docs-only change: run link/audit checks and cross-check claims against actual files.

### Reporting rules

A completion report must list:

- files changed
- behavior changed
- tests/checks run
- checks not run and why
- open risks
- any docs or ADRs updated

Never claim a check passed unless it was actually run.

### Stop/escalate conditions

Escalate to the user only for genuinely product-shaping decisions, such as:

- final renderer choice if evidence is inconclusive
- public domain/deployment account decisions
- asset style direction requiring taste approval
- accepting a major dependency with meaningful tradeoffs
- weakening a release blocker

Routine doc fixes, link fixes, drift corrections, and consistency edits should be made autonomously.
