# Data and Save Boundaries

Status: registry shipped; hub persistence deferred (no save system exists yet)
Scope: game registry, hub persistence, and Wild Haggis Survivors separation
Related: [Runtime boundaries](runtime-boundaries.md), [Project charter — Product vision](../foundation/00-project-charter.md#product-vision)

## Registry principle

Doors and games are data. Scene code should not hard-code every launchable game.

Shipped registry types (`src/games/registry.ts`):

```ts
export type HubGameStatus = 'playable' | 'coming-soon' | 'disabled';

export type HubGameLaunchTarget =
  | { readonly kind: 'route'; readonly target: string }
  | { readonly kind: 'external-url'; readonly target: string }
  | { readonly kind: 'none' };

export interface HubGameDefinition {
  readonly id: string;
  readonly title: string;
  readonly status: HubGameStatus;
  readonly launch: HubGameLaunchTarget;
}
```

## Registry invariants

- IDs are stable and kebab-case.
- Playable games require a non-null route.
- Coming-soon games may not launch.
- External URLs must be explicit and reviewed.
- WHS has exactly one canonical registry entry.
- The current playable registry entries are `wild-haggis-survivors` (`/wild/`) and `just-five-more-minutes` (`/just-five-more-minutes/`); both must have launchable room doors.

## Hub persistence

Planned hub keys:

```text
ggis_hub_save
ggis_hub_settings
```

Do not use WHS keys from the hub.

## Wild Haggis Survivors boundary

WHS source remains in the sibling repo, but its current public build is mounted
under this Pages project at `/wild/`. The hub owns the lobby route and static
mount, not WHS gameplay state.

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
