# 07 Quality Gates

Status: canonical foundation policy  
Scope: required validation before PR, main, and release milestones  
Related: [Technical bar](02-technical-bar.md), [Release definition](09-release-definition.md), [Agent operating mode](08-agent-operating-mode.md)

## Current repo status

The implementation has not been scaffolded yet. Commands below are planned gates. They become executable once the relevant files exist.

## Gate tiers

### Foundation gate

Applies now:

- Markdown docs exist in the documented structure.
- Root README links resolve.
- Archived docs are marked superseded.
- Commands in docs are labelled planned if not executable yet.
- Docs do not claim code/config exists before it does.

### PR gate, planned

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo nextest run --workspace --all-features
RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown --all-features
cargo audit
cargo deny check

pnpm install --frozen-lockfile
pnpm exec prettier . --check
pnpm exec eslint . --max-warnings=0
pnpm exec tsc --noEmit
pnpm exec vitest run --coverage
pnpm run build
pnpm exec playwright test --project=chromium
```

### Release gate, planned

```bash
cargo llvm-cov nextest --workspace --all-features --fail-under-lines 85
cargo machete
pnpm exec size-limit
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit
lhci autorun
osv-scanner --recursive .
gitleaks detect --source . -v
```

### Nightly/deep gate, planned

```bash
cargo +nightly fuzz run <target> -- -max_total_time=1800
cargo bench --workspace
pnpm exec playwright test --grep @soak
pnpm outdated
cargo outdated --workspace
```

## Initial budgets

- Rust core line coverage: >= 85%, target 90%.
- TypeScript statement coverage: >= 85%, target 90%.
- TypeScript branch coverage: >= 80%, target 85%.
- Initial JS gzip: <= 180 KB.
- Initial CSS gzip: <= 40 KB.
- Initial WASM gzip: <= 300 KB lean / <= 500 KB substantial.
- Total initial critical-path gzip: <= 750 KB.
- Lighthouse performance: >= 90.
- Lighthouse accessibility: >= 95.
- Lighthouse best practices: >= 95.
- LCP: <= 2.5s.
- CLS: <= 0.05.
- INP: <= 200ms.
- Normal frame p95 once game loop exists: <= 16.6ms.

## Release blockers

- failing test
- lint warning
- type error
- high/critical vulnerability
- missing or weak security headers
- bundle budget violation
- public production source maps shipped accidentally
- unreviewed license issue
- browser console errors
- known fuzz crash
- unbounded memory growth in soak testing
- docs contradicting actual shipped behavior

## No weakening policy

Quality gates may be staged while scaffolding. They may not be weakened to make an implementation look done. If a gate is too strict or wrong, update this policy with an explanation and evidence.
