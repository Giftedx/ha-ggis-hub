package cmd

import (
	"fmt"
	"time"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Differential dispatches the `differential rng` or `differential hash`
// subcommand. `which` selects: "rng" or "hash". Anything else returns a
// single ERROR result so the dispatcher can exit 2.
//
// The rng variant uses `--include-ignored` to pull in the heavy 100k-
// case proptest fuzz; that legitimately exceeds gate.DefaultTimeout so
// it gets a 20-minute budget.
func Differential(which string) []gate.Result {
	switch which {
	case "rng":
		return []gate.Result{
			gate.RunWithTimeout(20*time.Minute, "differential", "wat-rust-rng", "cargo", "test", "-p", "hub-hardlang", "--test", "differential_rng", "--", "--include-ignored"),
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
