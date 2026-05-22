# Contributing

Status: canonical contributor guide (foundation phase)

ha.ggis Hub is intentionally documentation-first while the technical foundation is established.

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

Allowed now:

- documentation corrections
- architecture research
- ADR drafts
- implementation plans
- quality-gate design

Not yet allowed without a plan:

- app scaffold
- dependency installation
- renderer selection
- deployment setup

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

Implementation gates are listed in `docs/foundation/07-quality-gates.md` and become active when the scaffold exists.
