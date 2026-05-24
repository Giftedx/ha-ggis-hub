package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Perf runs the two-part performance gate:
//
//  1. bundle-budgets — builds dist/ and asserts each asset stem
//     (index.js, hub_wasm_bg.wasm) plus the total stays within the
//     byte limits declared in perf-budgets.json. Catches regressions
//     like a dependency import or accidental asset-inclusion silently
//     doubling the bundle.
//
//  2. paint-timing — boots vite preview and uses chromium-headless
//     via Playwright (already in deps) to read the W3C Paint Timing
//     API: first-contentful-paint, largest-contentful-paint via
//     PerformanceObserver, plus navigation-timing's
//     domContentLoadedEventEnd and loadEventEnd. Median of three
//     samples is asserted against the `paint.max_ms` block in
//     perf-budgets.json. Hand-rolled — no Lighthouse npm dep,
//     directly off the W3C primitives.
//
// Together these cover both halves of the slice 9 `perf` spec entry:
// the bundle half (shipped 2026-05-23) and the paint half (shipped
// 2026-05-24, this commit).
func Perf() []gate.Result {
	return []gate.Result{
		gate.Run("perf", "build", "pnpm", "run", "build"),
		gate.Run("perf", "bundle-budgets", "node", "scripts/perf-budgets.mjs"),
		gate.Run("perf", "paint-timing", "node", "scripts/run-paint-gate.mjs"),
	}
}
