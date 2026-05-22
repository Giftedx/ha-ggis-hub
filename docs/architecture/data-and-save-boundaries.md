# Data and Save Boundaries

Status: planned architecture  
Scope: game registry, hub persistence, and Wild Haggis Survivors separation  
Related: [Runtime boundaries](runtime-boundaries.md), [Product vision](../foundation/03-product-vision.md)

## Registry principle

Doors and games are data. Scene code should not hard-code every launchable game.

Planned registry fields:

```ts
export type HubGameStatus = 'playable' | 'coming-soon' | 'external' | 'disabled';

export interface HubGameDefinition {
  id: string;
  title: string;
  subtitle: string;
  route: string | null;
  status: HubGameStatus;
  launchKind: 'internal-route' | 'external-url' | 'mounted-static-app' | 'none';
}
```

## Registry invariants

- IDs are stable and kebab-case.
- Playable games require a non-null route.
- Coming-soon games may not launch.
- External URLs must be explicit and reviewed.
- WHS has exactly one canonical registry entry.

## Hub persistence

Planned hub keys:

```text
ggis_hub_save
ggis_hub_settings
```

Do not use WHS keys from the hub.

## Wild Haggis Survivors boundary

Known WHS keys from the original plan:

```text
whs_save
whs_meta_save
whs_game_settings
```

The hub must not write to these keys.

If the hub later displays WHS progress, use one of:

- WHS exported read-only summary
- explicit `postMessage` contract
- explicit localStorage summary key owned by WHS and documented by WHS

No implicit scraping of WHS internals.
