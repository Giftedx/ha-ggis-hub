# Contributing

Status: canonical contributor guide

ha.ggis Hub is end-to-end functional with a 19-gate release matrix in `tools/haggis-eval` and signed JSON reports. Contributions must keep implementation, documentation, and quality gates aligned — the bar is "perfect at the current stage, or actively being made perfect."

## Before starting

Read:

- `README.md`
- `docs/README.md`
- `docs/foundation/11-quality-manifesto.md` (covers engineering principles and autopilot rules)
- `docs/foundation/00-project-charter.md` (covers product vision)
- `docs/foundation/05-stack-decision-record.md`
- `docs/foundation/07-quality-gates.md` (covers technical bar and release definition)
- `docs/foundation/12-craft-commitments.md` (covers dependency policy)

If you are an autonomous agent, also read [`AGENTS.md`](AGENTS.md).

If you change `crates/hub-core` or `crates/hub-wasm`, run `pnpm run build:wasm` (or `pnpm build`) before browser checks — `pnpm verify` rebuilds WASM automatically, but a dev-server session will not pick up sim changes otherwise.

## Current contribution types

Allowed with a written plan and matching verification:

- documentation corrections
- architecture research
- ADR drafts
- implementation plans
- quality-gate design and new gate subcommands in `tools/haggis-eval`
- Rust core and WASM boundary changes
- strict TypeScript/Vite host changes
- art / renderer / canvas-room changes against the locked technique spec in `DESIGN.md`
- dependency additions that satisfy the dependency policy and are documented

Not allowed without a specific plan/ADR where appropriate:

- alternate app scaffold or scaffold reset
- dependency installation outside the policy
- renderer replacement (would supersede ADR-0005)
- deployment-pipeline change (would supersede the Cloudflare Pages spec)
- weakening any CI gate
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

Implementation gates are listed in `docs/foundation/07-quality-gates.md` and orchestrated by `tools/haggis-eval`. Run `./tools/haggis-eval/haggis-eval all` before opening a PR; `pnpm verify` is the fast subset. Both are enforced in CI (`.github/workflows/ci.yml`).
