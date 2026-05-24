# Kernel haggis-eval CLI Implementation Plan

> **Historical plan, preserved as provenance.** This plan landed in full by 2026-05-24. Every subcommand it described as "stub — exit 78" (`browser`, `determinism`, `perf`, `security`, `slice`) is now wired with real infrastructure. Current state of the CLI lives in [`tools/haggis-eval/README.md`](../../../tools/haggis-eval/README.md) (canonical) and is summarised in [Slice 9 of the implementation sequence](../../plans/2026-05-22-implementation-sequence.md#slice-9-haggis-eval-cli--fully-wired-9-real-subcommands-0-stubs). Do not treat the stub descriptions or "to implement this plan" language below as live work.

> **For agentic workers (historical):** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal (historical, achieved):** Land the `haggis-eval` Go orchestrator CLI from [kernel design spec §2.7](../specs/2026-05-23-hub-determinism-kernel-design.md). Single binary that wraps the gates already implemented (cargo + pnpm + hardlang differentials), aggregates pass/fail with a signed JSON report, and stubs the not-yet-implemented gates (browser/perf/security) behind a clear "configure me" exit code rather than fake passes.

**Architecture:** Single Go module at `tools/haggis-eval/` with hand-rolled subcommand dispatch (no Cobra — per [Craft commitments §A](../../foundation/12-craft-commitments.md) we hand-roll central primitives). Subcommands shell out to existing tools (`cargo`, `pnpm`) and capture combined output. Each subcommand returns a structured `GateResult { name, status, duration_ms, stdout_tail, stderr_tail }`. The `all` subcommand runs every wired subcommand sequentially, collects results, and writes a `report.json` whose `signature` field is the FNV-1a 64-bit digest of the report payload — proves the bundle was not edited after the fact. MVP wires `rust`, `ts`, `differential rng`, `differential hash`. Stubs `browser`, `determinism`, `perf`, `security`, `slice` as `EX_CONFIG` (78) failures with a one-line "implemented in plan N" message.

**Tech Stack:** Go 1.22+ (1.24.3 verified locally), standard library only (no Cobra, no toml/yaml libraries, no zerolog — stdlib `flag`, `encoding/json`, `os/exec`, `testing`). Builds to `tools/haggis-eval/haggis-eval` (or `.exe` on Windows). No new dev-deps elsewhere; no host changes; no Rust changes.

---

## File Structure

**Created (new):**
- `tools/haggis-eval/go.mod` — Go module manifest, single-module workspace.
- `tools/haggis-eval/main.go` — entry point: subcommand dispatcher, version/help.
- `tools/haggis-eval/internal/gate/gate.go` — `GateResult` type, generic shell-out runner.
- `tools/haggis-eval/internal/gate/gate_test.go` — tests the shell-out runner against fixed commands.
- `tools/haggis-eval/internal/cmd/rust.go` — `rust` subcommand: runs cargo fmt + clippy + test sequence.
- `tools/haggis-eval/internal/cmd/ts.go` — `ts` subcommand: runs pnpm tsc + vitest + build sequence.
- `tools/haggis-eval/internal/cmd/differential.go` — `differential rng` and `differential hash` subcommands.
- `tools/haggis-eval/internal/cmd/stub.go` — `EX_CONFIG`-returning placeholder for browser/determinism/perf/security/slice.
- `tools/haggis-eval/internal/cmd/all.go` — `all` subcommand: runs the wired gates, aggregates.
- `tools/haggis-eval/internal/report/report.go` — JSON report struct, FNV-1a signing, writer.
- `tools/haggis-eval/internal/report/report_test.go` — tests JSON round-trip + signature verification.
- `tools/haggis-eval/internal/fnv/fnv.go` — pure-Go FNV-1a 64-bit hash. Hand-rolled per the project's hand-roll-over-library bar, and so the Go report signature can be independently verified by reproducing the digest from the report payload bytes.
- `tools/haggis-eval/internal/fnv/fnv_test.go` — reference vectors (same four the Rust and C sides test against).
- `tools/haggis-eval/README.md` — one-page user-facing doc: how to build, what each subcommand does, exit codes.

**Modified:**
- Root `.gitignore` — add `tools/haggis-eval/haggis-eval`, `tools/haggis-eval/haggis-eval.exe`, and `tools/haggis-eval/target/` (report output dir).
- `README.md` (workspace root) — append a "haggis-eval CLI" section under Current executable gates pointing at `tools/haggis-eval/README.md`.

**Untouched:**
- Everything in `crates/` and `src/`. Plan 4 is orchestrator-only.

---

## Phase 0 — Baseline

### Task 0: Confirm baseline + Go toolchain

- [ ] **Step 0.1: Run existing gates**

```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```
PowerShell:
```
$env:RUSTFLAGS="-D warnings"; cargo check --workspace --target wasm32-unknown-unknown
```
Expected: 44 cargo tests, 43 vitest tests, all green.

- [ ] **Step 0.2: Confirm Go is installed**

Run: `go version`
Expected: Go 1.22 or newer (1.24.3 verified locally on the user's machine).

- [ ] **Step 0.3: Confirm `gofmt` is available (ships with Go)**

Run: `gofmt -h 2>&1 | head -3`
Expected: prints usage (gofmt does not have `--version`; the help output is the canonical availability check).

---

## Phase 1 — FNV-1a in Go

We need FNV-1a in Go for the report signature. Hand-roll it. Same reason as the Rust hash and the C hash: the algorithm is small, the project owns it, and having a third language implementation that produces the same digests across all four reference vectors is a strong portfolio signal.

### Task 1: Bootstrap the Go module

**Files:**
- Create: `tools/haggis-eval/go.mod`
- Create: `tools/haggis-eval/main.go` (skeleton — fills out in later tasks)

- [ ] **Step 1.1: Create the module**

Create directory `tools/haggis-eval/`. Then create `tools/haggis-eval/go.mod`:
```
module github.com/aggis/ha-ggis-hub/tools/haggis-eval

go 1.22
```

- [ ] **Step 1.2: Create a minimal `main.go`**

Create `tools/haggis-eval/main.go`:
```go
// Package main is the haggis-eval CLI entry point. See README.md.
package main

import (
	"fmt"
	"os"
)

const version = "0.1.0"

func main() {
	if len(os.Args) < 2 {
		usage(os.Stderr)
		os.Exit(2)
	}
	switch os.Args[1] {
	case "version", "--version", "-V":
		fmt.Println(version)
	case "help", "--help", "-h":
		usage(os.Stdout)
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand: %s\n\n", os.Args[1])
		usage(os.Stderr)
		os.Exit(2)
	}
}

func usage(w *os.File) {
	fmt.Fprintln(w, "haggis-eval — ha.ggis Hub eval orchestrator")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Usage: haggis-eval <subcommand>")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Subcommands wired in plan 4:")
	fmt.Fprintln(w, "  rust                       Cargo fmt + clippy + test")
	fmt.Fprintln(w, "  ts                         pnpm tsc + vitest + build")
	fmt.Fprintln(w, "  differential rng           WAT vs Rust xoshiro128**, 1M draws")
	fmt.Fprintln(w, "  differential hash          C vs Rust FNV-1a, vectors + 100k fuzz")
	fmt.Fprintln(w, "  all                        Every wired gate; signed JSON report")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Stubs (return exit 78 until implemented):")
	fmt.Fprintln(w, "  browser determinism perf security slice")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Common flags:")
	fmt.Fprintln(w, "  --version    Print version")
	fmt.Fprintln(w, "  --help       Print this help")
}
```

- [ ] **Step 1.3: Verify the binary builds and prints version**

Run:
```
cd tools/haggis-eval
go build .
./haggis-eval --version
./haggis-eval --help
```
On Windows the binary is `./haggis-eval.exe`. Output: prints `0.1.0` then the usage block.

If you used `cd tools/haggis-eval`, return to repo root before continuing: `cd ../..`.

### Task 2: Add FNV-1a 64-bit hash in Go

**Files:**
- Create: `tools/haggis-eval/internal/fnv/fnv.go`
- Create: `tools/haggis-eval/internal/fnv/fnv_test.go`

- [ ] **Step 2.1: Write the failing test**

Create `tools/haggis-eval/internal/fnv/fnv_test.go`:
```go
package fnv

import "testing"

func TestFnv1a64ReferenceVectors(t *testing.T) {
	cases := []struct {
		input []byte
		want  uint64
	}{
		{[]byte(""), 0xcbf29ce484222325},
		{[]byte("a"), 0xaf63dc4c8601ec8c},
		{[]byte("foobar"), 0x85944171f73967e8},
		{[]byte("chongo was here!\n"), 0x46810940eff5f915},
	}
	for _, tc := range cases {
		got := Fnv1a64(tc.input)
		if got != tc.want {
			t.Errorf("Fnv1a64(%q) = %#x, want %#x", tc.input, got, tc.want)
		}
	}
}

func TestStreamingEqualsOneShot(t *testing.T) {
	input := []byte("the quick brown haggis jumps over the lazy bothy")
	hasher := NewHasher()
	for i := 0; i < len(input); i += 7 {
		end := i + 7
		if end > len(input) {
			end = len(input)
		}
		hasher.Write(input[i:end])
	}
	got := hasher.Digest()
	want := Fnv1a64(input)
	if got != want {
		t.Errorf("streaming digest %#x != one-shot %#x", got, want)
	}
}
```

- [ ] **Step 2.2: Run, expect compile failure**

Run: `cd tools/haggis-eval && go test ./internal/fnv/...`
Expected: error `undefined: Fnv1a64` and `undefined: NewHasher`.

- [ ] **Step 2.3: Implement the hasher**

Create `tools/haggis-eval/internal/fnv/fnv.go`:
```go
// Package fnv implements FNV-1a 64-bit hash. Hand-rolled to match the
// Rust implementation in crates/hub-core/src/hash.rs and the C
// implementation in c/fnv1a.c. Used for the report signature in
// internal/report so the haggis-eval JSON bundle can be verified as
// untampered.
package fnv

const (
	offsetBasis64 uint64 = 0xcbf29ce484222325
	prime64       uint64 = 0x100000001b3
)

// Fnv1a64 returns the FNV-1a 64-bit hash of data.
func Fnv1a64(data []byte) uint64 {
	h := offsetBasis64
	for _, b := range data {
		h ^= uint64(b)
		h *= prime64
	}
	return h
}

// Hasher is a streaming FNV-1a 64-bit hasher.
type Hasher struct {
	state uint64
}

// NewHasher returns a hasher seeded with the FNV-1a offset basis.
func NewHasher() *Hasher {
	return &Hasher{state: offsetBasis64}
}

// Write absorbs bytes into the hasher.
func (h *Hasher) Write(p []byte) {
	s := h.state
	for _, b := range p {
		s ^= uint64(b)
		s *= prime64
	}
	h.state = s
}

// Digest returns the current 64-bit digest.
func (h *Hasher) Digest() uint64 {
	return h.state
}
```

- [ ] **Step 2.4: Run, expect pass**

Run: `cd tools/haggis-eval && go test ./internal/fnv/...`
Expected: `ok` for the package, both tests pass.

- [ ] **Step 2.5: Run `gofmt -l` (no output means clean)**

Run: `cd tools/haggis-eval && gofmt -l .`
Expected: prints nothing. If it prints filenames those files need formatting; run `gofmt -w .` to fix.

---

## Phase 2 — Shell-out runner + `rust` and `ts` subcommands

### Task 3: Generic `GateResult` + shell-out runner

**Files:**
- Create: `tools/haggis-eval/internal/gate/gate.go`
- Create: `tools/haggis-eval/internal/gate/gate_test.go`

- [ ] **Step 3.1: Write the runner test**

Create `tools/haggis-eval/internal/gate/gate_test.go`:
```go
package gate

import (
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestRunReportsExitCodeAndCapturedOutput(t *testing.T) {
	// Choose a portable command: `go env GOOS` prints to stdout and exits 0.
	r := Run("env", "env-check", "go", "env", "GOOS")
	if r.Status != StatusPass {
		t.Fatalf("expected PASS, got %s; stderr=%q", r.Status, r.StderrTail)
	}
	if !strings.Contains(r.StdoutTail, runtime.GOOS) {
		t.Errorf("stdout did not contain GOOS %q: %q", runtime.GOOS, r.StdoutTail)
	}
	if r.DurationMs < 0 {
		t.Errorf("negative duration: %d", r.DurationMs)
	}
}

func TestRunReportsFailingExit(t *testing.T) {
	// `go` with no subcommand prints help and exits 2.
	r := Run("missing-arg", "go-no-args", "go")
	if r.Status != StatusFail {
		t.Fatalf("expected FAIL, got %s", r.Status)
	}
	if r.ExitCode == 0 {
		t.Errorf("expected nonzero exit, got 0")
	}
}

func TestRunReportsMissingBinary(t *testing.T) {
	r := Run("missing-bin", "definitely-not-a-binary-12345", "anywhere")
	if r.Status != StatusError {
		t.Errorf("expected ERROR, got %s", r.Status)
	}
}

func TestDurationMonotonic(t *testing.T) {
	start := time.Now()
	r := Run("env", "env-check", "go", "env", "GOOS")
	elapsed := time.Since(start).Milliseconds()
	if r.DurationMs > elapsed+50 {
		t.Errorf("reported duration %dms exceeds wall-clock %dms", r.DurationMs, elapsed)
	}
}
```

- [ ] **Step 3.2: Run, expect compile failure**

Run: `cd tools/haggis-eval && go test ./internal/gate/...`
Expected: errors about undefined `Run`, `StatusPass`, `StatusFail`, `StatusError`.

- [ ] **Step 3.3: Implement the runner**

Create `tools/haggis-eval/internal/gate/gate.go`:
```go
// Package gate provides the shell-out primitive that subcommands use to
// run external tools and capture pass/fail with rich metadata.
package gate

import (
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// Status of a single gate run.
type Status string

const (
	StatusPass  Status = "PASS"
	StatusFail  Status = "FAIL"
	StatusError Status = "ERROR" // could not invoke the tool at all
)

// Result is the structured outcome of one gate.
type Result struct {
	Category   string `json:"category"`    // e.g. "rust", "ts", "differential"
	Name       string `json:"name"`        // e.g. "cargo-fmt", "vitest", "wat-rng"
	Status     Status `json:"status"`
	ExitCode   int    `json:"exit_code"`
	DurationMs int64  `json:"duration_ms"`
	StdoutTail string `json:"stdout_tail"` // last N bytes
	StderrTail string `json:"stderr_tail"`
	Command    string `json:"command"`     // the actual command line invoked
}

// stdoutTailBytes is the cap on captured stdout per gate. Plenty for the
// last test result lines without bloating the report.
const stdoutTailBytes = 8 * 1024

// Run executes the command and captures its outcome.
//
// `category` and `name` are recorded in the result for grouping; `bin`
// and `args` are passed straight to exec.Command.
func Run(category, name, bin string, args ...string) Result {
	cmdLine := bin
	if len(args) > 0 {
		cmdLine = bin + " " + strings.Join(args, " ")
	}
	cmd := exec.Command(bin, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	start := time.Now()
	runErr := cmd.Run()
	dur := time.Since(start).Milliseconds()

	out := tailBytes(stdout.Bytes(), stdoutTailBytes)
	errOut := tailBytes(stderr.Bytes(), stdoutTailBytes)

	var execErr *exec.Error
	if errors.As(runErr, &execErr) {
		return Result{
			Category:   category,
			Name:       name,
			Status:     StatusError,
			ExitCode:   -1,
			DurationMs: dur,
			StdoutTail: out,
			StderrTail: fmt.Sprintf("could not execute %q: %v", bin, runErr),
			Command:    cmdLine,
		}
	}
	exit := cmd.ProcessState.ExitCode()
	status := StatusPass
	if exit != 0 {
		status = StatusFail
	}
	return Result{
		Category:   category,
		Name:       name,
		Status:     status,
		ExitCode:   exit,
		DurationMs: dur,
		StdoutTail: out,
		StderrTail: errOut,
		Command:    cmdLine,
	}
}

func tailBytes(b []byte, max int) string {
	if len(b) <= max {
		return string(b)
	}
	return "... [truncated] ...\n" + string(b[len(b)-max:])
}
```

- [ ] **Step 3.4: Verify tests pass**

Run: `cd tools/haggis-eval && go test ./internal/gate/...`
Expected: all four tests pass.

### Task 4: `rust` subcommand

**Files:**
- Create: `tools/haggis-eval/internal/cmd/rust.go`

- [ ] **Step 4.1: Implement the subcommand**

Create `tools/haggis-eval/internal/cmd/rust.go`:
```go
// Package cmd implements the haggis-eval subcommand wirings.
package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Rust runs the cargo gate set in sequence: fmt --check, clippy
// -D warnings, test --workspace. Returns the aggregate slice.
func Rust() []gate.Result {
	return []gate.Result{
		gate.Run("rust", "cargo-fmt", "cargo", "fmt", "--all", "--", "--check"),
		gate.Run("rust", "cargo-clippy", "cargo", "clippy", "--workspace", "--all-targets", "--", "-D", "warnings"),
		gate.Run("rust", "cargo-test", "cargo", "test", "--workspace"),
	}
}
```

- [ ] **Step 4.2: Wire into `main.go`**

In `tools/haggis-eval/main.go`, before the `case "version"`, add:
```go
	case "rust":
		results := cmd.Rust()
		os.Exit(printAndExit("rust", results))
```
Add the import: `"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/cmd"`. Below `main`, add the helper:
```go
func printAndExit(category string, results []gate.Result) int {
	exit := 0
	for _, r := range results {
		fmt.Printf("[%s] %-20s %s exit=%d %dms\n", r.Category, r.Name, r.Status, r.ExitCode, r.DurationMs)
		if r.Status != gate.StatusPass {
			exit = 1
			if len(r.StderrTail) > 0 {
				fmt.Fprintln(os.Stderr, r.StderrTail)
			}
		}
	}
	return exit
}
```
Add the gate import too: `"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"`.

- [ ] **Step 4.3: Run the rust gate end-to-end**

Run: `cd tools/haggis-eval && go build . && ./haggis-eval rust` (on Windows `./haggis-eval.exe`).
Expected: prints three lines (`cargo-fmt PASS`, `cargo-clippy PASS`, `cargo-test PASS`) with non-zero `*ms` durations; exits 0. This will take 30-60 seconds depending on the cargo cache.

If any gate fails, the stderr tail is printed. That's the expected UX.

### Task 5: `ts` subcommand

**Files:**
- Create: `tools/haggis-eval/internal/cmd/ts.go`

- [ ] **Step 5.1: Implement the subcommand**

Create `tools/haggis-eval/internal/cmd/ts.go`:
```go
package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Ts runs the pnpm gate set: tsc --noEmit, vitest run, build.
func Ts() []gate.Result {
	return []gate.Result{
		gate.Run("ts", "tsc-noemit", "pnpm", "exec", "tsc", "--noEmit"),
		gate.Run("ts", "vitest-run", "pnpm", "exec", "vitest", "run"),
		gate.Run("ts", "vite-build", "pnpm", "run", "build"),
	}
}
```

- [ ] **Step 5.2: Wire into `main.go`**

Add a new case in the `switch`:
```go
	case "ts":
		results := cmd.Ts()
		os.Exit(printAndExit("ts", results))
```

- [ ] **Step 5.3: Verify**

Run: `cd tools/haggis-eval && go build . && ./haggis-eval ts`
Expected: three PASS lines.

### Task 6: `differential` subcommand

**Files:**
- Create: `tools/haggis-eval/internal/cmd/differential.go`

- [ ] **Step 6.1: Implement**

Create `tools/haggis-eval/internal/cmd/differential.go`:
```go
package cmd

import (
	"fmt"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Differential dispatches the `differential rng` or `differential hash`
// subcommand. `which` selects: "rng" or "hash". Anything else returns a
// single ERROR result so the dispatcher can exit 2.
func Differential(which string) []gate.Result {
	switch which {
	case "rng":
		return []gate.Result{
			gate.Run("differential", "wat-rust-rng", "cargo", "test", "-p", "hub-hardlang", "--test", "differential_rng", "--", "--include-ignored"),
		}
	case "hash":
		return []gate.Result{
			gate.Run("differential", "c-rust-hash", "cargo", "test", "-p", "hub-hardlang", "--test", "differential_hash"),
		}
	default:
		return []gate.Result{{
			Category:   "differential",
			Name:       "unknown",
			Status:     gate.StatusError,
			ExitCode:   -1,
			DurationMs: 0,
			StderrTail: fmt.Sprintf("unknown differential target %q; expected 'rng' or 'hash'", which),
		}}
	}
}
```

- [ ] **Step 6.2: Wire into `main.go` (two-word subcommand)**

Replace the existing `switch os.Args[1]` with a richer dispatch that handles `differential <which>`:
```go
	switch os.Args[1] {
	case "version", "--version", "-V":
		fmt.Println(version)
	case "help", "--help", "-h":
		usage(os.Stdout)
	case "rust":
		os.Exit(printAndExit("rust", cmd.Rust()))
	case "ts":
		os.Exit(printAndExit("ts", cmd.Ts()))
	case "differential":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "differential requires a target: rng | hash")
			os.Exit(2)
		}
		os.Exit(printAndExit("differential", cmd.Differential(os.Args[2])))
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand: %s\n\n", os.Args[1])
		usage(os.Stderr)
		os.Exit(2)
	}
```

- [ ] **Step 6.3: Verify**

Run:
```
cd tools/haggis-eval
go build .
./haggis-eval differential hash
./haggis-eval differential rng
```
Expected: both print one PASS line. The rng one takes ~5s (the `--include-ignored` flag enables the 1M-draw spec gate).

---

## Phase 3 — Stub the not-yet-configured subcommands

The browser/perf/security/slice/determinism gates exist in the spec but their underlying tooling is not configured. Make them visible at the CLI surface so `haggis-eval --help` shows them, but have them exit with the standard `EX_CONFIG` code (78) and a one-line message pointing at where they'll be implemented.

### Task 7: Stub subcommand

**Files:**
- Create: `tools/haggis-eval/internal/cmd/stub.go`

- [ ] **Step 7.1: Implement**

Create `tools/haggis-eval/internal/cmd/stub.go`:
```go
package cmd

import (
	"fmt"
	"os"
)

// EX_CONFIG (sysexits.h) — "configuration error"; the gate exists in
// the spec but its prerequisites (Playwright, size-limit, public/_headers,
// etc) have not been wired yet.
const ExConfig = 78

// Stub prints a one-line "not configured" message and exits 78.
func Stub(name, blocker string) int {
	fmt.Fprintf(os.Stderr, "haggis-eval: %q is declared in spec §2.7 but not yet wired (%s)\n", name, blocker)
	return ExConfig
}
```

- [ ] **Step 7.2: Wire into `main.go`**

Add cases for the four stubs in the dispatch switch (alongside `rust`, `ts`, `differential`):
```go
	case "browser":
		os.Exit(cmd.Stub("browser", "Playwright config not yet present"))
	case "determinism":
		os.Exit(cmd.Stub("determinism", "Playwright capture pipeline not yet present"))
	case "perf":
		os.Exit(cmd.Stub("perf", "size-limit and Lighthouse configs not yet present"))
	case "security":
		os.Exit(cmd.Stub("security", "public/_headers spec not yet present"))
	case "slice":
		os.Exit(cmd.Stub("slice", "slices.toml gate-set config not yet present"))
```

- [ ] **Step 7.3: Verify**

Run:
```
cd tools/haggis-eval
go build .
./haggis-eval browser; echo $?
```
Expected: stderr line `haggis-eval: "browser" is declared in spec §2.7 but not yet wired (Playwright config not yet present)`, exit code 78. (On Windows PowerShell: `./haggis-eval.exe browser; $LASTEXITCODE` instead of `echo $?`.)

---

## Phase 4 — Signed JSON report + `all` subcommand

### Task 8: Report struct + signer

**Files:**
- Create: `tools/haggis-eval/internal/report/report.go`
- Create: `tools/haggis-eval/internal/report/report_test.go`

- [ ] **Step 8.1: Write the failing test**

Create `tools/haggis-eval/internal/report/report_test.go`:
```go
package report

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/fnv"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

func sampleResults() []gate.Result {
	return []gate.Result{
		{Category: "rust", Name: "cargo-test", Status: gate.StatusPass, ExitCode: 0, DurationMs: 1234, Command: "cargo test"},
		{Category: "ts", Name: "vitest", Status: gate.StatusPass, ExitCode: 0, DurationMs: 567, Command: "pnpm exec vitest run"},
	}
}

func TestBuildIncludesAllProvidedResults(t *testing.T) {
	r := Build("test-run", time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC), sampleResults())
	if r.Run != "test-run" {
		t.Errorf("Run = %q", r.Run)
	}
	if len(r.Gates) != 2 {
		t.Errorf("expected 2 gates, got %d", len(r.Gates))
	}
	if r.OverallStatus != gate.StatusPass {
		t.Errorf("OverallStatus = %s; want PASS", r.OverallStatus)
	}
}

func TestBuildOverallFailsIfAnyGateFails(t *testing.T) {
	results := sampleResults()
	results[1].Status = gate.StatusFail
	results[1].ExitCode = 1
	r := Build("test-run", time.Now(), results)
	if r.OverallStatus != gate.StatusFail {
		t.Errorf("OverallStatus = %s; want FAIL", r.OverallStatus)
	}
}

func TestSignatureIsFnv1aOfPayload(t *testing.T) {
	r := Build("test-run", time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC), sampleResults())
	body, err := json.Marshal(payload(r))
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	want := fnv.Fnv1a64(body)
	if r.Signature != want {
		t.Errorf("Signature = %#x; want %#x", r.Signature, want)
	}
}

func TestRoundTripsThroughJson(t *testing.T) {
	r := Build("test-run", time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC), sampleResults())
	bytes, err := json.Marshal(r)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var back Report
	if err := json.Unmarshal(bytes, &back); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if back.Signature != r.Signature {
		t.Errorf("signature differs after round-trip")
	}
	if back.OverallStatus != r.OverallStatus {
		t.Errorf("overall status differs after round-trip")
	}
}
```

- [ ] **Step 8.2: Run, expect compile failures**

Run: `cd tools/haggis-eval && go test ./internal/report/...`
Expected: undefined references to `Build`, `Report`, `payload`.

- [ ] **Step 8.3: Implement the report**

Create `tools/haggis-eval/internal/report/report.go`:
```go
// Package report builds the signed JSON report that `haggis-eval all`
// emits. The signature is the FNV-1a 64-bit digest of the report payload
// (every field except the signature itself) so tampering with the report
// after writing is detectable.
package report

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/fnv"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Report is the on-disk JSON shape.
type Report struct {
	Run           string        `json:"run"`            // identifier for this invocation
	GeneratedAt   time.Time     `json:"generated_at"`
	OverallStatus gate.Status   `json:"overall_status"`
	Gates         []gate.Result `json:"gates"`
	Signature     uint64        `json:"signature"`      // FNV-1a 64-bit of (Run, GeneratedAt, OverallStatus, Gates)
}

// payloadShape mirrors Report minus the Signature field so the signed
// bytes are deterministic regardless of struct evolution.
type payloadShape struct {
	Run           string        `json:"run"`
	GeneratedAt   time.Time     `json:"generated_at"`
	OverallStatus gate.Status   `json:"overall_status"`
	Gates         []gate.Result `json:"gates"`
}

// Build assembles a Report from a list of gate results and signs it.
func Build(run string, generatedAt time.Time, gates []gate.Result) Report {
	overall := gate.StatusPass
	for _, g := range gates {
		if g.Status != gate.StatusPass {
			overall = gate.StatusFail
			break
		}
	}
	r := Report{
		Run:           run,
		GeneratedAt:   generatedAt,
		OverallStatus: overall,
		Gates:         gates,
	}
	body, err := json.Marshal(payload(r))
	if err != nil {
		// json.Marshal of a fixed-shape struct never fails for these
		// types — panic surfaces a logic bug rather than masking it.
		panic(fmt.Sprintf("internal: report payload marshal failed: %v", err))
	}
	r.Signature = fnv.Fnv1a64(body)
	return r
}

// payload extracts the signable payload from a Report.
func payload(r Report) payloadShape {
	return payloadShape{
		Run:           r.Run,
		GeneratedAt:   r.GeneratedAt,
		OverallStatus: r.OverallStatus,
		Gates:         r.Gates,
	}
}

// Write writes the report as pretty-printed JSON to outDir/<run>-<utc>.json.
// Returns the absolute path written.
func (r Report) Write(outDir string) (string, error) {
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return "", fmt.Errorf("create %s: %w", outDir, err)
	}
	filename := fmt.Sprintf("%s-%s.json", r.Run, r.GeneratedAt.UTC().Format("20060102T150405Z"))
	path := filepath.Join(outDir, filename)
	bytes, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal report: %w", err)
	}
	if err := os.WriteFile(path, bytes, 0o644); err != nil {
		return "", fmt.Errorf("write %s: %w", path, err)
	}
	return path, nil
}
```

- [ ] **Step 8.4: Run, expect pass**

Run: `cd tools/haggis-eval && go test ./internal/report/...`
Expected: 4 tests pass.

### Task 9: `all` subcommand + report wiring

**Files:**
- Create: `tools/haggis-eval/internal/cmd/all.go`
- Modify: `tools/haggis-eval/main.go`

- [ ] **Step 9.1: Implement `cmd.All`**

Create `tools/haggis-eval/internal/cmd/all.go`:
```go
package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// All runs every wired gate sequentially and returns the aggregate.
// Stub subcommands are NOT included — they would always fail and would
// drown the meaningful results. They are surfaced separately via
// `haggis-eval browser`, etc.
func All() []gate.Result {
	out := []gate.Result{}
	out = append(out, Rust()...)
	out = append(out, Ts()...)
	out = append(out, Differential("hash")...)
	out = append(out, Differential("rng")...)
	return out
}
```

- [ ] **Step 9.2: Wire into `main.go`**

In the dispatch switch, add:
```go
	case "all":
		results := cmd.All()
		runId := fmt.Sprintf("all-%s", time.Now().UTC().Format("20060102T150405Z"))
		r := report.Build(runId, time.Now(), results)
		path, err := r.Write("target/haggis-eval")
		if err != nil {
			fmt.Fprintf(os.Stderr, "could not write report: %v\n", err)
			os.Exit(2)
		}
		exit := printAndExit("all", results)
		fmt.Printf("\nreport: %s (overall=%s signature=%#x)\n", path, r.OverallStatus, r.Signature)
		os.Exit(exit)
```

Add imports: `"time"` and `"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/report"`.

- [ ] **Step 9.3: Verify end-to-end**

Run:
```
cd tools/haggis-eval
go build .
./haggis-eval all
```
Expected: prints every gate's PASS line, writes `target/haggis-eval/all-<timestamp>.json`, prints the report path with the overall status and FNV-1a signature. Total runtime: 90-120 seconds on a clean cargo cache, much less when warm.

- [ ] **Step 9.4: Inspect the report**

```
ls target/haggis-eval/
cat target/haggis-eval/all-*.json | head -40
```
Expected: one JSON file. The top of the file shows the Run, GeneratedAt, OverallStatus, and the first few Gates. The Signature is at the bottom.

---

## Phase 5 — Documentation and final wiring

### Task 10: README + gitignore updates

**Files:**
- Create: `tools/haggis-eval/README.md`
- Modify: `.gitignore`
- Modify: `README.md` (workspace root)

- [ ] **Step 10.1: Create the CLI README**

Create `tools/haggis-eval/README.md`:
```markdown
# haggis-eval

Go orchestrator CLI that wraps the existing project gates and produces a
signed JSON report. Single binary, single source tree, standard library
only.

See [kernel design spec §2.7](../../docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md) for the design.

## Build

```
cd tools/haggis-eval
go build .
```

Produces `./haggis-eval` (or `./haggis-eval.exe` on Windows).

## Subcommands

| Subcommand                | What it runs                                                   |
|---------------------------|----------------------------------------------------------------|
| `rust`                    | `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test` |
| `ts`                      | `pnpm tsc --noEmit`, `pnpm vitest run`, `pnpm run build`      |
| `differential rng`        | `cargo test -p hub-hardlang --test differential_rng -- --include-ignored` |
| `differential hash`       | `cargo test -p hub-hardlang --test differential_hash`         |
| `all`                     | Every wired gate above, plus a signed JSON report             |
| `browser`                 | Stub — exit 78, awaits Playwright config                      |
| `determinism`             | Stub — exit 78, awaits Playwright capture pipeline            |
| `perf`                    | Stub — exit 78, awaits size-limit + Lighthouse configs        |
| `security`                | Stub — exit 78, awaits `public/_headers` spec                 |
| `slice <name>`            | Stub — exit 78, awaits `slices.toml`                          |

## Exit codes

- `0` — every gate passed.
- `1` — at least one gate failed.
- `2` — invocation error (unknown subcommand, missing argument).
- `78` (`EX_CONFIG`) — a stubbed subcommand was invoked; its prerequisites have not been wired yet.

## Reports

`haggis-eval all` writes `target/haggis-eval/<run-id>.json` containing every gate's structured result plus a `signature` field that is the FNV-1a 64-bit hash of the report payload (every field except the signature itself). Reproduce the signature by re-hashing the same payload — divergent signatures mean the report was edited after writing.

The Go FNV-1a implementation at `internal/fnv/` is a third hand-rolled implementation of the algorithm, tested against the same published reference vectors as `crates/hub-core/src/hash.rs` (Rust) and `c/fnv1a.c` (C). All three agree byte-for-byte.
```

- [ ] **Step 10.2: Update `.gitignore`**

Read `.gitignore` first. Then append:
```
# haggis-eval CLI build artifacts and reports
tools/haggis-eval/haggis-eval
tools/haggis-eval/haggis-eval.exe
target/haggis-eval/
```

- [ ] **Step 10.3: Update workspace `README.md`**

In `README.md` at workspace root, find the section "## Current executable gates" and append below the existing fenced gate list:
```markdown

A Go-built orchestrator CLI bundles every gate above into one command with a signed JSON report. See [`tools/haggis-eval/README.md`](tools/haggis-eval/README.md).
```

### Task 11: Final verification

- [ ] **Step 11.1: Run every gate including the new CLI**

Run from workspace root:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
cd tools/haggis-eval && go test ./... && go build . && ./haggis-eval all
```
PowerShell wasm32:
```
$env:RUSTFLAGS="-D warnings"; cargo check --workspace --target wasm32-unknown-unknown
```
All green. `haggis-eval all` succeeds; report written.

- [ ] **Step 11.2: Run gofmt + go vet**

```
cd tools/haggis-eval
gofmt -l .
go vet ./...
```
Expected: `gofmt -l` prints nothing; `go vet` exits 0.

- [ ] **Step 11.3: Commit the whole plan in one squash-friendly commit**

Run from workspace root:
```
git add tools/haggis-eval/ .gitignore README.md
git commit -m "feat(haggis-eval): add Go orchestrator CLI with rust/ts/differential gates and signed JSON report"
```

---

## Acceptance criteria

The plan is complete when:

1. `tools/haggis-eval/` exists with `go.mod`, hand-rolled subcommand dispatch in `main.go`, and the wired subcommands (`rust`, `ts`, `differential rng`, `differential hash`, `all`).
2. The four not-yet-configured subcommands (`browser`, `determinism`, `perf`, `security`, `slice`) exist as stubs that exit 78 with a clear "not yet wired" message.
3. `internal/fnv/` is a hand-rolled Go FNV-1a 64-bit hash; tests assert byte-equal agreement with the Rust and C reference vectors.
4. `internal/report/` builds a signed JSON report; the `Signature` field is the FNV-1a digest of the report payload, verifiable independently.
5. `haggis-eval all` runs to completion and writes `target/haggis-eval/all-<timestamp>.json`.
6. `cd tools/haggis-eval && go test ./...` passes all tests; `gofmt -l .` is silent; `go vet ./...` exits 0.
7. Every existing workspace gate continues to pass.
8. Workspace `README.md` points readers at `tools/haggis-eval/README.md`.

## Out of scope for this plan

- Wiring the four stub subcommands to real infrastructure (Playwright, size-limit, Lighthouse, public/_headers, slices.toml). Each lands in a future plan when its prerequisites are configured.
- Foundation document prune — plan 5.
