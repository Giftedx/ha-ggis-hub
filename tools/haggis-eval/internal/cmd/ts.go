package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Ts runs the TypeScript host gate set: typecheck, lint, tests, build,
// and post-build artifact verification.
func Ts() []gate.Result {
	return []gate.Result{
		gate.Run("ts", "tsc-noemit", "pnpm", "exec", "tsc", "--noEmit"),
		gate.Run("ts", "eslint", "pnpm", "exec", "eslint", "src/", "vite.config.ts", "--max-warnings=0"),
		gate.Run("ts", "vitest-run", "pnpm", "exec", "vitest", "run"),
		gate.Run("ts", "vite-build", "pnpm", "run", "build"),
		gate.Run("ts", "verify-dist", "node", "scripts/verify-dist.mjs"),
	}
}
