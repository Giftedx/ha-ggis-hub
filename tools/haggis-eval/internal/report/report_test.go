package report

import (
	"encoding/json"
	"strings"
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
	if r.Signature != FormatSignature(want) {
		t.Errorf("Signature = %s; want %s", r.Signature, FormatSignature(want))
	}
}

func TestSignatureSerializesAsHexString(t *testing.T) {
	r := Build("test-run", time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC), sampleResults())
	bytes, err := json.Marshal(r)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var raw map[string]any
	if err := json.Unmarshal(bytes, &raw); err != nil {
		t.Fatalf("unmarshal raw: %v", err)
	}
	signature, ok := raw["signature"].(string)
	if !ok {
		t.Fatalf("signature encoded as %T; want string", raw["signature"])
	}
	if !strings.HasPrefix(signature, "0x") || len(signature) != 18 {
		t.Fatalf("signature = %q; want 0x plus 16 lowercase hex digits", signature)
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
