package cmd

import "github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"

// Docs runs the current-surface documentation claim scanner.
func Docs() []gate.Result {
	return []gate.Result{
		gate.Run("docs", "claim-drift", "node", "scripts/check-doc-claims.mjs"),
	}
}
