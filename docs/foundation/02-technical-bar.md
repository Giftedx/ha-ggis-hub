# 02 Technical Bar

Status: canonical foundation policy
Scope: what “good enough” means technically
Related: [Quality gates](07-quality-gates.md), [Release definition](09-release-definition.md), [First Perfect Slice](10-first-perfect-slice.md)

## Baseline bar

The baseline is not “it runs.” The baseline is:

- architecture is documented
- code paths are testable
- core behavior has unit tests
- browser behavior has smoke tests
- dependencies are justified
- build output is budgeted
- deployment is hardened
- errors fail safely
- docs match the repo

## Architecture bar

A valid implementation slice must have:

- clear ownership boundaries between Rust core, WASM wrapper, TypeScript host, renderer, and deployment
- no hidden global runtime state
- explicit lifecycle for game modules
- explicit save/settings boundaries
- a documented route and launch model

## Correctness bar

Core rules should have tests for:

- movement bounds
- input mapping
- door proximity
- launch eligibility
- registry validation
- save schema and migration once saves exist

## Performance bar

The app should feel instant at the hub level. Games can lazy-load; the front door cannot feel bloated.

Initial budgets are defined in [Quality gates](07-quality-gates.md). Budgets may change only by documented decision.

## Security bar

The app is static, but static does not mean unserious.

Requirements:

- no committed secrets
- no high/critical dependency vulnerabilities
- restrictive CSP
- no accidental public source maps in production
- strict cache policy for hashed assets vs HTML
- no mixed content
- no broad third-party origins without explicit justification

## Documentation bar

Docs must say whether examples are current or planned. A command that cannot run yet because files are not scaffolded must not be presented as current.

## Visual/product bar

Programmer art is allowed during internal iteration. Public-facing placeholder slop is not. The first public slice needs intentional visual direction, even if minimal.
