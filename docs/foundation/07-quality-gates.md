# 07 Quality Gates

Status: canonical foundation policy
Scope: technical bar, required validation before PR/main/release milestones, and release definition
Related: [Quality manifesto](11-quality-manifesto.md), [Craft commitments](12-craft-commitments.md), [Deployment foundation](../deployment/cloudflare-pages.md)

## Current repo status

The executable foundation skeleton now exists. The skeleton gate below is current and must pass before further implementation slices are considered healthy. Broader PR/release/deep gates remain planned until their tools and targets are introduced.

## Gate tiers

### Current skeleton gate

Applies now:

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

### Documentation foundation gate

Also applies now:

- Markdown docs exist in the documented structure.
- Root README links resolve.
- Archived docs are marked superseded.
- Commands in docs are labelled planned if not executable yet.
- Docs do not claim code/config exists before it does.

### Full PR gate, planned

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

## Technical bar

### Baseline bar

The baseline is not “it runs.” The baseline is:

- architecture is documented
- code paths are testable
- core behavior has unit tests
- browser behavior has smoke tests
- dependencies are justified
- build output is budgeted
- deployment is hardened
- errors fail safely
- docs match the repo

### Architecture bar

A valid implementation slice must have:

- clear ownership boundaries between Rust core, WASM wrapper, TypeScript host, renderer, and deployment
- no hidden global runtime state
- explicit lifecycle for game modules
- explicit save/settings boundaries
- a documented route and launch model

### Correctness bar

Core rules should have tests for:

- movement bounds
- input mapping
- door proximity
- launch eligibility
- registry validation
- save schema and migration once saves exist

### Performance bar

The app should feel instant at the hub level. Games can lazy-load; the front door cannot feel bloated.

Initial budgets are defined below in [Initial budgets](#initial-budgets). Budgets may change only by documented decision.

### Security bar

The app is static, but static does not mean unserious.

Requirements:

- no committed secrets
- no high/critical dependency vulnerabilities
- restrictive CSP
- no accidental public source maps in production
- strict cache policy for hashed assets vs HTML
- no mixed content
- no broad third-party origins without explicit justification

### Documentation bar

Docs must say whether examples are current or planned. A command that cannot run yet because files are not scaffolded must not be presented as current.

### Visual/product bar

Programmer art is allowed during internal iteration. Public-facing placeholder slop is not. The first public slice needs intentional visual direction, even if minimal.

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

## Release philosophy

A release is not a build artifact. It is a claim that the project is safe, understandable, polished, and representative of the quality bar.

## First public release requirements

Product:

- `ha.ggis.xyz` loads the hub.
- `ggis.xyz` redirects to `ha.ggis.xyz`.
- The domain joke is visible.
- The haggis hub is playable.
- Wild Haggis Survivors can be launched.
- A direct launch button exists outside the canvas.
- Reduced-motion or non-game fallback path exists.

Engineering:

- Rust/WASM core exists for meaningful deterministic behavior.
- TypeScript host is strict and tested.
- Renderer lifecycle is clean.
- Game registry is data-driven and validated.
- Save/settings boundaries are documented.
- Security headers are configured.
- Production source-map policy is enforced.
- Browser smoke tests pass with no console errors.

Documentation:

- README and docs index are accurate.
- Foundation docs match implementation.
- ADRs exist for stack and renderer choices.
- Deployment docs match actual hosting configuration.
- Any planned command that cannot run is not represented as current.

## Preview vs production

Preview deployments may expose incomplete slices if clearly labelled and safe. Production must meet the release definition.

## Rollback posture

Static deployment should allow rollback to a previous known-good build. The release plan must include how to identify and restore that build before first production launch.
