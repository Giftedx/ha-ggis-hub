package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Perf runs the bundle-size budget gate. Builds dist/, then runs
// scripts/perf-budgets.mjs which reads perf-budgets.json and asserts
// each asset stem stays within its byte limit (plus an overall total
// cap). Catches regressions like a dependency import or accidental
// asset-inclusion silently doubling the bundle.
//
// Shipped 2026-05-23 as the slice 9 spec entry partial-unstub. The
// Lighthouse half (paint timing, render-blocking resources) remains
// outstanding — needs chrome-headless + lighthouse npm dep. Bundle
// sizes are the highest-impact-per-effort signal in the meantime.
func Perf() []gate.Result {
	return []gate.Result{
		gate.Run("perf", "build", "pnpm", "run", "build"),
		gate.Run("perf", "bundle-budgets", "node", "scripts/perf-budgets.mjs"),
	}
}
