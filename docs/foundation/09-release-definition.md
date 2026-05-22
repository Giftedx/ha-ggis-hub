# 09 Release Definition

Status: canonical foundation policy  
Scope: what it means to release this project publicly  
Related: [Quality gates](07-quality-gates.md), [Deployment foundation](../deployment/cloudflare-pages.md), [First Perfect Slice](10-first-perfect-slice.md)

## Release philosophy

A release is not a build artifact. It is a claim that the project is safe, understandable, polished, and representative of the quality bar.

## First public release requirements

Product:

- `ha.ggis.xyz` loads the hub.
- `ggis.xyz` redirects to `ha.ggis.xyz`.
- The domain joke is visible.
- The haggis hub is playable.
- Wild Haggis Survivors can be launched.
- A direct launch button exists outside the canvas.
- Reduced-motion or non-game fallback path exists.

Engineering:

- Rust/WASM core exists for meaningful deterministic behavior.
- TypeScript host is strict and tested.
- Renderer lifecycle is clean.
- Game registry is data-driven and validated.
- Save/settings boundaries are documented.
- Security headers are configured.
- Production source-map policy is enforced.
- Browser smoke tests pass with no console errors.

Documentation:

- README and docs index are accurate.
- Foundation docs match implementation.
- ADRs exist for stack and renderer choices.
- Deployment docs match actual hosting configuration.
- Any planned command that cannot run is not represented as current.

## Release blockers

Any item listed as a release blocker in [Quality gates](07-quality-gates.md) blocks public release.

## Preview vs production

Preview deployments may expose incomplete slices if clearly labelled and safe. Production must meet the release definition.

## Rollback posture

Static deployment should allow rollback to a previous known-good build. The release plan must include how to identify and restore that build before first production launch.
