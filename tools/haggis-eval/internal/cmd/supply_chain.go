package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// SupplyChain runs cargo deny check against deny.toml.
// Checks: license compliance (MIT/Apache-2.0/BSD/ISC/Zlib/Unicode-3.0 allowlist),
// RustSec advisory database, duplicate version detection, and source restrictions.
func SupplyChain() []gate.Result {
	return []gate.Result{
		gate.Run("supply-chain", "cargo-deny", "cargo", "deny", "check"),
	}
}
