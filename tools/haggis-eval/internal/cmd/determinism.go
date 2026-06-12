package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Determinism runs the browser determinism/replay smoke pair. The first
// smoke loads the hub twice with a fixed ?seed= URL param, applies an
// identical scripted input sequence, then asserts the final state-hash
// matches between runs. The second drives one exact-tick run, captures the
// browser-written `.haggislog`, replays it through WASM `replay_run`, and
// asserts the replay hash matches the live hash. Together they validate that
// hub-core is deterministic and that the host input log is replay-grade.
func Determinism() []gate.Result {
	return []gate.Result{
		gate.Run("determinism", "browser-replay-hash",
			"node", "scripts/run-determinism-smoke.mjs"),
	}
}
