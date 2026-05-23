package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// All runs every wired gate sequentially and returns the aggregate.
// Stub subcommands are NOT included — they would always fail and would
// drown the meaningful results. They are surfaced separately via
// `haggis-eval browser`, etc.
func All() []gate.Result {
	out := []gate.Result{}
	out = append(out, Rust()...)
	out = append(out, Ts()...)
	out = append(out, Differential("hash")...)
	out = append(out, Differential("rng")...)
	return out
}
