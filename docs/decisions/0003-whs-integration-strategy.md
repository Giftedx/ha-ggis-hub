# ADR-0003: Wild Haggis Survivors Integration Strategy

Status: accepted
Date: 2026-05-22
Decision date: 2026-05-23
Related: [Data and save boundaries](../architecture/data-and-save-boundaries.md), [Cloudflare Pages](../deployment/cloudflare-pages.md), [ADR template](adr-template.md)

## Context

The hub’s first real game is Wild Haggis Survivors. WHS remains a separate project, but the public experience should eventually feel canonical under `ha.ggis.xyz`.

## Options

### Option A: external URL (first-release stopgap)

Hub launches WHS at its existing deployment URL (`https://wild-haggis-survivors.pages.dev/`).

Pros:

- fastest
- avoids touching WHS build base
- lower deployment coupling

Cons:

- less polished public URL
- migration needed if the canonical URL should move to `ha.ggis.xyz/wild-haggis-survivors`

### Option B: mount static WHS build under `/wild/` (shipped)

Hub deployment includes WHS build output under a subpath.

Pros:

- polished canonical URL
- one public haggis domain

Cons:

- needs WHS Vite/base-path compatibility (`base: '/wild/'`)
- deployment pipeline must coordinate two builds
- route fallback must be tested carefully

## Decision

**Superseded 2026-05-28 — Option B is now chosen and shipped.** The canonical
home is `https://ha.ggis.xyz/wild` (slug shortened from the originally-sketched
`/wild-haggis-survivors`). WHS is mounted under this Pages project at the
`/wild/` sub-path; there is no separate standalone deployment any more.

Original first-release rationale (Option A) preserved for the record below.

### Original decision (Option A — first public release, 2026-05-23)

Option A chosen at first launch. Rationale: WHS was already live and deployed
independently; absorbing it into the hub build required WHS Vite base-path
reconfiguration and a combined pipeline — coordination cost not justified while
the hub URL was new and the combined-build behavior untested.

### Why the switch (2026-05-28)

The hub is established (`ha.ggis.xyz` live + verified since 2026-05-27), so the
one-canonical-domain UX now outweighs the coordination cost. A Cloudflare Pages
custom domain binds a whole hostname, so `ha.ggis.xyz/wild` can *only* be served
by this project — there is no way to point a sub-path at a separate Pages
project. Option B is therefore the only route to the desired URL.

## Implementation

`src/games/registry.ts`: `launch: { kind: 'route', target: '/wild/' }` — a
validated same-origin absolute path (the existing `validateLaunchTarget` route
branch requires a single leading `/`).

Build/deploy (this repo):
- WHS builds with Vite `base: '/wild/'` (sibling repo).
- `pnpm run build:all` = hub build → `build:whs` → `copy:whs`
  (`scripts/copy-whs-build.mjs` copies WHS `dist/` into `dist/wild/`).
- `public/_redirects`: `/wild/* → /wild/index.html 200` **before** the hub
  wildcard so WHS deep links resolve to the WHS shell.
- `public/_headers`: `/wild/assets/*` immutable + `/wild/sw.js` revalidate; the
  `/*` security headers (CSP, HSTS, …) are inherited by `/wild/*`.
- `scripts/deploy-config.test.ts` locks the route ordering + the WHS cache rules.

See [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) §WHS Integration Decision for the
operational deploy flow.
