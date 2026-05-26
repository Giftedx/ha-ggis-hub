// Package main is the haggis-eval CLI entry point. See README.md.
package main

import (
	"fmt"
	"os"
	"time"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/cmd"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/report"
)

const version = "0.1.0"

func main() {
	if len(os.Args) < 2 {
		usage(os.Stderr)
		os.Exit(2)
	}
	switch os.Args[1] {
	case "version", "--version", "-V":
		fmt.Println(version)
	case "help", "--help", "-h":
		usage(os.Stdout)
	case "rust":
		os.Exit(printAndExit("rust", cmd.Rust()))
	case "rust-lint":
		os.Exit(printAndExit("rust-lint", cmd.RustLint()))
	case "ts":
		os.Exit(printAndExit("ts", cmd.Ts()))
	case "coverage":
		os.Exit(printAndExit("coverage", cmd.Coverage()))
	case "docs":
		os.Exit(printAndExit("docs", cmd.Docs()))
	case "differential":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "differential requires a target: rng | hash")
			os.Exit(2)
		}
		os.Exit(printAndExit("differential", cmd.Differential(os.Args[2])))
	case "browser":
		os.Exit(printAndExit("browser", cmd.Browser()))
	case "determinism":
		os.Exit(printAndExit("determinism", cmd.Determinism()))
	case "perf":
		os.Exit(printAndExit("perf", cmd.Perf()))
	case "security":
		os.Exit(printAndExit("security", cmd.Security()))
	case "visual":
		mode := "verify"
		if len(os.Args) >= 3 {
			mode = os.Args[2]
		}
		os.Exit(printAndExit("visual", cmd.Visual(mode)))
	case "a11y":
		os.Exit(printAndExit("a11y", cmd.A11y()))
	case "soak":
		os.Exit(printAndExit("soak", cmd.Soak()))
	case "supply-chain":
		os.Exit(printAndExit("supply-chain", cmd.SupplyChain()))
	case "verify-report":
		if len(os.Args) != 3 {
			fmt.Fprintln(os.Stderr, "usage: haggis-eval verify-report <report.json>")
			os.Exit(2)
		}
		os.Exit(printAndExit("verify-report", []gate.Result{cmd.VerifyReport(os.Args[2])}))
	case "slice":
		// Slices config lives next to this binary's source. Resolved
		// relative to repo root (the same cwd assumption as every
		// other script-path gate — see tools/haggis-eval/README.md
		// "Invocation cwd"). Override via HAGGIS_SLICES_PATH.
		cfgPath := os.Getenv("HAGGIS_SLICES_PATH")
		if cfgPath == "" {
			cfgPath = "tools/haggis-eval/slices.json"
		}
		cfg, err := cmd.LoadSlices(cfgPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "slice config: %v\n", err)
			os.Exit(2)
		}
		if len(os.Args) < 3 || os.Args[2] == "list" {
			cmd.ListSlices(cfg, os.Stdout)
			os.Exit(0)
		}
		os.Exit(printAndExit("slice", cmd.Slice(cfg, cmd.Registry(), os.Args[2])))
	case "all":
		results := cmd.All()
		now := time.Now()
		r := report.Build("all", now, results)
		path, err := r.Write("target/haggis-eval")
		if err != nil {
			fmt.Fprintf(os.Stderr, "could not write report: %v\n", err)
			os.Exit(2)
		}
		exit := printAndExit("all", results)
		fmt.Printf("\nreport: %s\n", path)
		fmt.Printf("overall=%s signature=%s\n", r.OverallStatus, r.Signature)
		os.Exit(exit)
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand: %s\n\n", os.Args[1])
		usage(os.Stderr)
		os.Exit(2)
	}
}

func usage(w *os.File) {
	fmt.Fprintln(w, "haggis-eval — ha.ggis Hub eval orchestrator")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Usage: haggis-eval <subcommand>")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Subcommands wired in plan 4:")
	fmt.Fprintln(w, "  rust                       Cargo fmt + clippy + test")
	fmt.Fprintln(w, "  rust-lint                  Cargo fmt + clippy only (pre-merge)")
	fmt.Fprintln(w, "  ts                         pnpm tsc + eslint + vitest + build + verify-dist")
	fmt.Fprintln(w, "  coverage                   vitest --coverage (v8; thresholds: lines≥90% stmts≥90% fns≥90% branches≥85%)")
	fmt.Fprintln(w, "  docs                       Current docs/eval claim-drift scan")
	fmt.Fprintln(w, "  security                   Deploy-config gate (public/_headers + _redirects)")
	fmt.Fprintln(w, "  perf                       Bundle-size budgets + paint-timing (scripts/perf-budgets.mjs + scripts/run-paint-gate.mjs)")
	fmt.Fprintln(w, "  browser                    Playwright smokes (door-launch + door-tap + pointer-drive)")
	fmt.Fprintln(w, "  determinism                Same seed + same input → same state hash (browser replay)")
	fmt.Fprintln(w, "  differential rng           WAT vs Rust xoshiro128**, 1M draws")
	fmt.Fprintln(w, "  differential hash          C vs Rust FNV-1a, vectors + 100k fuzz")
	fmt.Fprintln(w, "  visual [verify|capture]    Perceptual aHash diff vs tests/golden/ (default verify)")
	fmt.Fprintln(w, "  a11y                       Hand-rolled WCAG 2.2 AA spot-checks (lang, contrast, focus, names)")
	fmt.Fprintln(w, "  soak                       Memory-growth soak (15s RAF loop; GC before/after; heap budget 5 MB)")
	fmt.Fprintln(w, "  supply-chain               cargo deny check (licenses + advisories + bans + sources)")
	fmt.Fprintln(w, "  verify-report <path>       Recompute and verify an FNV-signed JSON report")
	fmt.Fprintln(w, "  slice [name|list]          Run a named gate-set bundle from tools/haggis-eval/slices.json")
	fmt.Fprintln(w, "  all                        Every release gate; FNV-signed tamper-evident JSON report")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Common flags:")
	fmt.Fprintln(w, "  --version    Print version")
	fmt.Fprintln(w, "  --help       Print this help")
}

func printAndExit(category string, results []gate.Result) int {
	exit := 0
	for _, r := range results {
		fmt.Printf("[%s] %-20s %s exit=%d %dms\n", r.Category, r.Name, r.Status, r.ExitCode, r.DurationMs)
		if r.Status != gate.StatusPass {
			exit = 1
			if len(r.StderrTail) > 0 {
				fmt.Fprintln(os.Stderr, r.StderrTail)
			}
		}
	}
	return exit
}
