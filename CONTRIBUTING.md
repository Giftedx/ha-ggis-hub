# Contributing

Status: canonical contributor guide (executable foundation phase)

ha.ggis Hub now has its first executable foundation skeleton. Contributions must keep implementation, documentation, and quality gates aligned while preserving the no-slop foundation.

## Before starting

Read:

- `README.md`
- `docs/README.md`
- `docs/foundation/11-quality-manifesto.md`
- `docs/foundation/00-project-charter.md`
- `docs/foundation/01-engineering-principles.md`
- `docs/foundation/05-stack-decision-record.md`
- `docs/foundation/08-agent-operating-mode.md`
- `docs/foundation/07-quality-gates.md`
- `docs/foundation/12-craft-commitments.md`

If you are an autonomous agent, also read [`AGENTS.md`](AGENTS.md).

## Current contribution types

Allowed now with a written plan and matching verification:

- documentation corrections
- architecture research
- ADR drafts
- implementation plans
- quality-gate design
- Rust core and WASM boundary slices
- strict TypeScript/Vite host slices
- dependency additions that satisfy the dependency policy and are documented

Still not allowed without a specific plan/ADR where appropriate:

- alternate app scaffold or scaffold reset
- dependency installation
- renderer selection
- deployment setup
- CI setup
- public route changes

## Documentation standard

Every new Markdown doc should state:

- status
- scope
- related docs
- whether examples are current or planned

## Decision standard

Use an ADR for decisions that affect:

- runtime architecture
- renderer choice
- deployment pipeline
- dependency strategy
- public route shape
- testing/security gates

## Verification for docs-only changes

Minimum:

- local Markdown links resolve
- docs do not claim missing files exist
- archived material is clearly marked superseded

Implementation gates are listed in `docs/foundation/07-quality-gates.md`. The current skeleton gate is active; future gates become active only when their tools and targets exist.
