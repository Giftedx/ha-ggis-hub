# Runtime Boundaries

Status: planned architecture
Scope: lifecycle and data-flow boundaries between core, host, renderer, and game modules
Related: [Architecture overview](overview.md), [Data and save boundaries](data-and-save-boundaries.md)

## Game module contract

Planned TypeScript interface:

```ts
export interface GameModule {
  readonly id: string;
  readonly title: string;
  preload?(): Promise<void>;
  mount(target: HTMLElement, options: GameMountOptions): Promise<GameInstance>;
}

export interface GameInstance {
  pause(): void;
  resume(): void;
  destroy(): void;
  serialize?(): unknown;
  restore?(state: unknown): void;
}
```

## Lifecycle invariants

- `mount` starts resources.
- `pause` stops simulation advancement but keeps enough state to resume.
- `resume` continues from the same state.
- `destroy` releases RAF loops, listeners, renderer resources, object URLs, and WASM-owned handles.
- Route changes must call `destroy`.
- Tab hidden events must call `pause` or stop advancing simulation.

## Frame loop model

Planned model:

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

## Error handling

Failures must produce controlled states:

- WASM initialization failure -> readable fallback with direct links.
- Renderer failure -> readable fallback with direct links.
- Game launch URL missing -> disabled/locked prompt, not crash.
- Unexpected runtime exception -> error boundary and console diagnostics in development.
