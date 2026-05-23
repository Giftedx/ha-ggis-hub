# Deployment

ha.ggis.xyz is deployed to Cloudflare Pages.

## Cloudflare Pages settings

| Setting | Value |
|---|---|
| Build command | `pnpm run build` |
| Build output directory | `dist` |
| Node version | 22 |
| Package manager | pnpm |

Custom domain: `ha.ggis.xyz`

## DNS

```
ha.ggis.xyz → Cloudflare Pages CNAME target
```

## Redirects

`ggis.xyz` should 302 redirect to `https://ha.ggis.xyz` until routing is final, then upgrade to 301.

## WHS Integration Decision (2026-05-23)

**Chosen: Option B — hub links to separate WHS deployment.**

Rationale:
- WHS is already live and deploys independently to `https://wild-haggis-survivors.pages.dev/`.
- No base path changes needed in WHS.
- Fastest path to a working ha.ggis.xyz.
- Option A (hub owns `/wild-haggis-survivors/` path) is the end-state but requires WHS Vite base reconfiguration and a combined build pipeline. Deferred until ha.ggis.xyz is established.

**Current WHS URL:** `https://wild-haggis-survivors.pages.dev/`

Configured in `src/games/registry.ts`: `launch: { kind: 'external-url', target: 'https://wild-haggis-survivors.pages.dev/' }`

### Switching to Option A (future)

If the canonical URL should move to `ha.ggis.xyz/wild-haggis-survivors`:

1. In WHS repo: set `base: '/wild-haggis-survivors/'` in `vite.config.ts`
2. Build WHS; copy `dist/` to `ha-ggis-hub dist/wild-haggis-survivors/`
3. Update `launch-target` in `src/games/registry.ts` to `{ kind: 'route', target: '/wild-haggis-survivors/' }`
4. Add combined build script (e.g. `npm run build:all`) to ha-ggis-hub package.json
