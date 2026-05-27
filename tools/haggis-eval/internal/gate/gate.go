// Package gate provides the shell-out primitive that subcommands use to
// run external tools and capture pass/fail with rich metadata.
package gate

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
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

// DefaultTimeout is the per-gate wall-clock budget when callers do not
// pick one explicitly. Big enough for rust workspace tests + ts vitest
// + a vite build, small enough that a hung browser smoke or a stalled
// preview server gets killed instead of consuming the whole CI runner.
const DefaultTimeout = 10 * time.Minute

// Run executes the command with the default timeout and captures its
// outcome.  Stdout and stderr are streamed live to the parent process
// (so `haggis-eval all` shows progress in CI logs) *and* tailed into
// the Result for the signed report.
//
// `category` and `name` are recorded in the result for grouping; `bin`
// and `args` are passed straight to exec.CommandContext.
func Run(category, name, bin string, args ...string) Result {
	return runImpl(DefaultTimeout, nil, category, name, bin, args...)
}

// RunWithTimeout is Run with an explicit budget. Use for categories
// known to legitimately take longer than DefaultTimeout — e.g. the
// differential proptest fuzz at --include-ignored.
func RunWithTimeout(timeout time.Duration, category, name, bin string, args ...string) Result {
	return runImpl(timeout, nil, category, name, bin, args...)
}

// RunWithEnv is Run with extra environment variables merged on top of the
// current process environment. Use for gates that need a specific env key
// set (e.g. PLAYWRIGHT_BROWSER=firefox) without forking a shell.
func RunWithEnv(category, name string, extraEnv map[string]string, bin string, args ...string) Result {
	return runImpl(DefaultTimeout, extraEnv, category, name, bin, args...)
}

func runImpl(timeout time.Duration, extraEnv map[string]string, category, name, bin string, args ...string) Result {
	cmdLine := bin
	if len(args) > 0 {
		cmdLine = bin + " " + strings.Join(args, " ")
	}
	fmt.Fprintf(os.Stdout, "[gate] %s/%s start: %s\n", category, name, cmdLine)
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, bin, args...)
	if len(extraEnv) > 0 {
		env := os.Environ()
		for k, v := range extraEnv {
			env = append(env, k+"="+v)
		}
		cmd.Env = env
	}
	var stdout, stderr bytes.Buffer
	cmd.Stdout = io.MultiWriter(os.Stdout, &stdout)
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderr)

	start := time.Now()
	runErr := cmd.Run()
	dur := time.Since(start)

	out := tailBytes(stdout.Bytes(), stdoutTailBytes)
	errOut := tailBytes(stderr.Bytes(), stdoutTailBytes)

	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		fmt.Fprintf(os.Stdout, "[gate] %s/%s TIMEOUT after %s (budget %s)\n", category, name, dur.Round(time.Millisecond), timeout)
		return Result{
			Category:   category,
			Name:       name,
			Status:     StatusError,
			ExitCode:   -1,
			DurationMs: dur.Milliseconds(),
			StdoutTail: out,
			StderrTail: fmt.Sprintf("gate timed out after %s\n%s", timeout, errOut),
			Command:    cmdLine,
		}
	}

	var execErr *exec.Error
	if errors.As(runErr, &execErr) {
		fmt.Fprintf(os.Stdout, "[gate] %s/%s ERROR: %v\n", category, name, runErr)
		return Result{
			Category:   category,
			Name:       name,
			Status:     StatusError,
			ExitCode:   -1,
			DurationMs: dur.Milliseconds(),
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
	fmt.Fprintf(os.Stdout, "[gate] %s/%s %s exit=%d (%s)\n", category, name, status, exit, dur.Round(time.Millisecond))
	return Result{
		Category:   category,
		Name:       name,
		Status:     status,
		ExitCode:   exit,
		DurationMs: dur.Milliseconds(),
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
