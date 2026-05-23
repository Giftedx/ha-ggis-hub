package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Browser runs the Playwright smoke suite via scripts/run-browser-
// smokes.mjs, which orchestrates `pnpm build` → `vite preview` →
// three smokes → preview teardown:
//   - smoke-door-launch.mjs  (keyboard interact: walk + Enter → launch)
//   - smoke-door-tap.mjs     (touch tap on door → launch)
//   - smoke-pointer-drive.mjs (touch drag walks the haggis)
// Shipped 2026-05-23 as the spec entry unstubs.
func Browser() []gate.Result {
	return []gate.Result{
		gate.Run("browser", "smokes-all",
			"node", "scripts/run-browser-smokes.mjs"),
	}
}
