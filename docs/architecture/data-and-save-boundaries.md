# Data and Save Boundaries

Status: registry and hub settings shipped; hub progress save deferred
Scope: game registry, hub persistence, and Wild Haggis Survivors separation
Related: [Runtime boundaries](runtime-boundaries.md), [Project charter — Product vision](../foundation/00-project-charter.md#product-vision), [ADR-0007](../decisions/0007-hub-settings-persistence.md)

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

## Hub settings persistence

Current hub-owned key:

```text
ggis_hub_settings
```

`src/app/settings.ts` owns this record. Schema 1 is a JSON envelope with
`schema: 1`, a `music` payload, and a keyless FNV-1a 64-bit `digest` over the
canonical payload without the digest field. The checksum is tamper-evident
against accidental corruption; it is not a cryptographic signature. Invalid,
corrupt, or unavailable storage falls back to defaults and must not block hub
startup.

Current payload:

```json
{
  "music": {
    "enabled": false,
    "trackIndex": 0
  }
}
```

`enabled` records the visitor's last explicit music preference. It does not
grant autoplay permission: the music controller still starts paused and waits
for a fresh click before audio playback. `trackIndex` lets the hub resume the
visitor's last selected hub track without fetching MP3 assets before opt-in.

Legacy schema 0 (`music.wantsPlayback`, `music.currentTrackIndex`) is migrated
in tests so future schema changes have a fixture pattern to follow.

Planned hub-owned key:

```text
ggis_hub_save
```

`ggis_hub_save` remains deferred until the hub has progress, customisation, or
another gameplay state worth saving. Do not use WHS keys from the hub.

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
