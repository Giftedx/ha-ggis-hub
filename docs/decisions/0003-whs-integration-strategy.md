# ADR-0003: Wild Haggis Survivors Integration Strategy

Status: accepted
Date: 2026-05-22
Decision date: 2026-05-23
Related: [Data and save boundaries](../architecture/data-and-save-boundaries.md), [Cloudflare Pages](../deployment/cloudflare-pages.md), [ADR template](adr-template.md)

## Context

The hub’s first real game is Wild Haggis Survivors. WHS remains a separate project, but the public experience should eventually feel canonical under `ha.ggis.xyz`.

## Options

### Option A: external URL (chosen)

Hub launches WHS at its existing deployment URL (`https://wild-haggis-survivors.pages.dev/`).

Pros:

- fastest
- avoids touching WHS build base
- lower deployment coupling

Cons:

- less polished public URL
- migration needed if the canonical URL should move to `ha.ggis.xyz/wild-haggis-survivors`

### Option B: mount static WHS build under `/wild-haggis-survivors/`

Hub deployment includes WHS build output under a subpath.

Pros:

- polished canonical URL
- one public haggis domain

Cons:

- needs WHS Vite/base-path compatibility (`base: ‘/wild-haggis-survivors/’`)
- deployment pipeline must coordinate two builds
- route fallback must be tested carefully

## Decision

**Option A chosen** for the first public release. Rationale: WHS is already live and deploys independently. Absorbing it into the hub build requires WHS Vite base-path reconfiguration and a combined pipeline — that coordination cost is not justified while the hub URL is new and the combined-build behavior is untested.

Option B remains the intended end-state. The migration path is documented in [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) §WHS Integration Decision.

## Implementation

`src/games/registry.ts`: `launch: { kind: ‘external-url’, target: ‘https://wild-haggis-survivors.pages.dev/’ }`

External URL launch is validated at startup — must use `https:` and be a valid URL. No additional code path needed; the hub’s existing registry/launch machinery handles it.
