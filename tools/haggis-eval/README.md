# haggis-eval

Go orchestrator CLI that wraps the existing project gates and produces an FNV-signed tamper-evident JSON report. Single binary, single source tree, standard library only.

See [kernel design spec §2.7](../../docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md) for the design.

## Build

```
cd tools/haggis-eval
go build .
```

Produces `./haggis-eval` (or `./haggis-eval.exe` on Windows).

## Subcommands

| Subcommand            | What it runs                                                                |
|-----------------------|-----------------------------------------------------------------------------|
| `rust`                | `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test --workspace`   |
| `rust-cov`            | `cargo llvm-cov --workspace --exclude hub-wasm --fail-under-lines 100 --fail-under-functions 100`. Requires `llvm-tools-preview` rustup component and `cargo-llvm-cov` binary. |
| `docs`                | `node scripts/check-doc-claims.mjs` — documentation/report claim drift scanner; rejects cryptographic-signing overclaims and generic signed-report wording unless it is FNV/tamper-evident qualified or explicitly negated. |
| `ts`                  | `pnpm tsc --noEmit`, `pnpm vitest run`, `pnpm run build`                    |
| `coverage`            | `pnpm run coverage` — vitest v8 coverage with thresholds (lines=100%, stmts=100%, fns=100%, branches=100%). Excludes `src/main.ts` and generated wasm bindings. |
| `security`            | `pnpm vitest run scripts/deploy-config.test.ts` — public/_headers + _redirects assertions |
| `browser`             | `node scripts/run-browser-smokes.mjs` — build → vite preview → door-launch + door-tap + pointer-drive + music-toggle + reduced-motion + locked-door + a11y on chromium → teardown |
| `multi-browser`       | Same runner with `PLAYWRIGHT_BROWSER=firefox` then `webkit`. Runs 6 core smokes (a11y excluded — keyboard focus ordering for anchors is OS-dependent on non-chromium). Requires `playwright install firefox webkit`. |
| `determinism`         | `node scripts/run-determinism-smoke.mjs` — same `?seed=` + same scripted input → same state-hash across two browser runs |
| `perf`                | `pnpm run build` + `node scripts/perf-budgets.mjs` (per-asset stem budgets) + `node scripts/run-paint-gate.mjs` (W3C Paint Timing API: FCP/LCP via PerformanceObserver, DCL/load, plus `hub:firstFrame` user-mark fired from `src/main.ts` after the first canvas render — the canvas-aware paint metric the bothy needs because chrome's LCP heuristic collapses to FCP on this canvas-first app; median of 3 samples; budgets in `perf-budgets.json` `paint.max_ms`) |
| `differential rng`    | `cargo test -p hub-hardlang --test differential_rng -- --include-ignored`   |
| `differential hash`   | `cargo test -p hub-hardlang --test differential_hash`                       |
| `visual [verify\|capture]` | `node scripts/run-visual-gate.mjs` — perceptual aHash diff vs `tests/golden/`. `verify` is the default and is what `all` runs; `capture` re-baselines after intentional art changes. |
| `a11y`                | `node scripts/run-a11y-gate.mjs` — hand-rolled WCAG 2.2 AA spot-checks via Playwright: page language (3.1.1), viewport zoom (1.4.4), page title (2.4.2), canvas accessible name and persistent fallback (1.1.1), interactive element accessible name (4.1.2), live status messaging (4.1.3), label-in-name (2.5.3), keyboard reachability (2.1.1), focus indicator visibility (2.4.7), computed contrast ratio (1.4.3) on every declared text pair, and self-hosted font load. 26 checks. No axe-core / pa11y dep. |
| `soak`                | `node scripts/run-soak-gate.mjs` — memory-growth soak: loads hub on fixed seed, 15s RAF loop, CDP `HeapProfiler.collectGarbage` before/after, asserts heap growth < 5 MB. |
| `supply-chain`        | `cargo deny check` — license compliance (allow list: MIT/Apache-2.0/BSD/ISC/Zlib/Unicode-3.0), RustSec advisory DB, duplicate version detection, source policy. Config: `deny.toml`. `cargo machete` — unused dependency detection. `gitleaks detect` — git history scan for secrets. `osv-scanner --recursive .` — cross-ecosystem CVE scan across Cargo.lock + pnpm-lock.yaml + go.mod; exceptions documented in `osv-scanner.toml`. |
| `production`          | `node scripts/check-production.mjs` — opt-in live probe for `ha.ggis.xyz`, `ggis.xyz` redirect preserving path/query, required production headers/CSP, immutable hashed hub + `/wild/` assets, source-map absence, the mounted WHS route at `/wild/`, and `/__version` build provenance. Not part of `all` because production can temporarily lag the branch under review. |
| `verify-report <path>` | Recomputes the FNV-1a signature for a `haggis-eval` JSON report payload and fails on tamper/mismatch. Reads the current numeric `signature` field shape. |
| `slice [name\|list]`  | Runs a named gate-set bundle from `tools/haggis-eval/slices.json`. Bundled bundles: `fast` (docs + ts + perf), `pre-merge` (docs + ts + security + perf + browser + determinism + visual + a11y), `release` (== `all` minus the FNV-signed report write), `production` (opt-in live deployment probe). With no name (or `list`), prints the available bundles. Override the config path via `HAGGIS_SLICES_PATH`. |
| `all`                 | Every release/CI gate above except the opt-in live `production` probe, plus an FNV-signed tamper-evident JSON report                           |

## Invocation cwd

`haggis-eval` shells out to `pnpm run …`, `node scripts/…`, and `cargo …`, all of which expect the **repo root** as the working directory. Run it as `./tools/haggis-eval/haggis-eval all` from the repo root (the way CI does); running it from inside `tools/haggis-eval/` will fast-fail every script-path gate because `scripts/…` doesn't resolve there.

## Exit codes

- `0` — every gate passed.
- `1` — at least one gate failed.
- `2` — invocation error (unknown subcommand, missing argument).
- `78` (`EX_CONFIG`) — reserved for configuration errors; no current subcommand intentionally returns this for a stubbed gate.

## Reports

`haggis-eval all` writes `target/haggis-eval/all-<utc>.json` containing every gate's structured result plus a `signature` field. That field is a keyless, non-cryptographic FNV-1a 64-bit checksum of the report payload (every field except the signature itself), not a cryptographic signature. Re-hashing the same payload reproduces the checksum; a divergent checksum means the report bytes changed after writing unless someone deliberately recomputed it.

The Go FNV-1a implementation at `internal/fnv/` is a third hand-rolled implementation of the algorithm, tested against the same four published reference vectors as `crates/hub-core/src/hash.rs` (Rust) and `c/fnv1a.c` (C). All three agree byte-for-byte:

| input                  | digest                  |
|------------------------|-------------------------|
| `""`                   | `0xcbf29ce484222325`    |
| `"a"`                  | `0xaf63dc4c8601ec8c`    |
| `"foobar"`             | `0x85944171f73967e8`    |
| `"chongo was here!\n"` | `0x46810940eff5f915`    |

## Tests

```
cd tools/haggis-eval
go test ./...
gofmt -l .
go vet ./...
go build .
./haggis-eval verify-report ../../target/haggis-eval/all-<utc>.json
```

Run the verifier from the repo root as `./tools/haggis-eval/haggis-eval verify-report target/haggis-eval/all-<utc>.json` (or `haggis-eval.exe` on Windows) when checking an emitted report.
