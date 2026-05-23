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
| `security`            | `pnpm vitest run scripts/deploy-config.test.ts` — public/_headers + _redirects assertions |
| `browser`             | `node scripts/run-browser-smokes.mjs` — build → vite preview → door-launch (keyboard) + door-tap (touch) + pointer-drive (touch-drag) → teardown |
| `determinism`         | `node scripts/run-determinism-smoke.mjs` — same `?seed=` + same scripted input → same state-hash across two browser runs |
| `perf`                | `pnpm run build` + `node scripts/perf-budgets.mjs` — per-asset stem budgets from `perf-budgets.json` |
| `differential rng`    | `cargo test -p hub-hardlang --test differential_rng -- --include-ignored`   |
| `differential hash`   | `cargo test -p hub-hardlang --test differential_hash`                       |
| `all`                 | Every wired gate above, plus a signed JSON report                           |
| `slice <name>`        | Stub — exit 78, awaits `slices.toml`                                        |

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
