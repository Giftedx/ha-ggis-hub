package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Determinism runs the same-seed-same-input determinism smoke via
// scripts/smoke-determinism.mjs. The script loads the hub twice with
// a fixed ?seed= URL param, applies an identical scripted input
// sequence, then asserts the final state-hash matches between runs.
// Validates the core promise that hub-core's sim is deterministic.
// Shipped 2026-05-23 alongside the seed-param + state-hash dev hooks.
func Determinism() []gate.Result {
	return []gate.Result{
		gate.Run("determinism", "browser-replay-hash",
			"node", "scripts/run-determinism-smoke.mjs"),
	}
}
