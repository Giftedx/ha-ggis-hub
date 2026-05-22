# Documentation Index

This is the canonical index for ha.ggis Hub documentation.

## Documentation rules

- Markdown files use lowercase kebab-case names, except numbered foundation files which use a two-digit order prefix.
- Foundation docs are canonical policy. Plans must not contradict them.
- Decisions that select or reject major architecture must be captured as ADRs under `docs/decisions/`.
- Superseded material lives under `docs/archive/` with an explicit supersession note.
- Every doc should state its scope, status, and nearest related docs.
- Examples must be marked as one of: `planned`, `candidate`, or `current`.
- Commands that cannot run yet because the repo is not scaffolded must be labelled `planned`.

## Current documentation status

The repository is in foundation phase. There is no code scaffold, package manifest, Rust workspace, Vite config, CI config, or Cloudflare config yet. Docs that mention those files describe target architecture unless explicitly marked current.

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

### Deployment

- [Cloudflare Pages deployment foundation](deployment/cloudflare-pages.md)

### Research

- [2026-05-22 foundation research notes](research/2026-05-22-foundation-research-notes.md)

### Audit

- [2026-05-23 documentation audit](audit/2026-05-23-docs-audit.md) — current
- [2026-05-22 foundation strengthening report](audit/2026-05-22-foundation-strengthening-report.md) — historical
- [2026-05-22 documentation audit](audit/2026-05-22-docs-audit.md) — historical

### Archive

- [Original seed plan, superseded](archive/2026-05-22-original-ha-ggis-hub-plan.md)

## Missing implementation files by design

These files are expected later but do not exist yet. The list is grouped by area so a contributor scanning for a specific concern can see what to expect.

Tooling and config:

- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `eslint.config.js`
- `prettier.config.js`
- `vite.config.ts`
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `.gitignore`

Rust workspace:

- `Cargo.toml` (workspace manifest)
- `Cargo.lock`
- `crates/hub-core/Cargo.toml`
- `crates/hub-core/src/lib.rs`
- `crates/hub-wasm/Cargo.toml`
- `crates/hub-wasm/src/lib.rs`

TypeScript host (planned layout from [Architecture overview](architecture/overview.md)):

- `index.html`
- `src/style.css`
- `src/app/`, `src/engine/`, `src/games/`, `src/navigation/`, `src/render/`, `src/ui/`, `src/wasm/`

Deployment:

- `public/_headers`
- `public/_redirects`
- `wrangler.toml` (only if GitHub Actions + Wrangler is chosen over native Cloudflare Pages build)

Repository metadata (decisions deferred to maintainer):

- `LICENSE`

The absence of these files is not drift yet. It becomes drift only after the foundation phase is marked complete and the corresponding implementation slice begins (see [`docs/plans/2026-05-22-implementation-sequence.md`](plans/2026-05-22-implementation-sequence.md)).
