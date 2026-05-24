package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Soak runs the memory-growth soak via scripts/run-soak-gate.mjs, which
// orchestrates `pnpm build` → `vite preview` → `node scripts/smoke-soak.mjs`
// → preview teardown. The smoke loads the hub on a fixed seed, forces GC
// before and after a 15-second soak, then asserts heap growth < 5 MB.
// Catches leaks in the RAF loop, renderer closures, input sampler, or any
// per-frame allocation that GC cannot recover.
func Soak() []gate.Result {
	return []gate.Result{
		gate.Run("soak", "heap-growth-15s",
			"node", "scripts/run-soak-gate.mjs"),
	}
}
