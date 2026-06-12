# 07 Quality Gates

Status: canonical foundation policy
Scope: technical bar, required validation before PR/main/release milestones, and release definition
Related: [Quality manifesto](11-quality-manifesto.md), [Craft commitments](12-craft-commitments.md), [Deployment runbook](../DEPLOYMENT.md), [Deployment foundation](../deployment/cloudflare-pages.md)

## Current repo status

End-to-end functional. The full release-gate matrix is wired in `tools/haggis-eval` and runs on every push to main via `.github/workflows/ci.yml`; `pnpm verify` is the fast PR subset. The paint-timing half of `perf` is wired without a Lighthouse dep via the W3C Paint Timing API through chromium-headless. The a11y gate is wired without an axe-core / pa11y dep — a hand-rolled WCAG 2.2 AA spot-check suite via Playwright.

## Gate tiers

### Current PR gate (fast)

Runs on every PR via `.github/workflows/ci.yml`:

```bash
pnpm install --frozen-lockfile
pnpm verify   # docs:claims → tsc --noEmit → eslint (src/ + scripts/) → prettier --check → vitest → vite build → scripts/verify-dist.mjs
```

The `docs:claims` step runs `node scripts/check-doc-claims.mjs`, which rejects crypto-signing overclaims and generic `signed JSON report` wording unless the claim is explicitly FNV/tamper-evident qualified or negated.

The pre-merge slice runs `docs`, `ts`, `security`, `perf`, `browser`, `determinism`, `visual`, `a11y`.

### Current release gate (push to main)

Runs via the Go-orchestrated `haggis-eval all`. 16 gate subcommands (25 individual checks), ~3.5 min warm / ~5–6 min cold (soak adds ~20s), emits an FNV-signed tamper-evident JSON report under `target/haggis-eval/all-<utc>.json`:

```bash
# Rust workspace
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --exclude hub-wasm
cargo llvm-cov --workspace --exclude hub-wasm --fail-under-lines 100 --fail-under-functions 100

# TypeScript host + deploy artifact gate
node scripts/check-doc-claims.mjs                  # docs/report claim drift guard
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
pnpm run coverage                                     # v8 coverage (lines=100%, stmts=100%, fns=100%, branches=100%)
pnpm exec vitest run scripts/deploy-config.test.ts   # security/headers
node scripts/perf-budgets.mjs                         # per-asset budgets
node scripts/run-paint-gate.mjs                       # paint-timing budgets (FCP/LCP/DCL/load)

# Browser-driven (vite preview internally)
node scripts/run-browser-smokes.mjs    # 7 chromium smokes (incl. a11y gate)
PLAYWRIGHT_BROWSER=firefox node scripts/run-browser-smokes.mjs  # 6 core smokes on firefox
PLAYWRIGHT_BROWSER=webkit  node scripts/run-browser-smokes.mjs  # 6 core smokes on webkit
node scripts/run-determinism-smoke.mjs # state-hash equality
node scripts/run-visual-gate.mjs verify # perceptual aHash
node scripts/run-a11y-gate.mjs          # WCAG 2.2 AA spot-checks (hand-rolled)
node scripts/run-soak-gate.mjs          # memory-growth soak (15s; heap budget 5 MB)

# Supply-chain
cargo deny check                        # license compliance + RustSec advisories + source policy
cargo machete                           # unused dependency detection
gitleaks detect --source . --no-banner  # git history scan for accidentally committed secrets
osv-scanner --recursive .               # cross-ecosystem CVE scan (Cargo.lock + pnpm-lock.yaml + go.mod)

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
# cargo machete promoted to supply-chain gate on 2026-05-27 — see above
# cargo llvm-cov promoted to rust-cov gate on 2026-05-27 — see above
cargo +nightly fuzz run <target> -- -max_total_time=1800
cargo bench --workspace

# TypeScript deepening
# (prettier promoted to gate — see below)

# Multi-browser + lab-perf
# firefox + webkit promoted to multi-browser gate on 2026-05-27 — see above
# memory-growth soak IS covered: the hand-rolled scripts/run-soak-gate.mjs
# (RAF loop with a heap-growth budget) is wired into the release matrix. The
# playwright @soak-tagged variant below was the originally-sketched approach
# and was not pursued — the custom gate supersedes it.
pnpm exec playwright test --grep @soak

# Supply-chain scanners
# osv-scanner promoted to supply-chain gate on 2026-05-27 — see above
# gitleaks promoted to supply-chain gate on 2026-05-27 — see above
```

Why they're deferred: each adds either a non-trivial dependency, or a non-deterministic / cost-sensitive surface (cargo-fuzz nightly). They get added when the project is genuinely insufficient without them.

ESLint (`eslint` + `typescript-eslint`) was promoted out of this list and into the PR gate on 2026-05-24 — `pnpm lint` now runs as part of `pnpm verify`. Five code issues were surfaced and fixed: untyped array allocation, an unnecessary type cast, and three confusing-void-expression patterns in event-listener callbacks. Lint scope expanded on 2026-05-27 to cover `scripts/` in addition to `src/` and `vite.config.ts`: `.mjs` files use `disableTypeChecked` (no project service); `scripts/deploy-config.test.ts` was added to `tsconfig.json` include so it also receives full type-checking from `tsc --noEmit`.

Prettier was promoted on 2026-05-27 — `pnpm fmt:check` (`prettier --check "src/**/*.ts" "scripts/**/*.mjs"`) now runs as part of `pnpm verify`. Config: `singleQuote: true, trailingComma: "es5", printWidth: 100`. Generated files excluded via `.prettierignore`. All source and script files formatted in the same commit; 100% TS coverage held after reformatting.

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

- Rust core line coverage: 100% (enforced by cargo llvm-cov; raised from 85% target on 2026-05-27).
- Rust core function coverage: 100% (enforced by cargo llvm-cov).
- TypeScript statement coverage: 100% (enforced by vitest threshold; raised from 90% on 2026-05-27).
- TypeScript branch coverage: 100% (enforced; raised from 85% on 2026-05-27).
- TypeScript function coverage: 100% (enforced; raised from 90% on 2026-05-27).
- TypeScript line coverage: 100% (enforced; raised from 90% on 2026-05-27).
- Initial JS gzip: <= 180 KB.
- Initial CSS gzip: <= 40 KB.
- Initial WASM gzip: <= 300 KB lean / <= 500 KB substantial.
- Total initial critical-path gzip: <= 750 KB.
- Performance (paint timing): asserted via the hand-rolled `haggis-eval perf paint-timing` gate (`scripts/run-paint-gate.mjs`) reading the W3C Paint Timing API + a `hub:firstFrame` user-mark. Budgets in `perf-budgets.json paint.max_ms` calibrated against Linux CI medians.
- Accessibility: asserted via the hand-rolled `haggis-eval a11y` gate (`scripts/run-a11y-gate.mjs` → `scripts/smoke-a11y.mjs`), 26 WCAG 2.2 AA spot-checks covering page language (3.1.1), viewport zoom (1.4.4), page title (2.4.2), canvas accessible name and fallback help (1.1.1), live door status (4.1.3), interactive element accessible name (4.1.2), label-in-name (2.5.3), keyboard reachability (2.1.1), focus indicator visibility (2.4.7), computed contrast ratio (1.4.3) on every declared text pair, self-hosted font load verification, and a runtime page-error check. No axe-core dep; the hub's a11y surface is small + stable enough that focused asserts are more honest than a generic 80-rule engine.
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
