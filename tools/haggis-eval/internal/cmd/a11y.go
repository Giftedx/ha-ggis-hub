package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// A11y runs the hand-rolled accessibility smoke via
// scripts/run-a11y-gate.mjs, which orchestrates `pnpm build` →
// `vite preview` → `node scripts/smoke-a11y.mjs` → preview teardown.
// The smoke spot-checks WCAG 2.2 AA criteria the hub can actually
// fail given its shape (canvas-first SPA, one link, no forms): page
// language, viewport zoom, page title, canvas accessible name,
// interactive-element accessible name, keyboard reachability, focus
// indicator visibility, and computed contrast ratios on declared text
// pairs. Shipped 2026-05-24 — closes the long-standing "a11y still
// planned" strictness item without taking on axe-core / pa11y.
func A11y() []gate.Result {
	return []gate.Result{
		gate.Run("a11y", "wcag-aa-spot-checks",
			"node", "scripts/run-a11y-gate.mjs"),
	}
}
