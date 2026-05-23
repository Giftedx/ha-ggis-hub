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
