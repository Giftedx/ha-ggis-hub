package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Coverage runs vitest with the v8 coverage provider and enforces the
// per-metric thresholds configured in vite.config.ts:
// lines ≥ 90%, statements ≥ 90%, functions ≥ 90%, branches ≥ 78%.
// Excludes src/main.ts (browser-only glue), src/generated/, and the
// wasm generated-loader shim.
func Coverage() []gate.Result {
	return []gate.Result{
		gate.Run("coverage", "vitest-coverage", "pnpm", "run", "coverage"),
	}
}
