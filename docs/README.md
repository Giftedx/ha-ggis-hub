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

The repository now has an executable foundation skeleton: Rust workspace manifests, `hub-core`, `hub-wasm`, TypeScript/Vite host files, and deterministic lockfiles exist. `hub-core` also has deterministic fixed-unit movement, player bounds, and door proximity primitives; `hub-wasm` exposes those primitives through a typed boundary and `src/wasm/boundary.ts` provides the host initialization seam. Renderer/gameplay presentation, CI config, Playwright config, and Cloudflare config remain planned unless explicitly marked current.

## Recommended reading order

The list below is the full sequence. The root [`README.md`](../README.md) highlights a shorter "load-bearing four" if you have less time.

Foundation (read in numeric order):

1. [Project charter](foundation/00-project-charter.md)
2. [Engineering principles](foundation/01-engineering-principles.md)
3. [Technical bar](foundation/02-technical-bar.md)
4. [Product vision](foundation/03-product-vision.md)
5. [Architecture options](foundation/04-architecture-options.md)
6. [Stack decision record](foundation/05-stack-decision-record.md)
7. [Dependency policy](foundation/06-dependency-policy.md)
8. [Quality gates](foundation/07-quality-gates.md)
9. [Agent operating mode](foundation/08-agent-operating-mode.md)
10. [Release definition](foundation/09-release-definition.md)
11. [First Perfect Slice](foundation/10-first-perfect-slice.md)
12. [Quality manifesto](foundation/11-quality-manifesto.md)
13. [Craft commitments](foundation/12-craft-commitments.md)

Project-wide:

14. [Glossary](glossary.md)

Architecture (start with overview, then the section index can steer):

15. [Architecture section index](architecture/README.md)
16. [Architecture overview](architecture/overview.md)
17. [Runtime boundaries](architecture/runtime-boundaries.md)
18. [Data and save boundaries](architecture/data-and-save-boundaries.md)
19. [Testing strategy](architecture/testing-strategy.md)
20. [Security model](architecture/security-model.md)

Decisions and plans:

21. [ADR index](decisions/README.md)
22. [Implementation sequence](plans/2026-05-22-implementation-sequence.md)

## Canonical docs

### Project-wide

- [Documentation style guide](style-guide.md)
- [Glossary](glossary.md)

### Foundation

- [00 Project charter](foundation/00-project-charter.md)
- [01 Engineering principles](foundation/01-engineering-principles.md)
- [02 Technical bar](foundation/02-technical-bar.md)
- [03 Product vision](foundation/03-product-vision.md)
- [04 Architecture options](foundation/04-architecture-options.md)
- [05 Stack decision record](foundation/05-stack-decision-record.md)
- [06 Dependency policy](foundation/06-dependency-policy.md)
- [07 Quality gates](foundation/07-quality-gates.md)
- [08 Agent operating mode](foundation/08-agent-operating-mode.md)
- [09 Release definition](foundation/09-release-definition.md)
- [10 First Perfect Slice](foundation/10-first-perfect-slice.md)
- [11 Quality manifesto](foundation/11-quality-manifesto.md)
- [12 Craft commitments](foundation/12-craft-commitments.md)

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
- [ADR-0002: Renderer evaluation plan](decisions/0002-renderer-evaluation-plan.md) — proposed (decision-pending)
- [ADR-0003: WHS integration strategy](decisions/0003-whs-integration-strategy.md) — proposed (decision-pending)
- [ADR-0004: Language and craft philosophy](decisions/0004-language-and-craft-philosophy.md) — accepted

### Plans

- [Foundation plan](plans/2026-05-22-ha-ggis-hub-foundation.md)
- [Implementation sequence](plans/2026-05-22-implementation-sequence.md)
- [Slice 1 executable foundation plan](plans/2026-05-23-slice-1-executable-foundation.md)

### Deployment

- [Cloudflare Pages deployment foundation](deployment/cloudflare-pages.md)

### Research

- [2026-05-22 foundation research notes](research/2026-05-22-foundation-research-notes.md)

### Audit

- [2026-05-23 Slice 3 WASM boundary report](audit/2026-05-23-slice-3-wasm-boundary-report.md) — current
- [2026-05-23 Slice 2 hub-core movement and doors report](audit/2026-05-23-slice-2-hub-core-movement-and-doors-report.md) — current
- [2026-05-23 Slice 1 executable foundation report](audit/2026-05-23-slice-1-executable-foundation-report.md) — current
- [2026-05-23 documentation audit](audit/2026-05-23-docs-audit.md) — historical
- [2026-05-22 foundation strengthening report](audit/2026-05-22-foundation-strengthening-report.md) — historical
- [2026-05-22 documentation audit](audit/2026-05-22-docs-audit.md) — historical

### Archive

- [Original seed plan, superseded](archive/2026-05-22-original-ha-ggis-hub-plan.md)

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
- `src/wasm/boundary.ts`
- `src/wasm/boundary.test.ts`
- `src/vite-env.d.ts`
- `Cargo.toml` (workspace manifest)
- `Cargo.lock`
- `crates/hub-core/Cargo.toml`
- `crates/hub-core/src/lib.rs`
- `crates/hub-wasm/Cargo.toml`
- `crates/hub-wasm/src/lib.rs`

## Missing implementation files by design

These files are expected later but do not exist yet. The list is grouped by area so a contributor scanning for a specific concern can see what to expect.

Tooling and config:

- `eslint.config.js`
- `prettier.config.js`
- `playwright.config.ts`
- `.github/workflows/ci.yml`

TypeScript host planned directories from [Architecture overview](architecture/overview.md):

- `src/engine/`, `src/games/`, `src/navigation/`, `src/render/`, `src/ui/`

Deployment:

- `public/_headers`
- `public/_redirects`
- `wrangler.toml` (only if GitHub Actions + Wrangler is chosen over native Cloudflare Pages build)

Repository metadata (decisions deferred to maintainer):

- `LICENSE`

The absence of these files is not drift yet. It becomes drift only after the foundation phase is marked complete and the corresponding implementation slice begins (see [`docs/plans/2026-05-22-implementation-sequence.md`](plans/2026-05-22-implementation-sequence.md)).
