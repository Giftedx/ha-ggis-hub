// Package gate provides the shell-out primitive that subcommands use to
// run external tools and capture pass/fail with rich metadata.
package gate

import (
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// Status of a single gate run.
type Status string

const (
	StatusPass  Status = "PASS"
	StatusFail  Status = "FAIL"
	StatusError Status = "ERROR" // could not invoke the tool at all
)

// Result is the structured outcome of one gate.
type Result struct {
	Category   string `json:"category"` // e.g. "rust", "ts", "differential"
	Name       string `json:"name"`     // e.g. "cargo-fmt", "vitest", "wat-rng"
	Status     Status `json:"status"`
	ExitCode   int    `json:"exit_code"`
	DurationMs int64  `json:"duration_ms"`
	StdoutTail string `json:"stdout_tail"` // last N bytes
	StderrTail string `json:"stderr_tail"`
	Command    string `json:"command"` // the actual command line invoked
}

// stdoutTailBytes is the cap on captured stdout per gate. Plenty for the
// last test result lines without bloating the report.
const stdoutTailBytes = 8 * 1024

// Run executes the command and captures its outcome.
//
// `category` and `name` are recorded in the result for grouping; `bin`
// and `args` are passed straight to exec.Command.
func Run(category, name, bin string, args ...string) Result {
	cmdLine := bin
	if len(args) > 0 {
		cmdLine = bin + " " + strings.Join(args, " ")
	}
	cmd := exec.Command(bin, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	start := time.Now()
	runErr := cmd.Run()
	dur := time.Since(start).Milliseconds()

	out := tailBytes(stdout.Bytes(), stdoutTailBytes)
	errOut := tailBytes(stderr.Bytes(), stdoutTailBytes)

	var execErr *exec.Error
	if errors.As(runErr, &execErr) {
		return Result{
			Category:   category,
			Name:       name,
			Status:     StatusError,
			ExitCode:   -1,
			DurationMs: dur,
			StdoutTail: out,
			StderrTail: fmt.Sprintf("could not execute %q: %v", bin, runErr),
			Command:    cmdLine,
		}
	}
	exit := cmd.ProcessState.ExitCode()
	status := StatusPass
	if exit != 0 {
		status = StatusFail
	}
	return Result{
		Category:   category,
		Name:       name,
		Status:     status,
		ExitCode:   exit,
		DurationMs: dur,
		StdoutTail: out,
		StderrTail: errOut,
		Command:    cmdLine,
	}
}

func tailBytes(b []byte, max int) string {
	if len(b) <= max {
		return string(b)
	}
	return "... [truncated] ...\n" + string(b[len(b)-max:])
}
