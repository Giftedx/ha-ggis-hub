package report

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/fnv"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

func sampleResults() []gate.Result {
	return []gate.Result{
		{Category: "rust", Name: "cargo-test", Status: gate.StatusPass, ExitCode: 0, DurationMs: 1234, Command: "cargo test"},
		{Category: "ts", Name: "vitest", Status: gate.StatusPass, ExitCode: 0, DurationMs: 567, Command: "pnpm exec vitest run"},
	}
}

func TestBuildIncludesAllProvidedResults(t *testing.T) {
	r := Build("test-run", time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC), sampleResults())
	if r.Run != "test-run" {
		t.Errorf("Run = %q", r.Run)
	}
	if len(r.Gates) != 2 {
		t.Errorf("expected 2 gates, got %d", len(r.Gates))
	}
	if r.OverallStatus != gate.StatusPass {
		t.Errorf("OverallStatus = %s; want PASS", r.OverallStatus)
	}
}

func TestBuildOverallFailsIfAnyGateFails(t *testing.T) {
	results := sampleResults()
	results[1].Status = gate.StatusFail
	results[1].ExitCode = 1
	r := Build("test-run", time.Now(), results)
	if r.OverallStatus != gate.StatusFail {
		t.Errorf("OverallStatus = %s; want FAIL", r.OverallStatus)
	}
}

func TestSignatureIsFnv1aOfPayload(t *testing.T) {
	r := Build("test-run", time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC), sampleResults())
	body, err := json.Marshal(payload(r))
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	want := fnv.Fnv1a64(body)
	if r.Signature != want {
		t.Errorf("Signature = %#x; want %#x", r.Signature, want)
	}
}

func TestRoundTripsThroughJson(t *testing.T) {
	r := Build("test-run", time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC), sampleResults())
	bytes, err := json.Marshal(r)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var back Report
	if err := json.Unmarshal(bytes, &back); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if back.Signature != r.Signature {
		t.Errorf("signature differs after round-trip")
	}
	if back.OverallStatus != r.OverallStatus {
		t.Errorf("overall status differs after round-trip")
	}
}

func TestBuildOverallFailsIfAnyGateErrors(t *testing.T) {
	results := sampleResults()
	results[0].Status = gate.StatusError
	results[0].ExitCode = -1
	r := Build("test-run", time.Now(), results)
	if r.OverallStatus != gate.StatusFail {
		t.Errorf("OverallStatus = %s; want FAIL when a gate has StatusError", r.OverallStatus)
	}
}

func TestWriteCreatesFileAtExpectedPath(t *testing.T) {
	dir := t.TempDir()
	ts := time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC)
	r := Build("all", ts, sampleResults())
	path, err := r.Write(dir)
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	wantName := "all-20260523T120000Z.json"
	if filepath.Base(path) != wantName {
		t.Errorf("filename = %q, want %q", filepath.Base(path), wantName)
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("file does not exist after Write: %v", err)
	}
}

func TestWriteSignatureRoundTrips(t *testing.T) {
	dir := t.TempDir()
	ts := time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC)
	r := Build("all", ts, sampleResults())
	path, err := r.Write(dir)
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	var back Report
	if err := json.Unmarshal(raw, &back); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if back.Signature != r.Signature {
		t.Errorf("signature after Write/ReadFile = %#x, want %#x", back.Signature, r.Signature)
	}
}

func TestWriteCreatesDirectoryIfMissing(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "output")
	r := Build("run", time.Now(), sampleResults())
	_, err := r.Write(dir)
	if err != nil {
		t.Fatalf("Write with missing dir hierarchy: %v", err)
	}
}
