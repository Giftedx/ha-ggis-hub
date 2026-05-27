package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// RustCov runs cargo llvm-cov across the workspace (excluding hub-wasm) and
// enforces 100% line coverage and 100% function coverage. Requires
// cargo-llvm-cov and the llvm-tools-preview rustup component.
func RustCov() []gate.Result {
	return []gate.Result{
		gate.Run("rust-cov", "cargo-llvm-cov",
			"cargo", "llvm-cov",
			"--workspace", "--exclude", "hub-wasm",
			"--fail-under-lines", "100",
			"--fail-under-functions", "100",
		),
	}
}
