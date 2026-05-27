package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// SupplyChain runs cargo deny check, cargo machete, gitleaks, and osv-scanner.
// cargo deny: license compliance (MIT/Apache-2.0/BSD/ISC/Zlib/Unicode-3.0 allowlist),
// RustSec advisory database, duplicate version detection, and source restrictions.
// cargo machete: unused dependency detection across the workspace.
// gitleaks: git history scan for accidentally committed secrets.
// osv-scanner: cross-ecosystem vulnerability scan (Cargo.lock + pnpm-lock.yaml + go.mod).
// Exceptions are documented in osv-scanner.toml.
func SupplyChain() []gate.Result {
	return []gate.Result{
		gate.Run("supply-chain", "cargo-deny", "cargo", "deny", "check"),
		gate.Run("supply-chain", "cargo-machete", "cargo", "machete"),
		gate.Run("supply-chain", "gitleaks", "gitleaks", "detect", "--source", ".", "--no-banner"),
		gate.Run("supply-chain", "osv-scanner", "osv-scanner", "--recursive", "."),
	}
}
