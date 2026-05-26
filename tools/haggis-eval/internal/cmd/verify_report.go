package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/report"
)

// VerifyReport recomputes a report signature and fails if the payload changed.
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
			fmt.Sprintf("signature mismatch: report has %s, recomputed %s", r.Signature, expected),
		)
	}

	return verifyReportResult(gate.StatusPass, 0, start, command, fmt.Sprintf("signature OK: %s", r.Signature), "")
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
