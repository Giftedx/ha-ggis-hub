package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Browser runs the Playwright smoke suite via scripts/run-browser-
// smokes.mjs, which orchestrates `pnpm build` → `vite preview` →
// six smokes → preview teardown:
//   - smoke-door-launch.mjs     (keyboard interact: walk + Enter → launch)
//   - smoke-door-tap.mjs        (touch tap on door → launch)
//   - smoke-pointer-drive.mjs   (touch drag walks the haggis)
//   - smoke-music-toggle.mjs    (opt-in music: no preload, starts on click)
//   - smoke-reduced-motion.mjs  (prefers-reduced-motion: reduce → status text)
//   - smoke-a11y.mjs            (26 WCAG 2.2 AA spot-checks, chromium only)
//
// Shipped 2026-05-23; music-toggle added 2026-05-27; reduced-motion added 2026-05-27.
func Browser() []gate.Result {
	return []gate.Result{
		gate.Run("browser", "smokes-all",
			"node", "scripts/run-browser-smokes.mjs"),
	}
}
