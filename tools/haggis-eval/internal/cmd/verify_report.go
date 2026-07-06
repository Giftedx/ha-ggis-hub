package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/report"
)

// VerifyReport checks a haggis-eval JSON report's integrity. It fails if the
// stored signature no longer matches the signable payload (byte-level tamper),
// AND if the report's overall_status does not match the status derived from its
// own gate results. The latter check is independent of the signature: FNV-1a is
// non-cryptographic, so a forger (or an internal bug) can flip overall_status to
// PASS and recompute a consistent signature — re-deriving from the gates catches
// the lie regardless. An empty gate set is likewise not a pass.
func VerifyReport(path string) gate.Result {
	start := time.Now()
	command := fmt.Sprintf("haggis-eval verify-report %s", path)
	bytes, err := os.ReadFile(path)
	if err != nil {
		return verifyReportResult(gate.StatusError, -1, start, command, "", fmt.Sprintf("read report: %v", err))
	}

	var r report.Report
	if err := json.Unmarshal(bytes, &r); err != nil {
		return verifyReportResult(gate.StatusError, -1, start, command, "", fmt.Sprintf("parse report: %v", err))
	}

	expected, err := report.ExpectedSignature(r)
	if err != nil {
		return verifyReportResult(gate.StatusError, -1, start, command, "", fmt.Sprintf("recompute signature: %v", err))
	}
	if r.Signature != expected {
		return verifyReportResult(
			gate.StatusFail,
			1,
			start,
			command,
			"",
			fmt.Sprintf("signature mismatch: report has %#x, recomputed %#x", r.Signature, expected),
		)
	}

	if derived := report.DeriveOverall(r.Gates); r.OverallStatus != derived {
		return verifyReportResult(
			gate.StatusFail,
			1,
			start,
			command,
			"",
			fmt.Sprintf("overall_status mismatch: report claims %s, gates derive %s", r.OverallStatus, derived),
		)
	}

	return verifyReportResult(gate.StatusPass, 0, start, command, fmt.Sprintf("signature OK: %#x; overall_status %s consistent with gates", r.Signature, r.OverallStatus), "")
}

func verifyReportResult(
	status gate.Status,
	exitCode int,
	start time.Time,
	command string,
	stdout string,
	stderr string,
) gate.Result {
	return gate.Result{
		Category:   "report",
		Name:       "verify-report",
		Status:     status,
		ExitCode:   exitCode,
		DurationMs: time.Since(start).Milliseconds(),
		StdoutTail: stdout,
		StderrTail: stderr,
		Command:    command,
	}
}
