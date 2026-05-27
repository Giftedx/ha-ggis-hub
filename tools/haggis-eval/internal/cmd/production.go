package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Production probes the public deployment and expected launch target.
func Production() []gate.Result {
	return []gate.Result{
		gate.Run("production", "live-site", "node", "scripts/check-production.mjs"),
	}
}
