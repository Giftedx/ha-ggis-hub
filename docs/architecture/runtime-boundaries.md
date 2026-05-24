# Runtime Boundaries

Status: current architecture (routing lifecycle planned; all wired items current)
Scope: lifecycle and data-flow boundaries between core, host, renderer, and game modules
Related: [Architecture overview](overview.md), [Data and save boundaries](data-and-save-boundaries.md)

## Game module contract

Current TypeScript interface in `src/engine/game-module.ts`:

```ts
export type GameLaunchSource = 'direct-play' | 'door' | 'route';

export interface GameMountOptions {
  readonly launchSource: GameLaunchSource;
  readonly reducedMotion: boolean;
}

export interface GameModule {
  readonly id: string;
  readonly title: string;
  preload?(): Promise<void>;
  mount(target: HTMLElement, options: GameMountOptions): Promise<GameInstance>;
}

export interface GameInstance {
  pause(): void;
  resume(): void;
  destroy(): void | Promise<void>;
  serialize?(): unknown;
  restore?(state: unknown): void;
}
```

## Lifecycle invariants

- `mount` starts resources.
- `pause` stops simulation advancement but keeps enough state to resume.
- `resume` continues from the same state.
- `destroy` releases RAF loops, listeners, renderer resources, object URLs, and WASM-owned handles.
- Current: `src/engine/lifecycle.ts` owns one active `GameInstance`, preloads before mount, destroys replacement instances safely, and treats pause/resume/repeated destroy as safe no-ops when nothing is mounted.
- Current: `src/engine/input.ts` maps Arrow/WASD key state into compact tick-aligned axes and removes listeners on sampler destruction.
- Current: `document.visibilitychange` resets the fixed-step accumulator and the frame timer when the tab returns from hidden, preventing a burst of catch-up ticks (without the reset, 5 minutes hidden leaves ~300 seconds in the accumulator, causing ~37 seconds of 8-tick-per-frame burst).
- Planned: route changes must call `destroy` once routing exists.

## Frame loop model

Current first-room model:

```text
requestAnimationFrame
  -> collect input snapshot
  -> advance fixed simulation ticks up to cap
  -> obtain render snapshot
  -> render snapshot
```

Rules:

- Gameplay truth uses fixed ticks.
- Rendering may interpolate but cannot mutate gameplay truth.
- Input is sampled into compact snapshots.
- WASM calls are coarse, not per entity.
- Current: `src/hub/room.ts` owns the first-room controller, samples host input once per frame, advances the player through `HubCoreWorld`, asks the core for door interaction, and renders an immutable room snapshot.
- Current: `src/render/canvas-room.ts` is the accepted Canvas2D renderer from [ADR-0005](../decisions/0005-canvas2d-first-room-renderer.md); it presents snapshots and owns no gameplay truth.
- Current: `src/wasm/generated-loader.ts` initializes the wasm-bindgen package generated under `src/generated/hub-wasm/` for the browser build.

## Error handling

Failures must produce controlled states:

- WASM initialization failure -> readable fallback with direct links.
- Renderer failure -> readable fallback with direct links.
- Game launch URL missing -> disabled/locked prompt, not crash.
- Unexpected runtime exception -> error boundary and console diagnostics in development.
