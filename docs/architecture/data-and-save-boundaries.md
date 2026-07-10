# Data and Save Boundaries

Status: registry, hub settings, and hub progress save shipped
Scope: game registry, hub persistence, and Wild Haggis Survivors separation
Related: [Runtime boundaries](runtime-boundaries.md), [Project charter — Product vision](../foundation/00-project-charter.md#product-vision), [ADR-0007](../decisions/0007-hub-settings-persistence.md), [ADR-0008](../decisions/0008-hub-progress-save.md)

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

Both hub-owned browser records share one envelope implementation:
`src/app/versioned-record.ts` owns the `{ schema, ...payload, digest }`
layout, the keyless FNV-1a 64-bit digest over the canonical record without
the digest field, the corrupt-record → defaults degradation, and the
migration table (old stored record → current value, verified through golden
fixtures). The checksum is tamper-evident against accidental corruption; it
is not a cryptographic signature. Invalid, corrupt, or unavailable storage
falls back to defaults and must not block hub startup.

### Hub settings (`ggis_hub_settings`)

`src/app/settings.ts` owns this record. Schema 1 payload:

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

Legacy schema 0 (`music.wantsPlayback`, `music.currentTrackIndex`) migrates
through the codec's migration table — the worked example every future schema
bump follows.

### Hub progress save (`ggis_hub_save`)

`src/app/progress.ts` owns this record (ADR-0008). Schema 1 payload:

```json
{
  "visits": 3,
  "lockedChaps": 5,
  "doorEntries": { "wild-haggis-survivors": 2 }
}
```

Progress is host-side presentation history: visits drive the returning-visitor
greeting, `lockedChaps` keeps the coming-soon door's retort rotation going
across visits, and `doorEntries` switches a door's prompt to `AWA' BACK IN`.
Nothing in this record enters the Rust sim — seeds, state hashes, and
`.haggislog` replay are unaffected by it.

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
