# Security Model

Status: planned architecture
Scope: static-app security posture, browser boundary risk, supply chain, deployment
Related: [Dependency policy](../foundation/12-craft-commitments.md#dependency-policy), [Cloudflare Pages](../deployment/cloudflare-pages.md)

## Threat model summary

This is a static browser app, so primary risks are:

- supply-chain compromise
- malicious or vulnerable dependencies
- unsafe CSP relaxations
- accidental secret exposure through frontend env/source maps
- XSS through dynamic content or future external data
- mixed content
- unsafe integration with externally hosted games
- deployment misconfiguration

## Static app rules

- No secrets in frontend code or `VITE_*` variables.
- No production source maps unless intentionally uploaded privately.
- CSP must be restrictive and tested.
- External origins must be explicit.
- Asset licenses must be documented before public release.

## WASM-specific rules

- WASM boundary inputs are untrusted.
- Invalid input should return controlled errors, not panic.
- Debug panic hooks are development-only.
- Do not assume Rust eliminates browser security concerns.

## Dependency rules

Use `cargo audit`, `cargo deny`, frontend audit tooling, and lockfiles. See [Dependency policy](../foundation/12-craft-commitments.md#dependency-policy).

## Deployment rules

Use Cloudflare headers and cache policy described in [Cloudflare Pages deployment foundation](../deployment/cloudflare-pages.md).
