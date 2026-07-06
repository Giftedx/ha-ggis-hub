package cmd

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/report"
)

func TestVerifyReportRejectsTamperedPayload(t *testing.T) {
	dir := t.TempDir()
	r := report.Build("all", time.Date(2026, 5, 26, 3, 19, 18, 0, time.UTC), []gate.Result{
		{
			Category:   "ts",
			Name:       "vitest-run",
			Status:     gate.StatusPass,
			ExitCode:   0,
			DurationMs: 1,
			Command:    "pnpm exec vitest run",
		},
	})
	path, err := r.Write(dir)
	if err != nil {
		t.Fatalf("write report: %v", err)
	}

	if result := VerifyReport(path); result.Status != gate.StatusPass {
		t.Fatalf("VerifyReport clean status = %s; want PASS; stderr=%q", result.Status, result.StderrTail)
	}

	bytes, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read report: %v", err)
	}
	tampered := strings.Replace(string(bytes), `"status": "PASS"`, `"status": "FAIL"`, 1)
	if err := os.WriteFile(path, []byte(tampered), 0o644); err != nil {
		t.Fatalf("write tampered report: %v", err)
	}

	result := VerifyReport(path)
	if result.Status != gate.StatusFail {
		t.Fatalf("VerifyReport tampered status = %s; want FAIL", result.Status)
	}
	if !strings.Contains(result.StderrTail, "signature mismatch") {
		t.Fatalf("tamper failure stderr = %q; want signature mismatch", result.StderrTail)
	}
}

// TestVerifyReportRejectsLyingOverallStatus covers a consistent forgery the
// signature check alone cannot catch: FNV-1a is non-cryptographic, so an editor
// can flip overall_status to PASS and recompute a matching signature. A report
// whose overall_status contradicts its own gate results is internally
// inconsistent — verify-report must reject it on the gates, independent of the
// (forgeable) signature.
func TestVerifyReportRejectsLyingOverallStatus(t *testing.T) {
	dir := t.TempDir()
	// Honest report: one failing gate => overall FAIL.
	r := report.Build("all", time.Date(2026, 5, 26, 3, 19, 18, 0, time.UTC), []gate.Result{
		{Category: "ts", Name: "vitest-run", Status: gate.StatusFail, ExitCode: 1, DurationMs: 1, Command: "pnpm exec vitest run"},
	})
	// Forge it to claim PASS, then RE-SIGN so the signature is self-consistent.
	r.OverallStatus = gate.StatusPass
	sig, err := report.ExpectedSignature(r)
	if err != nil {
		t.Fatalf("recompute signature: %v", err)
	}
	r.Signature = sig
	bytes, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		t.Fatalf("marshal forged report: %v", err)
	}
	path := filepath.Join(dir, "forged.json")
	if err := os.WriteFile(path, bytes, 0o644); err != nil {
		t.Fatalf("write forged report: %v", err)
	}

	result := VerifyReport(path)
	if result.Status != gate.StatusFail {
		t.Fatalf("VerifyReport lying overall_status = %s; want FAIL; stderr=%q", result.Status, result.StderrTail)
	}
	if strings.Contains(result.StderrTail, "signature mismatch") {
		t.Fatalf("rejection should be on overall_status, not signature; stderr=%q", result.StderrTail)
	}
	// Exact message pins that the rejection came from the new overall_status
	// check (claims PASS, gates derive FAIL) and not some unrelated failure.
	wantMsg := "overall_status mismatch: report claims PASS, gates derive FAIL"
	if result.StderrTail != wantMsg {
		t.Fatalf("rejection stderr = %q; want %q", result.StderrTail, wantMsg)
	}
}

// TestVerifyReportPassesHonestEmptyReport documents that verify-report checks
// internal CONSISTENCY, not gate outcome: a report honestly built from zero
// gates has overall_status ERROR, which equals DeriveOverall(empty), so the
// report is self-consistent and verify-report PASSES it. (The empty run's
// failure is signalled by that ERROR status and a non-zero `all` exit, not by
// verify-report.)
func TestVerifyReportPassesHonestEmptyReport(t *testing.T) {
	dir := t.TempDir()
	r := report.Build("all", time.Date(2026, 5, 26, 3, 19, 18, 0, time.UTC), nil)
	if r.OverallStatus != gate.StatusError {
		t.Fatalf("honest empty report OverallStatus = %s; want ERROR", r.OverallStatus)
	}
	path, err := r.Write(dir)
	if err != nil {
		t.Fatalf("write report: %v", err)
	}
	if result := VerifyReport(path); result.Status != gate.StatusPass {
		t.Fatalf("VerifyReport honest empty report = %s; want PASS; stderr=%q", result.Status, result.StderrTail)
	}
}
