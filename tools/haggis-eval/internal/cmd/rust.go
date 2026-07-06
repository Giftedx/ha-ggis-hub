// Package cmd implements the haggis-eval subcommand wirings.
package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Rust runs the cargo gate set in sequence: fmt --check, clippy
// -D warnings, and test across the whole workspace. hub-wasm is
// included: its boundary modules (handle, snapshot_view, room_def)
// are ordinary Rust carrying native #[cfg(test)] suites, so the WASM
// boundary is gated here directly rather than only indirectly through
// the TS host. Returns the aggregate slice.
func Rust() []gate.Result {
	return []gate.Result{
		gate.Run("rust", "cargo-fmt", "cargo", "fmt", "--all", "--", "--check"),
		gate.Run("rust", "cargo-clippy", "cargo", "clippy", "--workspace", "--all-targets", "--", "-D", "warnings"),
		gate.Run("rust", "cargo-test", "cargo", "test", "--workspace"),
	}
}
