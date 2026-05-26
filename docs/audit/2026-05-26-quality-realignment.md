# 2026-05-26 Quality Realignment Audit

Status: current trust-recovery audit
Scope: code, tests, eval, and docs alignment for the first quality realignment slice
Related: [Quality gates](../foundation/07-quality-gates.md), [Testing strategy](../architecture/testing-strategy.md), [haggis-eval README](../../tools/haggis-eval/README.md)

## Restored

- Rust lint gate truth: `hub-core` no longer trips `clippy::doc-markdown` on the renderer `FEET_OFFSET` comment.
- TypeScript coverage truth: browser mount orchestration stays under Playwright smoke gates, while authored bothy runtime decisions, event-listener wrapping, listener cleanup, and pointer-capture teardown moved into `src/hub/bothy-runtime.ts` and are unit-tested.
- Input truth: movement plus Enter/Space/E now packs the movement bits and `INTERACT_BIT` in the same tick instead of returning before interact sampling.
- Smoke truth: `scripts/smoke-door-launch.mjs` now exits non-zero unless keyboard launch records the expected WHS URL with no page errors; `chrome-error://chromewebdata/` no longer counts as success.
- Eval truth: `haggis-eval rust-lint` exists as a real subcommand; `haggis-eval ts` now includes ESLint and `verify-dist`; `haggis-eval docs` gates current docs/eval claim drift; `haggis-eval verify-report` recomputes report signatures; the `pre-merge` slice now runs rust lint, docs-claim drift, TypeScript verify, coverage, security, perf, browser, determinism, visual, and a11y.
- CI truth: PRs run `haggis-eval slice pre-merge`; push-to-main runs the full `haggis-eval all` release gate.
- Report truth: current reports are described as FNV-signed tamper-evident JSON with JSON-safe hex string signatures, not cryptographically signed artifacts.

## Evidence

- `node scripts/check-doc-claims.mjs`: passed.
- `pnpm verify`: 25 test files, 180 tests, build and dist verification passed.
- `pnpm run coverage`: statements 99.05%, branches 93.40%, functions 98.30%, lines 99.29%.
- `cargo fmt --all -- --check`: passed.
- `cargo clippy --workspace --all-targets -- -D warnings`: passed.
- `node scripts/run-browser-smokes.mjs`: keyboard launch, tap launch, and pointer-drive smokes passed.
- `haggis-eval docs`: passed.
- `haggis-eval slice pre-merge`: passed the strengthened PR slice, including docs/claim-drift.
- `haggis-eval all`: overall PASS; report `target/haggis-eval/all-20260526T235030Z.json`; signature `0x4f6d1312836c0d6c`.
- `haggis-eval verify-report target/haggis-eval/all-20260526T235030Z.json`: passed.

## Still Future Work

- Reduce remaining slice-definition duplication where practical; current pre-merge claims are now checked against `slices.json`, but release-count prose still needs broader generation if the matrix grows again.
- Add live production probes for `ha.ggis.xyz`, `ggis.xyz`, security headers, and the WHS launch URL.
- Evaluate Firefox/WebKit smoke coverage after Chromium-only gates are stable.
- Design real cryptographic signing separately, including key custody, verification, and rotation.
