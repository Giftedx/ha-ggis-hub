package cmd

import (
	"os"
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
