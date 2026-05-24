package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// SlicesConfig is the on-disk schema for slices.json. The Slices map
// is keyed by slice name; the value is the bundle definition.
type SlicesConfig struct {
	Schema int                    `json:"schema"`
	Slices map[string]SliceBundle `json:"slices"`
}

// SliceBundle is one named gate-set: a human description plus the
// ordered list of gate IDs (matching Registry() keys) to run.
type SliceBundle struct {
	Description string   `json:"description"`
	Gates       []string `json:"gates"`
}

// LoadSlices reads and parses the slices.json config from `path`. The
// caller chooses the path so tests can point at fixtures.
func LoadSlices(path string) (SlicesConfig, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return SlicesConfig{}, fmt.Errorf("read %s: %w", path, err)
	}
	var cfg SlicesConfig
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return SlicesConfig{}, fmt.Errorf("parse %s: %w", path, err)
	}
	if cfg.Schema != 1 {
		return SlicesConfig{}, fmt.Errorf("%s: unsupported schema=%d (want 1)", path, cfg.Schema)
	}
	if len(cfg.Slices) == 0 {
		return SlicesConfig{}, fmt.Errorf("%s: no slices declared", path)
	}
	return cfg, nil
}

// Slice runs the named bundle from `cfg` against the gate `registry`,
// returning the aggregated results in the order the bundle declared
// them. Unknown slice name OR unknown gate ID inside a slice each
// produce a single ERROR result so the caller's PASS/FAIL handling
// stays the same as for any other subcommand.
func Slice(cfg SlicesConfig, registry map[string]GateRunner, name string) []gate.Result {
	bundle, ok := cfg.Slices[name]
	if !ok {
		return []gate.Result{errorResult("slice", name, fmt.Sprintf("unknown slice %q; known: %s", name, knownSliceNames(cfg)))}
	}
	if len(bundle.Gates) == 0 {
		return []gate.Result{errorResult("slice", name, fmt.Sprintf("slice %q has no gates declared", name))}
	}
	out := make([]gate.Result, 0, len(bundle.Gates))
	for _, gateID := range bundle.Gates {
		runner, ok := registry[gateID]
		if !ok {
			out = append(out, errorResult("slice", gateID, fmt.Sprintf("slice %q references unknown gate %q; known: %s", name, gateID, knownGateIDs(registry))))
			continue
		}
		out = append(out, runner()...)
	}
	return out
}

// ListSlices prints the bundles a user can pick from. Used by `slice`
// with no name and by `slice list`.
func ListSlices(cfg SlicesConfig, w *os.File) {
	names := make([]string, 0, len(cfg.Slices))
	for n := range cfg.Slices {
		names = append(names, n)
	}
	sort.Strings(names)
	fmt.Fprintln(w, "available slices:")
	for _, n := range names {
		b := cfg.Slices[n]
		fmt.Fprintf(w, "  %-12s %s\n", n, b.Description)
		fmt.Fprintf(w, "  %-12s gates: %v\n", "", b.Gates)
	}
}

func errorResult(category, name, msg string) gate.Result {
	return gate.Result{
		Category:   category,
		Name:       name,
		Status:     gate.StatusError,
		ExitCode:   -1,
		DurationMs: 0,
		StderrTail: msg,
		Command:    "(slice dispatcher)",
	}
}

func knownSliceNames(cfg SlicesConfig) string {
	names := make([]string, 0, len(cfg.Slices))
	for n := range cfg.Slices {
		names = append(names, n)
	}
	sort.Strings(names)
	return fmt.Sprintf("%v", names)
}

func knownGateIDs(registry map[string]GateRunner) string {
	ids := make([]string, 0, len(registry))
	for id := range registry {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return fmt.Sprintf("%v", ids)
}
