# 07 Quality Gates

Status: canonical foundation policy
Scope: technical bar, required validation before PR/main/release milestones, and release definition
Related: [Quality manifesto](11-quality-manifesto.md), [Craft commitments](12-craft-commitments.md), [Deployment foundation](../deployment/cloudflare-pages.md)

## Current repo status

End-to-end functional. The full release-gate matrix is wired in `tools/haggis-eval` and runs on every push to main via `.github/workflows/ci.yml`; PRs run the stronger `haggis-eval slice pre-merge` gate. `pnpm verify` remains the local fast feedback command. The currently-unwired items called out below are explicitly opt-in (no multi-browser Playwright, no SCA scanners yet). The paint-timing half of `perf` is wired without a Lighthouse dep via the W3C Paint Timing API through chromium-headless. The a11y gate is wired without an axe-core / pa11y dep — a hand-rolled WCAG 2.2 AA spot-check suite via Playwright.

## Gate tiers

### Current PR Gate

Runs on every PR via `.github/workflows/ci.yml`:

```bash
cd tools/haggis-eval && go build .
cd ../..
./tools/haggis-eval/haggis-eval slice pre-merge
```

The pre-merge slice runs `rust-lint`, `docs`, `ts`, `coverage`, `security`, `perf`, `browser`, `determinism`, `visual`, `a11y`. It deliberately skips release-only workspace tests, soak, supply-chain, and differential fuzz gates.

Local fast feedback before opening a PR:

```bash
pnpm verify   # tsc --noEmit → eslint → vitest → vite build → scripts/verify-dist.mjs
```

### Current release gate (push to main)

Runs via the Go-orchestrated `haggis-eval all`. 22 gate results, ~3.5 min warm / ~5–6 min cold (soak adds ~20s), emits an FNV-signed tamper-evident JSON report under `target/haggis-eval/all-<utc>.json` and verifies it with `haggis-eval verify-report`:

```bash
# Rust workspace
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --exclude hub-wasm

# TypeScript host + deploy artifact gate
node scripts/check-doc-claims.mjs                       # current docs/eval claim drift
pnpm exec tsc --noEmit
pnpm exec eslint src/ vite.config.ts --max-warnings=0
pnpm exec vitest run
pnpm run build
node scripts/verify-dist.mjs
pnpm run coverage                                     # v8 coverage (lines≥90%, stmts≥90%, fns≥90%, branches≥85%)
pnpm exec vitest run scripts/deploy-config.test.ts   # security/headers
node scripts/perf-budgets.mjs                         # per-asset budgets
node scripts/run-paint-gate.mjs                       # paint-timing budgets (FCP/LCP/DCL/load)

# Browser-driven (vite preview internally)
node scripts/run-browser-smokes.mjs    # 3 chromium smokes
node scripts/run-determinism-smoke.mjs # state-hash equality
node scripts/run-visual-gate.mjs verify # perceptual aHash
node scripts/run-a11y-gate.mjs          # WCAG 2.2 AA spot-checks (hand-rolled)
node scripts/run-soak-gate.mjs          # memory-growth soak (15s; heap budget 5 MB)

# Supply-chain
cargo deny check                        # license compliance + RustSec advisories + source policy

# Hard-language differential tests
cargo test -p hub-hardlang --test differential_hash
cargo test -p hub-hardlang --test differential_rng -- --include-ignored
```

### Documentation foundation gate

Also applies now:

- Markdown docs exist in the documented structure.
- Root README links resolve.
- Archived docs are marked superseded.
- Commands in docs are labelled planned if not executable yet.
- Docs do not claim code/config exists before it does.

### Still-planned strictness on top of the current gates

The release-gate matrix above covers correctness, perf budgets, determinism, security headers, visual drift, and the hard-language showcase. The following deeper checks are deliberately not yet wired and would each be a separate slice:

```bash
# Rust deepening
cargo audit                  # crate advisories (deny.toml covers advisories; audit adds deeper history)
cargo machete                # unused-dep detection
cargo llvm-cov ... --fail-under-lines 85   # Rust coverage threshold
cargo +nightly fuzz run <target> -- -max_total_time=1800
cargo bench --workspace

# TypeScript deepening
pnpm exec prettier . --check

# Multi-browser + lab-perf
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit
pnpm exec playwright test --grep @soak

# Supply-chain scanners
osv-scanner --recursive .
gitleaks detect --source . -v
```

Why they're deferred: each adds either a non-trivial dependency (prettier config), or a non-deterministic / cost-sensitive surface (cargo-fuzz nightly, multi-browser Playwright matrix). They get added when the project is genuinely insufficient without them.

ESLint (`eslint` + `typescript-eslint`) was promoted out of this list and into the PR gate on 2026-05-24 — `pnpm lint` now runs as part of `pnpm verify`. Five code issues were surfaced and fixed: untyped array allocation, an unnecessary type cast, and three confusing-void-expression patterns in event-listener callbacks.

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
- TypeScript line/statement/function coverage: >= 90% configured.
- TypeScript branch coverage: >= 85% configured, target 90%.
- Initial JS gzip: <= 180 KB.
- Initial CSS gzip: <= 40 KB.
- Initial WASM gzip: <= 300 KB lean / <= 500 KB substantial.
- Total initial critical-path gzip: <= 750 KB.
- Performance (paint timing): asserted via the hand-rolled `haggis-eval perf paint-timing` gate (`scripts/run-paint-gate.mjs`) reading the W3C Paint Timing API + a `hub:firstFrame` user-mark. Budgets in `perf-budgets.json paint.max_ms` calibrated against Linux CI medians.
- Accessibility: asserted via the hand-rolled `haggis-eval a11y` gate (`scripts/run-a11y-gate.mjs` → `scripts/smoke-a11y.mjs`), 22 WCAG 2.2 AA spot-checks covering page language (3.1.1), viewport zoom (1.4.4), page title (2.4.2), canvas accessible name and fallback help (1.1.1), live door status (4.1.3), interactive element accessible name (4.1.2), label-in-name (2.5.3), keyboard reachability (2.1.1), focus indicator visibility (2.4.7), and computed contrast ratio (1.4.3) on every declared text pair. No axe-core dep; the hub's a11y surface is small + stable enough that focused asserts are more honest than a generic 80-rule engine.
- Lighthouse best practices: the signal this score provides is covered by existing gates without the Lighthouse dependency — security gate (CSP, HSTS, X-Frame-Options, COOP, CORP, Permissions-Policy), browser smoke (JS errors[] checked on every run), and `verify-dist.mjs` (doctype, charset, lang attribute, favicon, manifest). The bundle has no third-party JS libraries, so the "vulnerable library version" check is N/A. Not adding the Lighthouse dep per the hand-roll-over-library policy.
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

### Opt-In Production Proof

The live deployment probe is wired but not part of `pre-merge` or `all` until DNS/deploy is live:

```bash
./tools/haggis-eval/haggis-eval production
```

It probes `https://ha.ggis.xyz/`, the `https://ggis.xyz/` redirect, production security/cache headers, hashed immutable assets with no source-map references, and the WHS launch URL. Current status on 2026-05-27: it fails on DNS (`ENOTFOUND` for `ha.ggis.xyz` and `ggis.xyz`), which is an out-of-band Cloudflare/DNS blocker rather than a local code failure.

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
