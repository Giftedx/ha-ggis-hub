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

## WHS integration

Wild Haggis Survivors is live at `https://wild-haggis-survivors.pages.dev/`. The hub links there directly (Setup B — separate deployments). If the canonical URL moves to `ha.ggis.xyz/wild-haggis-survivors`, update the `launch-target` in `src/games/registry.ts`.
