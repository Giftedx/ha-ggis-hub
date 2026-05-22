# Cloudflare Pages Deployment Foundation

Status: planned deployment foundation
Scope: target hosting, redirects, headers, caching, source maps
Related: [Release definition](../foundation/09-release-definition.md), [Quality gates](../foundation/07-quality-gates.md)

## Current status

No Cloudflare config exists in the repository yet. This document defines the target deployment shape.

## Target domains

```text
https://ha.ggis.xyz/
  production hub

https://ggis.xyz/*
  redirect to https://ha.ggis.xyz/$1
```

Use a Cloudflare Redirect Rule or Bulk Redirect for `ggis.xyz` rather than app-level JavaScript.

## Pages project target

```text
Project name: ha-ggis-hub
Production branch: main
Build command: pnpm install --frozen-lockfile && pnpm run build
Output directory: dist
Node version: 22
Preview deployments: enabled
```

If Rust/WASM tooling is awkward in the Cloudflare build image, prefer GitHub Actions to install toolchains, run gates, build `dist`, and deploy with Wrangler.

## Planned `public/_headers`

```text
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), sync-xhr=(), usb=(), web-share=(self), xr-spatial-tracking=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Origin-Agent-Cluster: ?1
  Content-Security-Policy: default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob: data:

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/
  Cache-Control: public, max-age=0, must-revalidate
```

Notes:

- `wasm-unsafe-eval` is expected for WebAssembly compilation under CSP.
- `style-src 'unsafe-inline'` is a starting compromise for frontend tooling and style attributes. Tighten later if practical.
- HSTS preload should be enabled only when subdomains are HTTPS-ready.

## Planned `public/_redirects`

Only add WHS fallback once WHS is actually mounted under the hub build:

```text
/wild-haggis-survivors/*  /wild-haggis-survivors/index.html  200
/*  /index.html  200
```

Specific routes must appear before the broad SPA fallback.

## Cache policy

- `index.html`: revalidate every request.
- hashed assets: one year immutable.
- manifest: short cache.
- un-hashed files: no long immutable cache.

## Source maps

Production default: no public source maps.

Preview default: source maps allowed.

If hidden maps are generated for error tracking, they must be uploaded privately and removed from public `dist` before deployment.

## Launch checklist

- `ha.ggis.xyz` resolves to Pages production.
- `ggis.xyz` redirects preserving path/query.
- HTTPS active.
- Security headers present.
- CSP does not block WASM.
- Hashed assets receive immutable caching.
- HTML does not receive immutable caching.
- No production source maps unless intentional.
- Direct deep links reload correctly.
- Browser smoke tests pass against preview.
