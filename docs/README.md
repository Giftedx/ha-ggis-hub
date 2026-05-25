# Documentation Index

This is the canonical index for ha.ggis Hub documentation.

## Documentation rules

- Markdown files use lowercase kebab-case names, except numbered foundation files which use a two-digit order prefix.
- Foundation docs are canonical policy. Plans must not contradict them.
- Decisions that select or reject major architecture must be captured as ADRs under `docs/decisions/`.
- Superseded material lives under `docs/archive/` with an explicit supersession note.
- Every doc should state its scope, status, and nearest related docs.
- Examples must be marked as one of: `planned`, `candidate`, or `current`.
- Commands that cannot run yet because required files/tools are not introduced must be labelled `planned`.

## Current documentation status

The repository is end-to-end functional. Rust workspace (`hub-core`, `hub-wasm`, `hub-hardlang`) drives deterministic movement, door proximity, FNV-1a state hashing, and the C/WAT hard-language showcases. TypeScript host owns lifecycle, input (keyboard + pointer-drive), registry, launch seams, and a procedural Canvas2D bothy renderer (WHS croft drawers ported + pixel sprites). Two-tier CI (`.github/workflows/ci.yml`): `pnpm verify` on PR; the full `haggis-eval all` release gate on push to main, emitting a cryptographically signed JSON report. Deployment headers, manifest, OG card, and SPA redirects under `public/`.

## Recommended reading order

The list below is the full sequence. The root [`README.md`](../README.md) highlights a shorter "load-bearing four" if you have less time.

Foundation (read in numeric order):

1. [Project charter](foundation/00-project-charter.md) — identity, non-negotiables, WHS boundary, and product vision
2. [Stack decision record](foundation/05-stack-decision-record.md) — Rust/WASM core + TypeScript host + replaceable renderer
3. [Quality gates](foundation/07-quality-gates.md) — technical bar, gate tiers, budgets, and release definition
4. [Quality manifesto](foundation/11-quality-manifesto.md) — uncompromising bar, language taste, engineering principles, autopilot rules
5. [Craft commitments](foundation/12-craft-commitments.md) — hand-rolled primitives, hard-language artifacts, and dependency policy

Project-wide:

6. [Glossary](glossary.md)

Architecture (start with overview, then the section index can steer):

7. [Architecture section index](architecture/README.md)
8. [Architecture overview](architecture/overview.md)
9. [Runtime boundaries](architecture/runtime-boundaries.md)
10. [Data and save boundaries](architecture/data-and-save-boundaries.md)
11. [Testing strategy](architecture/testing-strategy.md)
12. [Security model](architecture/security-model.md)

Decisions and plans:

13. [ADR index](decisions/README.md)
14. [Implementation sequence](plans/2026-05-22-implementation-sequence.md)

## Canonical docs

### Project-wide

- [Documentation style guide](style-guide.md)
- [Glossary](glossary.md)
- [`../DESIGN.md`](../DESIGN.md) — hub design system (colour, type, grid, motion, voice; sister to WHS's DESIGN.md)
- [`../WRITEUP.md`](../WRITEUP.md) — engineer-portfolio writeup of the layer underneath the bothy
- [`../CHANGELOG.md`](../CHANGELOG.md) — date-ordered notable changes (newest first)
- [`../LICENSE`](../LICENSE) — MIT

### Foundation

The foundation set was pruned on 2026-05-23 from 13 numbered docs to 5 canonical ones. Distilled content from the absorbed docs lives inside the keepers; the originals are preserved under `docs/archive/` for provenance.

- [00 Project charter](foundation/00-project-charter.md) — identity, non-negotiables, WHS boundary, and product vision (absorbs former `03-product-vision`)
- [05 Stack decision record](foundation/05-stack-decision-record.md) — Rust/WASM core + TypeScript host + replaceable renderer (former `04-architecture-options` moved to [`docs/research/`](research/2026-05-23-architecture-options-evaluation.md))
- [07 Quality gates](foundation/07-quality-gates.md) — technical bar, gate tiers, initial budgets, release blockers, first-release requirements, preview-vs-production, rollback posture (absorbs former `02-technical-bar` and `09-release-definition`; `10-first-perfect-slice` archived — acceptance criteria live here)
- [11 Quality manifesto](foundation/11-quality-manifesto.md) — uncompromising bar, language taste, hand-rolled craft, autopilot philosophy, the 10 engineering principles, and the autopilot rules (absorbs former `01-engineering-principles` and `08-agent-operating-mode`)
- [12 Craft commitments](foundation/12-craft-commitments.md) — hand-rolled primitives catalogue, hard-language commitments, and the dependency policy (absorbs former `06-dependency-policy`)

Archived foundation docs (provenance only — content distilled into the keepers above):

- [`archive/2026-05-23-foundation-01-engineering-principles.md`](archive/2026-05-23-foundation-01-engineering-principles.md)
- [`archive/2026-05-23-foundation-02-technical-bar.md`](archive/2026-05-23-foundation-02-technical-bar.md)
- [`archive/2026-05-23-foundation-03-product-vision.md`](archive/2026-05-23-foundation-03-product-vision.md)
- [`archive/2026-05-23-foundation-06-dependency-policy.md`](archive/2026-05-23-foundation-06-dependency-policy.md)
- [`archive/2026-05-23-foundation-08-agent-operating-mode.md`](archive/2026-05-23-foundation-08-agent-operating-mode.md)
- [`archive/2026-05-23-foundation-09-release-definition.md`](archive/2026-05-23-foundation-09-release-definition.md)
- [`archive/2026-05-23-foundation-10-first-perfect-slice.md`](archive/2026-05-23-foundation-10-first-perfect-slice.md)

### Architecture

- [Architecture section index](architecture/README.md)
- [Overview](architecture/overview.md)
- [Runtime boundaries](architecture/runtime-boundaries.md)
- [Data and save boundaries](architecture/data-and-save-boundaries.md)
- [Testing strategy](architecture/testing-strategy.md)
- [Evaluation strategy](architecture/evaluation-strategy.md)
- [Autopilot system](architecture/autopilot-system.md)
- [Security model](architecture/security-model.md)
- [Observability and debugging](architecture/observability-debugging.md)

### Decisions

- [ADR index with statuses](decisions/README.md)
- [ADR template](decisions/adr-template.md)
- [ADR-0001: Rust/WASM core, TypeScript host, replaceable renderer](decisions/0001-rust-wasm-core-typescript-host.md) — accepted
- [ADR-0002: Renderer evaluation plan](decisions/0002-renderer-evaluation-plan.md) — superseded by ADR-0005
- [ADR-0003: WHS integration strategy](decisions/0003-whs-integration-strategy.md) — accepted (Option A: external URL for first release)
- [ADR-0004: Language and craft philosophy](decisions/0004-language-and-craft-philosophy.md) — accepted
- [ADR-0005: Canvas2D renderer for first room](decisions/0005-canvas2d-first-room-renderer.md) — accepted
- [ADR-0006: Highland-dawn-bothy visual direction](decisions/0006-hub-visual-direction-highland-dawn-bothy.md) — accepted

### Plans

- [Foundation plan](plans/2026-05-22-ha-ggis-hub-foundation.md)
- [Implementation sequence](plans/2026-05-22-implementation-sequence.md)
- [Slice 1 executable foundation plan](plans/2026-05-23-slice-1-executable-foundation.md)

### Deployment

- [Cloudflare Pages deployment foundation](deployment/cloudflare-pages.md)

### Research

- [2026-05-22 foundation research notes](research/2026-05-22-foundation-research-notes.md)
- [2026-05-23 architecture options evaluation](research/2026-05-23-architecture-options-evaluation.md) — moved from `docs/foundation/04-architecture-options.md`

### Audit

Per-slice audit reports are superseded by the `haggis-eval` signed JSON reports under `target/haggis-eval/` (see [`tools/haggis-eval/README.md`](../tools/haggis-eval/README.md)). Slice 1–5 reports were moved to `docs/archive/` on 2026-05-23.

- [2026-05-23 documentation audit](audit/2026-05-23-docs-audit.md) — historical
- [2026-05-22 foundation strengthening report](audit/2026-05-22-foundation-strengthening-report.md) — historical
- [2026-05-22 documentation audit](audit/2026-05-22-docs-audit.md) — historical

### Archive

- [Original seed plan, superseded](archive/2026-05-22-original-ha-ggis-hub-plan.md)
- [Slice 1 executable foundation report](archive/2026-05-23-slice-1-executable-foundation-report.md) — superseded by `haggis-eval`
- [Slice 2 hub-core movement and doors report](archive/2026-05-23-slice-2-hub-core-movement-and-doors-report.md) — superseded by `haggis-eval`
- [Slice 3 WASM boundary report](archive/2026-05-23-slice-3-wasm-boundary-report.md) — superseded by `haggis-eval`
- [Slice 4 TypeScript host lifecycle report](archive/2026-05-23-slice-4-typescript-host-lifecycle-report.md) — superseded by `haggis-eval`
- [Slice 5 Canvas2D first room report](archive/2026-05-23-slice-5-canvas2d-first-room-report.md) — superseded by `haggis-eval`
- Foundation docs 01, 02, 03, 06, 08, 09, 10 archived in the foundation prune — see the Foundation section above for direct links and distillation targets.

## Current executable foundation files

These files exist now and form the current executable foundation:

- `.gitignore`
- `.gitattributes`
- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `src/main.ts`
- `src/style.css`
- `src/app/app.ts`
- `src/app/app.test.ts`
- `src/engine/game-module.ts`
- `src/engine/input.ts`
- `src/engine/input.test.ts`
- `src/engine/lifecycle.ts`
- `src/engine/lifecycle.test.ts`
- `src/games/registry.ts`
- `src/games/registry.test.ts`
- `src/navigation/launch.ts`
- `src/navigation/launch.test.ts`
- `src/wasm/boundary.ts`
- `src/wasm/boundary.test.ts`
- `src/generated/hub-wasm/hub_wasm.js`
- `src/generated/hub-wasm/hub_wasm.d.ts`
- `src/generated/hub-wasm/hub_wasm_bg.wasm`
- `src/generated/hub-wasm/hub_wasm_bg.wasm.d.ts`
- `src/generated/hub-wasm/package.json`
- `src/hub/room.ts`
- `src/hub/room.test.ts`
- `src/render/canvas-room.ts`
- `src/render/canvas-room.test.ts`
- `src/vite-env.d.ts`
- `Cargo.toml` (workspace manifest)
- `Cargo.lock`
- `crates/hub-core/Cargo.toml`
- `crates/hub-core/src/lib.rs`
- `crates/hub-wasm/Cargo.toml`
- `crates/hub-wasm/src/lib.rs`

## Still-missing implementation files

The list is short — most of the original "missing by design" set has shipped (CI workflow, `public/_headers`, `public/_redirects`, `LICENSE`, plus the render/sprites/whs-\* modules and the `public/` deploy assets).

- `eslint.config.js` — shipped; `pnpm verify` runs ESLint alongside `tsc --strict`, Vitest, Vite build, and dist verification.
- `prettier.config.js` — not chosen; the codebase is small enough to hand-format consistently.
- `playwright.config.ts` — not chosen; smoke scripts under `scripts/` use `chromium.launch()` directly without a config file.
- `wrangler.toml` — only needed if GitHub Actions + Wrangler is chosen over native Cloudflare Pages build. Not chosen.

The "current executable foundation files" list above is a 2026-05-23 snapshot and is not maintained per-commit — run `git ls-files` for the full tree.
