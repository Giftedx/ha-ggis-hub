package cmd

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

func TestLoadSlices_validConfig(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "slices.json")
	mustWrite(t, path, `{
  "schema": 1,
  "slices": {
    "fast": {
      "description": "fast",
      "gates": ["ts", "perf"]
    }
  }
}`)
	cfg, err := LoadSlices(path)
	if err != nil {
		t.Fatalf("LoadSlices: %v", err)
	}
	if cfg.Schema != 1 {
		t.Errorf("schema = %d, want 1", cfg.Schema)
	}
	bundle, ok := cfg.Slices["fast"]
	if !ok {
		t.Fatalf("slice 'fast' missing")
	}
	if got, want := bundle.Gates, []string{"ts", "perf"}; !equalSlices(got, want) {
		t.Errorf("gates = %v, want %v", got, want)
	}
}

func TestLoadSlices_missingFile(t *testing.T) {
	_, err := LoadSlices(filepath.Join(t.TempDir(), "does-not-exist.json"))
	if err == nil {
		t.Fatal("expected error for missing file")
	}
}

func TestLoadSlices_badSchema(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "slices.json")
	mustWrite(t, path, `{"schema": 999, "slices": {"x": {"gates":["a"]}}}`)
	_, err := LoadSlices(path)
	if err == nil || !strings.Contains(err.Error(), "schema") {
		t.Fatalf("expected schema error, got: %v", err)
	}
}

func TestLoadSlices_noSlices(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "slices.json")
	mustWrite(t, path, `{"schema": 1, "slices": {}}`)
	_, err := LoadSlices(path)
	if err == nil || !strings.Contains(err.Error(), "no slices") {
		t.Fatalf("expected no-slices error, got: %v", err)
	}
}

func TestSlice_unknownName(t *testing.T) {
	cfg := SlicesConfig{
		Schema: 1,
		Slices: map[string]SliceBundle{
			"fast": {Gates: []string{"ts"}},
		},
	}
	results := Slice(cfg, fakeRegistry(), "nonexistent")
	if len(results) != 1 {
		t.Fatalf("got %d results, want 1", len(results))
	}
	if results[0].Status != gate.StatusError {
		t.Errorf("status = %v, want ERROR", results[0].Status)
	}
	if !strings.Contains(results[0].StderrTail, "unknown slice") {
		t.Errorf("stderr missing 'unknown slice': %q", results[0].StderrTail)
	}
}

func TestSlice_unknownGateInBundle(t *testing.T) {
	cfg := SlicesConfig{
		Schema: 1,
		Slices: map[string]SliceBundle{
			"bad": {Gates: []string{"fake-gate"}},
		},
	}
	results := Slice(cfg, fakeRegistry(), "bad")
	if len(results) != 1 {
		t.Fatalf("got %d results, want 1", len(results))
	}
	if results[0].Status != gate.StatusError {
		t.Errorf("status = %v, want ERROR", results[0].Status)
	}
	if !strings.Contains(results[0].StderrTail, "unknown gate") {
		t.Errorf("stderr missing 'unknown gate': %q", results[0].StderrTail)
	}
}

func TestSlice_dispatchesInOrder(t *testing.T) {
	cfg := SlicesConfig{
		Schema: 1,
		Slices: map[string]SliceBundle{
			"two": {Gates: []string{"alpha", "beta"}},
		},
	}
	results := Slice(cfg, fakeRegistry(), "two")
	if len(results) != 2 {
		t.Fatalf("got %d results, want 2", len(results))
	}
	if results[0].Name != "alpha" || results[1].Name != "beta" {
		t.Errorf("order = %s,%s; want alpha,beta", results[0].Name, results[1].Name)
	}
}

func TestSlice_emptyGates(t *testing.T) {
	cfg := SlicesConfig{
		Schema: 1,
		Slices: map[string]SliceBundle{
			"empty": {Gates: []string{}},
		},
	}
	results := Slice(cfg, fakeRegistry(), "empty")
	if len(results) != 1 || results[0].Status != gate.StatusError {
		t.Fatalf("expected 1 ERROR for empty slice, got %+v", results)
	}
}

func TestRegistry_containsAllSlicesProjectGates(t *testing.T) {
	// Guards against silent drift: every gate id referenced by the
	// shipped slices.json (loaded via the real cwd-relative path
	// during `slice` dispatch) must be present in Registry(). This
	// test runs against fixed names so it doesn't need the file.
	reg := Registry()
	for _, want := range []string{
		"rust", "rust-cov", "docs", "ts", "coverage", "security", "perf",
		"browser", "multi-browser", "determinism", "visual",
		"a11y", "soak", "supply-chain", "production",
		"differential-hash", "differential-rng",
	} {
		if _, ok := reg[want]; !ok {
			t.Errorf("Registry() missing %q — slices that reference it will fail dispatch", want)
		}
	}
}

func TestListSlices_outputIsAlphabetical(t *testing.T) {
	cfg := SlicesConfig{
		Schema: 1,
		Slices: map[string]SliceBundle{
			"zebra": {Description: "last gate-set", Gates: []string{"ts"}},
			"alpha": {Description: "first gate-set", Gates: []string{"perf"}},
		},
	}
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("os.Pipe: %v", err)
	}
	ListSlices(cfg, w)
	w.Close()
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Fatalf("read pipe: %v", err)
	}
	out := buf.String()
	iAlpha := strings.Index(out, "alpha")
	iZebra := strings.Index(out, "zebra")
	if iAlpha < 0 || iZebra < 0 {
		t.Fatalf("expected both slice names in output, got:\n%s", out)
	}
	if iAlpha > iZebra {
		t.Errorf("expected alpha before zebra in output:\n%s", out)
	}
	if !strings.Contains(out, "available slices:") {
		t.Errorf("expected header 'available slices:' in output:\n%s", out)
	}
}

// fakeRegistry returns a registry where each gate id resolves to a
// runner that records its own name. Lets us assert dispatch order
// without shelling out.
func fakeRegistry() map[string]GateRunner {
	make := func(name string) GateRunner {
		return func() []gate.Result {
			return []gate.Result{{Category: "fake", Name: name, Status: gate.StatusPass}}
		}
	}
	return map[string]GateRunner{
		"alpha": make("alpha"),
		"beta":  make("beta"),
		"ts":    make("ts"),
	}
}

func mustWrite(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func equalSlices(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
