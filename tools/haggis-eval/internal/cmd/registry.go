package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// GateRunner is the signature every wired gate function ends up with —
// no arguments, returns the gate.Result slice for the category. The
// `differential` family takes a target string in its public function;
// we curry that here so the slice dispatcher can treat them like the
// rest.
type GateRunner func() []gate.Result

// Registry maps gate IDs as they appear in slices.json to the gate
// runner function. New wired gates must be added here AND under the
// matching subcommand switch in main.go — the two surfaces have
// separate use cases (CLI argv vs slice bundle membership). The two
// gates that take a parameter (`differential hash` / `differential
// rng`) appear as `differential-hash` / `differential-rng` here so the
// slices.json file can name a specific target.
func Registry() map[string]GateRunner {
	return map[string]GateRunner{
		"rust":              Rust,
		"rust-lint":         RustLint,
		"docs":              Docs,
		"ts":                Ts,
		"coverage":          Coverage,
		"security":          Security,
		"perf":              Perf,
		"browser":           Browser,
		"determinism":       Determinism,
		"visual":            func() []gate.Result { return Visual("verify") },
		"a11y":              A11y,
		"soak":              Soak,
		"supply-chain":      SupplyChain,
		"differential-hash": func() []gate.Result { return Differential("hash") },
		"differential-rng":  func() []gate.Result { return Differential("rng") },
	}
}
