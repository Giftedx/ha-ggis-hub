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
