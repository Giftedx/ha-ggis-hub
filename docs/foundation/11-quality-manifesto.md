# 11 Quality Manifesto

Status: canonical foundation policy
Scope: uncompromising project bar, language taste, hand-rolled craft, and autopilot philosophy
Related: [Engineering principles](01-engineering-principles.md), [Technical bar](02-technical-bar.md), [Agent operating mode](08-agent-operating-mode.md), [Craft commitments](12-craft-commitments.md), [ADR-0004](../decisions/0004-language-and-craft-philosophy.md)

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
