# Architecture Decision Records

Status: section index
Scope: catalog of all ADRs in this project, with current status
Related: [Documentation index](../README.md), [Style guide](../style-guide.md), [Engineering principles](../foundation/11-quality-manifesto.md#engineering-principles)

## What an ADR is here

An Architecture Decision Record captures a single significant decision: what was chosen, the alternatives considered, why this choice, and how hard it would be to reverse. ADRs are immutable once accepted — they record a decision at a point in time. Later decisions that change direction get a new ADR that supersedes the old one rather than rewriting history.

When an ADR is required is defined in [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — broadly: runtime architecture, renderer, deployment pipeline, dependency strategy, public route shape, or testing/security gates.

## Index

| ADR | Title | Status | Date | Summary |
|-----|-------|--------|------|---------|
| [0001](0001-rust-wasm-core-typescript-host.md) | Rust/WASM core, TypeScript host, replaceable renderer | accepted | 2026-05-22 | The foundation stack direction. |
| [0002](0002-renderer-evaluation-plan.md) | Renderer evaluation plan | superseded by ADR-0005 | 2026-05-22 | Defines the evidence that led to the Canvas2D first-room decision. |
| [0003](0003-whs-integration-strategy.md) | Wild Haggis Survivors integration strategy | accepted | 2026-05-23 | Option A chosen (external URL to `https://wild-haggis-survivors.pages.dev/`); Option B (`/wild-haggis-survivors/` mount) is the documented end-state for when the combined build is warranted. |
| [0004](0004-language-and-craft-philosophy.md) | Language and craft philosophy | accepted | 2026-05-22 | Makes the systems-language taste and hand-roll-vs-library posture explicit policy. |
| [0005](0005-canvas2d-first-room-renderer.md) | Canvas2D renderer for first room | accepted | 2026-05-23 | Selects a hand-rolled Canvas2D renderer for the First Perfect Slice room. |
| [0006](0006-hub-visual-direction-highland-dawn-bothy.md) | Highland-dawn-bothy visual direction | accepted | 2026-05-23 | Locks the hub's visual register: peat-night palette, monospace, Scots voice, sister to WHS without sharing tokens. |

## Statuses

- **accepted**: the decision has been made and is in force. Future work should not contradict it without superseding it via a new ADR.
- **proposed**: the decision has been written down but not committed to.
- **proposed (decision-pending)**: a special case of proposed — the ADR documents the criteria and constraints for a decision that has not been made yet (used when the decision needs evidence the project cannot yet produce). See the template for this shape.
- **superseded**: replaced by a later ADR. The superseded ADR remains in the repo; a `Superseded by:` line points forward.

## How to create an ADR

1. Copy [`adr-template.md`](adr-template.md).
2. Number it as the next integer (zero-padded to four digits): `0005-...`.
3. Pick the appropriate shape from the template (accepted vs decision-pending).
4. File it as `docs/decisions/NNNN-short-title.md` (lowercase kebab-case after the number).
5. Update this index in the same change.
6. If the ADR supersedes an earlier one, edit the old ADR's status to `superseded` and add a `Superseded by:` line.

## Follow-up ADRs expected

Based on current planning (see [ADR-0001](0001-rust-wasm-core-typescript-host.md) follow-ups and the [implementation sequence](../plans/2026-05-22-implementation-sequence.md)):

- renderer choice for the First Perfect Slice — closed by [ADR-0005](0005-canvas2d-first-room-renderer.md)
- visual direction for the bothy — closed by [ADR-0006](0006-hub-visual-direction-highland-dawn-bothy.md)
- WHS route/mount strategy — closed by [ADR-0003](0003-whs-integration-strategy.md): Option A (external URL) for first release; Option B mount deferred.
- CI/deployment architecture — native Cloudflare Pages build was chosen; the Wrangler/GitHub-Actions fallback proved unnecessary. No ADR needed unless that changes.
- save schema and migration policy once persistence is needed
