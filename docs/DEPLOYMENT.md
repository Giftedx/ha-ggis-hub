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

## WHS Integration Decision (2026-05-23)

**Chosen: Option A — hub links to the separate WHS deployment.**

Rationale:
- WHS is already live and deploys independently to `https://wild-haggis-survivors.pages.dev/`.
- No base path changes needed in WHS.
- Fastest path to a working `ha.ggis.xyz`.
- Option B (hub owns `/wild-haggis-survivors/` path) is the end-state but requires WHS Vite base reconfiguration and a combined build pipeline. Deferred until `ha.ggis.xyz` is established.

**Current WHS URL:** `https://wild-haggis-survivors.pages.dev/`

Configured in `src/games/registry.ts`: `launch: { kind: 'external-url', target: 'https://wild-haggis-survivors.pages.dev/' }`

### Switching to Option B (future)

If the canonical URL should move to `ha.ggis.xyz/wild-haggis-survivors`:

1. In WHS repo: set `base: '/wild-haggis-survivors/'` in `vite.config.ts`
2. Build WHS; copy `dist/` to `ha-ggis-hub dist/wild-haggis-survivors/`
3. Update `launch-target` in `src/games/registry.ts` to `{ kind: 'route', target: '/wild-haggis-survivors/' }`
4. Add combined build script (e.g. `npm run build:all`) to ha-ggis-hub package.json
