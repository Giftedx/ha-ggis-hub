# ADR-0003: Wild Haggis Survivors Integration Strategy

Status: proposed (decision-pending)  
Date: 2026-05-22  
Related: [Data and save boundaries](../architecture/data-and-save-boundaries.md), [Cloudflare Pages](../deployment/cloudflare-pages.md), [ADR template](adr-template.md)

This ADR uses the decision-pending shape. The launch strategy will be chosen after deployment is real and the WHS build base path can be tested under the production hub.

## Context

The hub’s first real game is Wild Haggis Survivors. WHS remains a separate project, but the public experience should eventually feel canonical under `ha.ggis.xyz`.

## Options

### Option A: external URL first

Hub launches WHS at its existing deployment URL.

Pros:

- fastest
- avoids touching WHS build base
- lower deployment coupling

Cons:

- less polished public URL
- migration needed later

### Option B: mount static WHS build under `/wild-haggis-survivors/`

Hub deployment includes WHS build output under a subpath.

Pros:

- polished canonical URL
- one public haggis domain

Cons:

- needs WHS Vite/base-path compatibility
- deployment pipeline must coordinate two builds
- route fallback must be tested carefully

## Current recommendation

Start configurable. Use external URL first if needed to keep the First Perfect Slice safe. Move to `/wild-haggis-survivors/` only after WHS build/base-path and Cloudflare route behavior are verified.

## Decision required later

Before public production launch, decide whether the first launch uses Option A or Option B.
