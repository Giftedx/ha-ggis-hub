export interface HubPlayerState {
  readonly x: number;
  readonly y: number;
  readonly halfExtent: number;
  readonly speedPerTick: number;
}

export interface HubInputVector {
  readonly x: number;
  readonly y: number;
}

export type HubInteractionKind = 'none' | 'launchable' | 'locked';

export interface HubInteraction {
  readonly kind: HubInteractionKind;
  readonly id: string;
  readonly title: string;
}

export interface HubCoreIdentity {
  readonly projectName: string;
  readonly apiVersion: number;
}

export interface HubCoreWorld {
  tickPlayer(player: HubPlayerState, input: HubInputVector): HubPlayerState;
  interactionFor(player: HubPlayerState): HubInteraction;
}

export interface InitializedHubCore {
  readonly identity: HubCoreIdentity;
  readonly world: HubCoreWorld;
}

interface GeneratedPlayerSnapshot {
  x(): number;
  y(): number;
  half_extent(): number;
  speed_per_tick(): number;
  free(): void;
}

interface GeneratedInteractionSnapshot {
  kind(): number;
  id(): string;
  title(): string;
  free(): void;
}

interface GeneratedHubWorld {
  tick_player(
    x: number,
    y: number,
    halfExtent: number,
    speedPerTick: number,
    inputX: number,
    inputY: number
  ): GeneratedPlayerSnapshot;
  interaction_for(x: number, y: number, halfExtent: number, speedPerTick: number): GeneratedInteractionSnapshot;
}

export interface GeneratedHubWasmModule {
  hub_core_api_version(): number;
  hub_core_project_name(): string;
  create_demo_world(): GeneratedHubWorld;
}

export type HubWasmModuleLoader = () => Promise<GeneratedHubWasmModule>;

export class HubWasmInitializationError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('Unable to initialize ha.ggis Hub core WASM module');
    this.name = 'HubWasmInitializationError';
    this.cause = cause;
  }
}

export async function initializeHubCore(loadModule: HubWasmModuleLoader): Promise<InitializedHubCore> {
  try {
    const generated = await loadModule();
    const world = generated.create_demo_world();

    return {
      identity: {
        projectName: generated.hub_core_project_name(),
        apiVersion: generated.hub_core_api_version()
      },
      world: {
        tickPlayer(player: HubPlayerState, input: HubInputVector): HubPlayerState {
          const snapshot = world.tick_player(
            player.x,
            player.y,
            player.halfExtent,
            player.speedPerTick,
            input.x,
            input.y
          );

          return playerSnapshotFromGenerated(snapshot);
        },
        interactionFor(player: HubPlayerState): HubInteraction {
          return interactionFromGenerated(
            world.interaction_for(player.x, player.y, player.halfExtent, player.speedPerTick)
          );
        }
      }
    };
  } catch (error: unknown) {
    throw new HubWasmInitializationError(error);
  }
}

function playerSnapshotFromGenerated(snapshot: GeneratedPlayerSnapshot): HubPlayerState {
  try {
    return {
      x: snapshot.x(),
      y: snapshot.y(),
      halfExtent: snapshot.half_extent(),
      speedPerTick: snapshot.speed_per_tick()
    };
  } finally {
    snapshot.free();
  }
}

function interactionFromGenerated(snapshot: GeneratedInteractionSnapshot): HubInteraction {
  try {
    return {
      kind: interactionKindFromGenerated(snapshot.kind()),
      id: snapshot.id(),
      title: snapshot.title()
    };
  } finally {
    snapshot.free();
  }
}

function interactionKindFromGenerated(kind: number): HubInteractionKind {
  switch (kind) {
    case 0:
      return 'none';
    case 1:
      return 'launchable';
    case 2:
      return 'locked';
    default:
      throw new Error(`Unknown hub interaction kind from WASM: ${kind}`);
  }
}
