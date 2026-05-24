package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Visual runs the visual gate via scripts/run-visual-gate.mjs which
// orchestrates `pnpm build` → `vite preview` → smoke-visual-gate.mjs
// → preview teardown. The gate computes a perceptual aHash (16x16
// grayscale → 256-bit hash) of each scene at a deterministic seed and
// compares against the recorded golden in tests/golden/. Drift beyond
// the per-scene Hamming tolerance fails the gate.
//
// Argument:
//   mode = "verify" (default) | "capture"
//
// Capture is a deliberate human act — it overwrites the recorded
// golden hash and PNG with the current scene state. Use only after
// reviewing the captured PNG by eye. Verify is the CI mode and is
// what All() runs.
func Visual(mode string) []gate.Result {
	if mode == "" {
		mode = "verify"
	}
	return []gate.Result{
		gate.Run("visual", mode,
			"node", "scripts/run-visual-gate.mjs", mode),
	}
}
