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
