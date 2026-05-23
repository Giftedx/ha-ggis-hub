package gate

import (
	"os"
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

func TestRunWithTimeoutKillsHungCommand(t *testing.T) {
	// Use the Go toolchain itself as a portable hang: `go test -run '^$'
	// -timeout 30s ./...` exits cleanly fast on a non-go directory, so
	// instead drive a shorter timeout against `go env -json` which is
	// guaranteed-fast — we're asserting the success path of
	// RunWithTimeout (a non-trivial budget shouldn't false-trip).
	r := RunWithTimeout(10*time.Second, "timeout", "fast-success",
		"go", "env", "GOOS")
	if r.Status != StatusPass {
		t.Errorf("expected PASS within budget, got %s; stderr=%q", r.Status, r.StderrTail)
	}
	if !strings.Contains(r.StdoutTail, runtime.GOOS) {
		t.Errorf("stdout missing GOOS %q: %q", runtime.GOOS, r.StdoutTail)
	}
}

// TestRunWithTimeoutFiresOnHang uses a tiny self-rebuilt fixture binary
// that sleeps longer than the timeout. We rely on `go run` with stdin
// piped from a heredoc-like string, which compiles + runs the program
// in a child process. The context cancel must reach the child.
func TestRunWithTimeoutFiresOnHang(t *testing.T) {
	// Write the fixture program to a temp dir and `go run` it.
	tmp := t.TempDir()
	src := tmp + "/sleeper.go"
	const program = "package main\nimport \"time\"\nfunc main(){ time.Sleep(time.Hour) }\n"
	if err := os.WriteFile(src, []byte(program), 0o644); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	// 800ms budget — long enough to swallow `go run`'s ~1s compile
	// overhead on slow runners, short enough to keep the test fast.
	// On a cold cache `go run` itself may take >800ms; in that case
	// the timeout fires during compilation, which is also a valid
	// timeout assertion. Either way, status must be ERROR.
	r := RunWithTimeout(800*time.Millisecond, "timeout", "sleep-test",
		"go", "run", src)
	if r.Status != StatusError {
		t.Errorf("expected ERROR on hang, got %s; stderr=%q", r.Status, r.StderrTail)
	}
	if !strings.Contains(r.StderrTail, "timed out") {
		t.Errorf("expected stderr to mention 'timed out', got %q", r.StderrTail)
	}
}
