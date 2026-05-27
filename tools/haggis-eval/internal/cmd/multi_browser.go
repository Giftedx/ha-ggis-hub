package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// MultiBrowser runs the 5 core browser smokes (door-launch, door-tap,
// pointer-drive, music-toggle, reduced-motion) against Firefox and WebKit. The a11y smoke is
// excluded: its 26 WCAG spot-checks use computed CSS and keyboard-focus
// behaviour that is intentionally chromium-specific (WebKit tab-focus for
// anchors is OS-dependent on macOS/Windows). Requires playwright install
// firefox webkit.
func MultiBrowser() []gate.Result {
	browsers := []string{"firefox", "webkit"}
	out := make([]gate.Result, 0, len(browsers))
	for _, b := range browsers {
		out = append(out, gate.RunWithEnv(
			"multi-browser", b,
			map[string]string{"PLAYWRIGHT_BROWSER": b},
			"node", "scripts/run-browser-smokes.mjs",
		))
	}
	return out
}
