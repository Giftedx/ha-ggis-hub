package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Production probes the live public deployment. It is intentionally opt-in:
// production can lag a branch under review, so this gate is not part of All().
func Production() []gate.Result {
	return []gate.Result{
		gate.Run("production", "live-site", "node", "scripts/check-production.mjs"),
	}
}
