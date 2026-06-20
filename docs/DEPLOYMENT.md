# Deployment

Status: live on Cloudflare Pages. `ha.ggis.xyz` serves the hub; `ggis.xyz`
redirects to `ha.ggis.xyz`.

Canonical deployment details live in
[`deployment/cloudflare-pages.md`](deployment/cloudflare-pages.md). This file is
the short operator runbook for the current public-domain cutover.

Live check on 2026-05-27:

- `ggis.xyz` is delegated to Cloudflare nameservers (`heather` / `houston`).
- Pages project `ha-ggis-hub` exists.
- First production deployment was uploaded from local `dist/` with Wrangler:
  `eb7af2ae` at `https://ha-ggis-hub.pages.dev/`.
- `https://ha.ggis.xyz/` returns `HTTP 200` from Cloudflare Pages with the
  shipped security headers.
- `https://ggis.xyz/test/path?x=1` returns `HTTP 301` to
  `https://ha.ggis.xyz/test/path?x=1` and then `HTTP 200`.
- Pages custom-domain API still reports top-level `status: pending`, but
  `verification_data.status: active` and the public HTTPS edge is live.

## Cloudflare Pages settings

| Setting | Value |
|---|---|
| Project name | `ha-ggis-hub` |
| Production branch | `main` |
| Build command | `pnpm install --frozen-lockfile && pnpm run build` |
| Build output directory | `dist` |
| Node version | 22 |
| Package manager | pnpm |

Current bootstrap was a direct upload:

```powershell
pnpm run build:verified
pnpm dlx wrangler@latest pages project create ha-ggis-hub --production-branch=main
pnpm dlx wrangler@latest pages deploy dist --project-name=ha-ggis-hub --branch=main --commit-dirty=true
```

Current builds write `dist/__version` after Vite completes. The endpoint records the
hub package version, hub git commit/dirty state, WHS and JFMM source git
commit/dirty state when the sibling checkouts are present, and mounted build
hashes when `dist/wild/` and `dist/just-five-more-minutes/` exist.

Custom domain: `ha.ggis.xyz`

## DNS and custom domain

Create or confirm a successful production deployment first. Then add
`ha.ggis.xyz` through the Cloudflare Pages project custom-domain flow before
manually editing DNS. Adding only a raw CNAME without the Pages custom-domain
association can leave the hostname failing at the edge.

Expected records after activation:

| Type | Name | Target/content | Proxy |
|---|---|---|---|
| CNAME | `ha` | `ha-ggis-hub.pages.dev` | Proxied / automatic |
| A | `@` | `192.0.2.0` | Proxied |

The apex `A @ 192.0.2.0` record is an originless placeholder so Cloudflare can
receive `ggis.xyz` traffic and apply the redirect rule. It must be proxied.

Current public DNS resolves both `ha.ggis.xyz` and `ggis.xyz` to Cloudflare
anycast addresses because both records are proxied.

## Redirects

Use a Cloudflare Single Redirect or Bulk Redirect, not app code.

Current cutover rule:

| Field | Value |
|---|---|
| Ruleset | `eee0deacc18e4a599b6ee51c63242595` |
| Rule ref | `ggis_apex_to_ha_ggis` |
| Match | `http.host eq "ggis.xyz"` |
| Target URL | `concat("https://ha.ggis.xyz", http.request.uri.path)` |
| Status | `301` |
| Preserve query string | Enabled |

After setup, verify:

```powershell
Resolve-DnsName ha.ggis.xyz -Type A -Server 1.1.1.1
Resolve-DnsName ggis.xyz -Type A -Server 1.1.1.1
curl.exe -I https://ha.ggis.xyz/
curl.exe -I "https://ggis.xyz/test/path?x=1"
```

## Rollback procedure

The hub is a static build; there is no server state to migrate. Cloudflare Pages retains every prior deployment and can serve any of them instantly.

### Identify a known-good build

All production deployments list at:
`https://dash.cloudflare.com/ → Pages → ha-ggis-hub → Deployments`

Each row shows: commit hash, deployment ID, branch, and timestamp. Pick the last row with a green "Active" or "Success" indicator that pre-dates the broken deploy.

Alternatively, list from the CLI:

```powershell
pnpm dlx wrangler@latest pages deployment list --project-name=ha-ggis-hub
```

The first `Deployment ID` column entry is the rollback target.

### Roll back via the dashboard

1. Open `ha-ggis-hub → Deployments`.
2. Click the three-dot menu next to the target row.
3. Choose **Rollback to this deployment**.
4. Cloudflare re-routes production traffic to that build within seconds. No new build is triggered.

### Roll back via CLI

```powershell
# Replace <DEPLOYMENT_ID> with the ID from the list above.
pnpm dlx wrangler@latest pages deployment rollback <DEPLOYMENT_ID> --project-name=ha-ggis-hub
```

### Verify after rollback

```powershell
curl.exe -I https://ha.ggis.xyz/
curl.exe -I "https://ggis.xyz/test/path?x=1"
curl.exe -fsS https://ha.ggis.xyz/__version
```

Confirm `HTTP 200` from `ha.ggis.xyz` and `HTTP 301` from `ggis.xyz`. Check the `ETag` or `x-deployment-id` response header to confirm the rolled-back deployment ID is active.

### Re-deploy a local dist (emergency)

If the Cloudflare rollback list is missing the target build (unlikely), re-deploy from a local `dist/` built from the known-good commit:

```powershell
git checkout <GOOD_COMMIT>
pnpm install --frozen-lockfile
pnpm run build:verified
pnpm dlx wrangler@latest pages deploy dist --project-name=ha-ggis-hub --branch=main
```

## WHS Integration Decision (Option B shipped 2026-05-28)

**Chosen: Option B — WHS mounted under this Pages project at `/wild/`.** The
canonical home is **`https://ha.ggis.xyz/wild`**. There is no separate
standalone WHS deployment any more. See [ADR-0003](decisions/0003-whs-integration-strategy.md)
for the decision record (Option A was the 2026-05-23 first-release stopgap).

Why a sub-path of *this* project: a Cloudflare Pages custom domain binds a whole
hostname, so `ha.ggis.xyz/wild` cannot point at a second Pages project — the
`/wild/` build must live inside this deploy.

`src/games/registry.ts`: `launch: { kind: 'route', target: '/wild/' }`.

### Combined build + deploy

WHS is a sibling repo (`../wild-haggis-survivors`) built with Vite `base: '/wild/'`,
so every asset/manifest/SW URL it emits is already `/wild/`-rooted. Just Five
More Minutes is a sibling experiment (`../../experiments/just-five-more-minutes`)
built with Vite `base: '/just-five-more-minutes/'`.

```bash
# From ha-ggis-hub/. Builds the hub, WHS, and JFMM, then mounts both games.
pnpm run build:all
#   = pnpm run build            (hub: wasm + vite + dist/__version)
#     pnpm run build:whs        (npm --prefix ../wild-haggis-survivors run build)
#     pnpm run copy:whs         (scripts/copy-whs-build.mjs → dist/wild/)
#     pnpm run build:jfmm       (npm --prefix ../../experiments/just-five-more-minutes run build:hub)
#     pnpm run copy:jfmm        (scripts/copy-jfmm-build.mjs → dist/just-five-more-minutes/)
#     node scripts/write-version-manifest.mjs  (rewrites dist/__version with mounted-game build hashes)

# Then deploy the combined dist (interactive auth the first time):
wrangler login
wrangler pages deploy dist --project-name ha-ggis-hub
```

The Cloudflare-dashboard production **Build command must be `pnpm run build:all`**
(not `pnpm run build`) so production builds include the mounted games. If the
Pages build image can't run the sibling-repo builds (WHS/JFMM are not checked
out there), build + deploy from GitHub Actions or locally with Wrangler instead.

Routing/caching for the sub-paths lives in `public/_redirects`
(`/wild/* → /wild/index.html 200` and `/just-five-more-minutes/* →
/just-five-more-minutes/index.html 200`, both **before** the hub wildcard) and
`public/_headers` (`/wild/assets/*` and `/just-five-more-minutes/assets/*`
immutable, `/wild/sw.js` revalidate, `/__version` JSON + revalidate); both are
locked by `scripts/deploy-config.test.ts`.

### Verify after manual deploy

Run the opt-in probe only after you expect production to contain the branch you
just deployed:

```bash
pnpm run production:check
# or, after building tools/haggis-eval:
./tools/haggis-eval/haggis-eval production
```

The probe checks `https://ha.ggis.xyz/`, the `ggis.xyz` apex redirect preserving
path/query, required security headers and CSP, immutable hashed hub + WHS + JFMM
assets, source-map absence, `https://ha.ggis.xyz/wild/`,
`https://ha.ggis.xyz/just-five-more-minutes/`, and
`https://ha.ggis.xyz/__version`. If it fails on `/__version`, inspect the JSON
with:

```bash
curl -fsS https://ha.ggis.xyz/__version
```

Use `hub.git.commit` and `wildHaggisSurvivors.source.commit` as the deployed
provenance. A `dirty: true` value is intentional evidence that the uploaded build
came from an uncommitted or otherwise dirty checkout; do not infer deployment
currency from asset hashes alone.
