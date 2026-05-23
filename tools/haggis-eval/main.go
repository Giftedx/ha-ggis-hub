// Package main is the haggis-eval CLI entry point. See README.md.
package main

import (
	"fmt"
	"os"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/cmd"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
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
	case "ts":
		os.Exit(printAndExit("ts", cmd.Ts()))
	case "differential":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "differential requires a target: rng | hash")
			os.Exit(2)
		}
		os.Exit(printAndExit("differential", cmd.Differential(os.Args[2])))
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
	fmt.Fprintln(w, "  ts                         pnpm tsc + vitest + build")
	fmt.Fprintln(w, "  differential rng           WAT vs Rust xoshiro128**, 1M draws")
	fmt.Fprintln(w, "  differential hash          C vs Rust FNV-1a, vectors + 100k fuzz")
	fmt.Fprintln(w, "  all                        Every wired gate; signed JSON report")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Stubs (return exit 78 until implemented):")
	fmt.Fprintln(w, "  browser determinism perf security slice")
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
