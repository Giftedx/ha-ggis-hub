import type { HubCoreWorld, HubInputVector, HubInteraction, HubPlayerState } from '../wasm/boundary';

export interface HubRoomWorldSize {
  readonly width: number;
  readonly height: number;
}

export interface HubRoomBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type HubRoomDoorStatus = 'launchable' | 'locked';

export interface HubRoomDoor {
  readonly id: string;
  readonly title: string;
  readonly status: HubRoomDoorStatus;
  readonly bounds: HubRoomBounds;
}

export interface HubRoomRenderSnapshot {
  readonly world: HubRoomWorldSize;
  readonly player: HubPlayerState;
  readonly doors: readonly HubRoomDoor[];
  readonly interaction: HubInteraction;
}

export interface HubRoomRenderer {
  render(snapshot: HubRoomRenderSnapshot): void;
}

export interface HubRoomInputSource {
  snapshot(): HubInputVector;
}

export interface HubRoomControllerOptions {
  readonly world: HubCoreWorld;
  readonly doors: readonly HubRoomDoor[];
  readonly renderer: HubRoomRenderer;
  readonly input: HubRoomInputSource;
  readonly initialPlayer: HubPlayerState;
  readonly worldSize?: HubRoomWorldSize;
}

export interface HubRoomController {
  tick(): void;
  render(): void;
  player(): HubPlayerState;
}

export const DEFAULT_HUB_ROOM_DOORS: readonly HubRoomDoor[] = [
  {
    id: 'wild-haggis-survivors',
    title: 'Wild Haggis Survivors',
    status: 'launchable',
    bounds: { x: 820, y: 420, width: 120, height: 160 }
  },
  {
    id: 'future-bothy',
    title: 'Future Bothy',
    status: 'locked',
    bounds: { x: 80, y: 420, width: 120, height: 160 }
  }
];

const DEFAULT_WORLD_SIZE: HubRoomWorldSize = { width: 1_000, height: 1_000 };

export function createHubRoomController(options: HubRoomControllerOptions): HubRoomController {
  let player = options.initialPlayer;
  const worldSize = options.worldSize ?? DEFAULT_WORLD_SIZE;

  function snapshot(): HubRoomRenderSnapshot {
    return {
      world: worldSize,
      player,
      doors: options.doors,
      interaction: options.world.interactionFor(player)
    };
  }

  return {
    tick(): void {
      player = options.world.tickPlayer(player, options.input.snapshot());
      options.renderer.render(snapshot());
    },
    render(): void {
      options.renderer.render(snapshot());
    },
    player(): HubPlayerState {
      return player;
    }
  };
}
