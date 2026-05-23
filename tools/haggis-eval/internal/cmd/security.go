package cmd

import (
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Security runs the deploy-config gate: vitest assertions over
// public/_headers (CSP directives, HSTS, X-Frame-Options, cache policy,
// Permissions-Policy lockdown) + public/_redirects (SPA fallback).
// Mirrors scripts/deploy-config.test.ts. Shipped 2026-05-23 alongside
// the public/_headers file itself; this unstubs the spec entry.
func Security() []gate.Result {
	return []gate.Result{
		gate.Run("security", "deploy-config",
			"pnpm", "exec", "vitest", "run", "scripts/deploy-config.test.ts"),
	}
}
