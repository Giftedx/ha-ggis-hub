# 2026-05-22 Documentation Audit

Status: historical audit report  
Scope: all Markdown files and repo/code drift at the time of foundation documentation setup  
Superseded by: [2026-05-23 documentation audit](2026-05-23-docs-audit.md)

## Repository state audited

Current working directory:

```text
C:/Users/aggis/dev/active/ha-ggis-hub
```

Markdown files found before this audit:

```text
2026-05-22-ha-ggis-hub-new-repo.md
.hermes/plans/2026-05-22_234351-ha-ggis-hub-foundation.md
```

Non-Markdown implementation/config files found before this audit:

```text
none
```

## Findings before fixes

### Existing files

1. `2026-05-22-ha-ggis-hub-new-repo.md`
   - Useful seed product plan.
   - Preserved good ideas: playable hub, ha.ggis domain joke, WHS separation, game registry, direct play path.
   - Outdated: assumes Vite + TypeScript + Phaser before architecture is justified.
   - Outdated: frames work as MVP, which conflicts with the current quality bar.
   - Missing: dependency policy, quality gates, ADRs, agent operating mode, deployment hardening, release definition.

2. `.hermes/plans/2026-05-22_234351-ha-ggis-hub-foundation.md`
   - Stronger foundation plan.
   - Correctly reframes first release as First Perfect Slice.
   - Correctly recommends Rust/WASM core + TypeScript host.
   - Needed promotion into repo docs and decomposition into canonical smaller documents.

### Missing docs

- Root `README.md`
- `docs/README.md`
- project charter
- engineering principles
- technical bar
- product vision
- architecture options
- stack decision record
- dependency policy
- quality gates
- agent operating mode
- release definition
- First Perfect Slice scope
- ADR for selected stack
- deployment foundation
- archive note for seed plan

### Contradictions/gaps

- Original seed plan recommends Phaser-first implementation; foundation plan recommends Rust/WASM + TypeScript host.
- Original seed plan uses MVP language; foundation plan rejects MVP framing.
- Original seed plan contains commands for files/config that do not exist yet without a clear “planned” label.
- No top-level index existed to tell contributors which document is canonical.

## Fixes applied

- Added root `README.md`.
- Added `docs/README.md` as the top-level documentation index.
- Added canonical foundation docs under `docs/foundation/`.
- Added ADR-0001 under `docs/decisions/`.
- Added Cloudflare Pages deployment foundation under `docs/deployment/`.
- Archived original seed plan under `docs/archive/` with supersession notice.
- Copied canonical foundation plan into `docs/plans/`.
- Labelled commands and target files as planned where no scaffold exists yet.

## Code/config drift check

There is currently no implementation scaffold. Therefore:

- Missing `package.json` is expected.
- Missing `Cargo.toml` is expected.
- Missing `vite.config.ts` is expected.
- Missing `playwright.config.ts` is expected.
- Missing `public/_headers` and `public/_redirects` is expected.
- Missing CI is expected.

Docs now state these as planned target files, not current facts.

## Remaining open decisions

1. First-slice renderer: Canvas2D or PixiJS.
2. WHS launch strategy: external URL first or mounted `/wild-haggis-survivors/` path first.
3. Whether deployment uses Cloudflare Pages Git integration directly or GitHub Actions + Wrangler.
4. Final visual direction for the first bothy/hub room.

## Deliberately scoped out

- No app scaffold was created.
- No package or Cargo manifests were created.
- No CI workflow was created.
- No Cloudflare deployment config was created.
- No renderer dependency was selected.

These are implementation-phase tasks after foundation review.
