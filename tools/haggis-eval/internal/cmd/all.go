package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// All runs every wired gate sequentially and returns the aggregate.
func All() []gate.Result {
	out := []gate.Result{}
	out = append(out, Rust()...)
	out = append(out, RustCov()...)
	out = append(out, Docs()...)
	out = append(out, Ts()...)
	out = append(out, Coverage()...)
	out = append(out, Security()...)
	out = append(out, Perf()...)
	out = append(out, Browser()...)
	out = append(out, MultiBrowser()...)
	out = append(out, Determinism()...)
	out = append(out, Visual("verify")...)
	out = append(out, A11y()...)
	out = append(out, Soak()...)
	out = append(out, SupplyChain()...)
	out = append(out, Differential("hash")...)
	out = append(out, Differential("rng")...)
	return out
}
