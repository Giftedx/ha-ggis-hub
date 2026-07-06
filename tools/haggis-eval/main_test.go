package main

import (
	"testing"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// printAndExit is the single CLI chokepoint every subcommand funnels through;
// its return value becomes the process exit code. These tests pin that an
// empty result set is a FAILURE (a no-op category must not exit 0 and read as
// green in CI), while preserving the normal pass/fail mapping.
func TestPrintAndExitEmptyResultsIsFailure(t *testing.T) {
	for _, results := range [][]gate.Result{nil, {}} {
		if got := printAndExit("empty", results); got != 1 {
			t.Errorf("printAndExit(empty, len=%d) = %d; want 1 (no results is not a pass)", len(results), got)
		}
	}
}

func TestPrintAndExitAllPassIsZero(t *testing.T) {
	results := []gate.Result{
		{Category: "ts", Name: "vitest", Status: gate.StatusPass, ExitCode: 0},
		{Category: "rust", Name: "cargo-test", Status: gate.StatusPass, ExitCode: 0},
	}
	if got := printAndExit("ok", results); got != 0 {
		t.Errorf("printAndExit(all-pass) = %d; want 0", got)
	}
}

func TestPrintAndExitAnyNonPassIsOne(t *testing.T) {
	for _, bad := range []gate.Status{gate.StatusFail, gate.StatusError} {
		results := []gate.Result{
			{Category: "ts", Name: "vitest", Status: gate.StatusPass, ExitCode: 0},
			{Category: "rust", Name: "cargo-test", Status: bad, ExitCode: 1},
		}
		if got := printAndExit("mixed", results); got != 1 {
			t.Errorf("printAndExit with a %s gate = %d; want 1", bad, got)
		}
	}
}
