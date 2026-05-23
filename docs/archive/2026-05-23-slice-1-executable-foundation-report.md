# 2026-05-23 Slice 1 Executable Foundation Report

> **Archived 2026-05-23.** Per-slice audit reports are superseded by the `haggis-eval` signed JSON reports under `target/haggis-eval/` (see [tools/haggis-eval/README.md](../../tools/haggis-eval/README.md)). Preserved for provenance.

Status: current audit report
Scope: repository/toolchain skeleton implementation
Related: [Slice 1 executable foundation plan](../plans/2026-05-23-slice-1-executable-foundation.md), [Implementation sequence](../plans/2026-05-22-implementation-sequence.md), [Quality gates](../foundation/07-quality-gates.md)

## Summary

Slice 1 moved ha.ggis Hub from documentation-only foundation to an executable foundation skeleton.

The slice deliberately did **not** implement gameplay, choose a renderer, add deployment configuration, mount Wild Haggis Survivors, or introduce a UI framework. It proves the project can now build and test the intended technical spine:

```text
Rust hub-core -> WASM wrapper -> TypeScript/Vite host -> replaceable renderer
```

## Files created

Repository hygiene:

- `.gitattributes`
- `.gitignore`

Rust workspace:

- `Cargo.toml`
- `Cargo.lock`
- `crates/hub-core/Cargo.toml`
- `crates/hub-core/src/lib.rs`
- `crates/hub-wasm/Cargo.toml`
- `crates/hub-wasm/src/lib.rs`

TypeScript/Vite host:

- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `src/main.ts`
- `src/style.css`
- `src/vite-env.d.ts`
- `src/app/app.ts`
- `src/app/app.test.ts`

Planning and documentation:

- `docs/plans/2026-05-23-slice-1-executable-foundation.md`
- `docs/audit/2026-05-23-slice-1-executable-foundation-report.md`

## Intentional dependencies

Runtime dependencies:

- none for the TypeScript host
- none for `hub-core`

Development/build dependencies:

- `typescript` — strict browser host language tooling
- `vite` — browser build tool selected by the accepted stack decision
- `vitest` — first TypeScript unit-test gate
- `wasm-bindgen` — Rust/WASM browser boundary for `hub-wasm`

No renderer, UI framework, router, state library, CSS framework, game engine, or convenience package was added.

## TDD evidence

Rust:

- `hub-core` identity tests were written before the identity API existed.
- Initial narrow test failed with unresolved imports for `core_identity`, `CORE_API_VERSION`, and `PROJECT_NAME`.
- The minimal API was then implemented and the narrow test passed.

TypeScript:

- `src/app/app.test.ts` was written before `src/app/app.ts` existed.
- Initial narrow test failed because `./app` could not be imported.
- The minimal `createAppModel()` implementation was then added and the narrow test passed.

## Checks run

The following checks were run successfully after implementation:

```bash
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```

The local Markdown link checker was also run successfully and reported `links_ok`.

The TypeScript/Vite build output was:

```text
dist/index.html                 0.50 kB │ gzip: 0.32 kB
dist/assets/index-*.css         1.13 kB │ gzip: 0.60 kB
dist/assets/index-*.js          1.63 kB │ gzip: 0.82 kB
```

## Checks staged but not yet current

These remain planned because their tools/configuration or meaningful targets do not exist yet:

- ESLint
- Prettier
- Playwright browser smoke tests
- GitHub Actions CI
- Cloudflare Pages preview/headers validation
- Cargo audit / cargo deny
- coverage thresholds
- Lighthouse
- size-limit
- fuzzing
- soak testing

They must not be reported as passing until the corresponding slice introduces and runs them.

## Risks and follow-ups

- Node is currently available as `v25.8.1`, which is newer than the usual LTS lane. `package.json` constrains project engines to `>=22 <26` for this slice; revisit before CI if the deployment host requires a narrower LTS pin.
- TypeScript was pinned to `5.9.3` instead of accepting the newest major because the newest TypeScript major triggered third-party Node type conflicts during `tsc --noEmit`.
- Renderer choice remains unresolved and must follow ADR-0002.
- Deployment headers/redirects remain planned and must be verified against Cloudflare docs/preview before production.

## Result

Slice 1 is complete when this report, source files, lockfiles, and documentation updates are committed together and the working tree is clean.
