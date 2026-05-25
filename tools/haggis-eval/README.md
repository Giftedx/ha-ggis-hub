# haggis-eval

Go orchestrator CLI that wraps the existing project gates and produces a signed JSON report. Single binary, single source tree, standard library only.

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
| `ts`                  | `pnpm tsc --noEmit`, `pnpm vitest run`, `pnpm run build`                    |
| `coverage`            | `pnpm run coverage` — vitest v8 coverage with thresholds (lines≥90%, stmts≥90%, fns≥90%, branches≥85%). Excludes `src/main.ts` and generated wasm bindings. |
| `security`            | `pnpm vitest run scripts/deploy-config.test.ts` — public/_headers + _redirects assertions |
| `browser`             | `node scripts/run-browser-smokes.mjs` — build → vite preview → door-launch (keyboard) + door-tap (touch) + pointer-drive (touch-drag) → teardown |
| `determinism`         | `node scripts/run-determinism-smoke.mjs` — same `?seed=` + same scripted input → same state-hash across two browser runs |
| `perf`                | `pnpm run build` + `node scripts/perf-budgets.mjs` (per-asset stem budgets) + `node scripts/run-paint-gate.mjs` (W3C Paint Timing API: FCP/LCP via PerformanceObserver, DCL/load, plus `hub:firstFrame` user-mark fired from `src/main.ts` after the first canvas render — the canvas-aware paint metric the bothy needs because chrome's LCP heuristic collapses to FCP on this canvas-first app; median of 3 samples; budgets in `perf-budgets.json` `paint.max_ms`) |
| `differential rng`    | `cargo test -p hub-hardlang --test differential_rng -- --include-ignored`   |
| `differential hash`   | `cargo test -p hub-hardlang --test differential_hash`                       |
| `visual [verify\|capture]` | `node scripts/run-visual-gate.mjs` — perceptual aHash diff vs `tests/golden/`. `verify` is the default and is what `all` runs; `capture` re-baselines after intentional art changes. |
| `a11y`                | `node scripts/run-a11y-gate.mjs` — hand-rolled WCAG 2.2 AA spot-checks via Playwright: page language (3.1.1), viewport zoom (1.4.4), page title (2.4.2), canvas accessible name (1.1.1), interactive element accessible name (4.1.2), live status messaging (4.1.3), label-in-name (2.5.3), keyboard reachability (2.1.1), focus indicator visibility (2.4.7), and computed contrast ratio (1.4.3) on every declared text pair. 22 checks. No axe-core / pa11y dep. |
| `soak`                | `node scripts/run-soak-gate.mjs` — memory-growth soak: loads hub on fixed seed, 15s RAF loop, CDP `HeapProfiler.collectGarbage` before/after, asserts heap growth < 5 MB. |
| `supply-chain`        | `cargo deny check` — license compliance (allow list: MIT/Apache-2.0/BSD/ISC/Zlib/Unicode-3.0), RustSec advisory DB, duplicate version detection, source policy. Config: `deny.toml`. |
| `slice [name\|list]`  | Runs a named gate-set bundle from `tools/haggis-eval/slices.json`. Bundled bundles: `fast` (ts + perf), `pre-merge` (ts + security + perf + browser + determinism + visual + a11y), `release` (== `all` minus the signed-report write). With no name (or `list`), prints the available bundles. Override the config path via `HAGGIS_SLICES_PATH`. |
| `all`                 | Every wired gate above, plus a signed JSON report                           |

## Invocation cwd

`haggis-eval` shells out to `pnpm run …`, `node scripts/…`, and `cargo …`, all of which expect the **repo root** as the working directory. Run it as `./tools/haggis-eval/haggis-eval all` from the repo root (the way CI does); running it from inside `tools/haggis-eval/` will fast-fail every script-path gate because `scripts/…` doesn't resolve there.

## Exit codes

- `0` — every gate passed.
- `1` — at least one gate failed.
- `2` — invocation error (unknown subcommand, missing argument).
- `78` (`EX_CONFIG`) — a stubbed subcommand was invoked; its prerequisites have not been wired yet.

## Reports

`haggis-eval all` writes `target/haggis-eval/all-<utc>.json` containing every gate's structured result plus a `signature` field that is the FNV-1a 64-bit hash of the report payload (every field except the signature itself). Reproduce the signature by re-hashing the same payload — a divergent signature means the report was edited after writing.

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
```
