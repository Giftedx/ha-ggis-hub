import { decodeSnapshot, type DecodedSnapshot, SNAPSHOT_BYTES } from './snapshot-codec';

export interface RoomDoorDefinition {
  readonly id: string;
  readonly status: 'launchable' | 'locked';
  readonly bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}

export interface RoomDefinition {
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly doors: readonly RoomDoorDefinition[];
}

export class HubBoundaryError extends Error {
  constructor(public readonly tag: number, message: string) {
    super(message);
    this.name = 'HubBoundaryError';
  }
}

export interface HubBoundary {
  readonly apiVersion: number;
  readonly room: RoomDefinition;
  tick(inputPacked: number): DecodedSnapshot;
  stateHash(): bigint;
  destroy(): void;
}

export interface GeneratedHubWasmModule {
  default(): Promise<unknown>;
  HubHandle: new (seed: bigint) => GeneratedHandle;
  hub_core_api_version(): number;
  memory: WebAssembly.Memory;
}

interface GeneratedHandle {
  tick(input_packed: number): number;
  snapshot_ptr(): number;
  snapshot_len(): number;
  state_hash(): bigint;
  room_definition(): string;
  error_message_ptr(): number;
  error_message_len(): number;
  free(): void;
}

export type HubWasmModuleLoader = () => Promise<GeneratedHubWasmModule>;

export async function initializeHubBoundaryV2(
  loadModule: HubWasmModuleLoader,
  seed: bigint
): Promise<HubBoundary> {
  const module = await loadModule();
  await module.default();
  const apiVersion = module.hub_core_api_version();
  const handle = new module.HubHandle(seed);
  const room = parseRoomDefinition(handle.room_definition());
  const snapshotBufferLen = handle.snapshot_len();
  if (snapshotBufferLen !== SNAPSHOT_BYTES) {
    handle.free();
    throw new HubBoundaryError(-1, `unexpected snapshot length ${snapshotBufferLen}`);
  }

  function snapshotBytes(): Uint8Array {
    const ptr = handle.snapshot_ptr();
    return new Uint8Array(module.memory.buffer, ptr, snapshotBufferLen);
  }

  function readErrorMessage(): string {
    const ptr = handle.error_message_ptr();
    const len = handle.error_message_len();
    const bytes = new Uint8Array(module.memory.buffer, ptr, len);
    return new TextDecoder().decode(bytes);
  }

  return {
    apiVersion,
    room,
    tick(inputPacked: number): DecodedSnapshot {
      const tag = handle.tick(inputPacked);
      if (tag !== 0) {
        throw new HubBoundaryError(tag, readErrorMessage());
      }
      // The snapshot buffer is shared with WASM linear memory; rebuild the
      // view in case memory was reallocated (which can happen if the
      // generated bindings grow the heap).
      return decodeSnapshot(snapshotBytes());
    },
    stateHash(): bigint {
      return handle.state_hash();
    },
    destroy(): void {
      handle.free();
    }
  };
}

function parseRoomDefinition(json: string): RoomDefinition {
  const parsed = JSON.parse(json) as {
    worldWidth: number;
    worldHeight: number;
    doors: ReadonlyArray<{
      id: string;
      status: number;
      boundsMinX: number;
      boundsMinY: number;
      boundsMaxX: number;
      boundsMaxY: number;
    }>;
  };
  return {
    worldWidth: parsed.worldWidth,
    worldHeight: parsed.worldHeight,
    doors: parsed.doors.map((d) => ({
      id: d.id,
      status: d.status === 1 ? 'launchable' : 'locked',
      bounds: { minX: d.boundsMinX, minY: d.boundsMinY, maxX: d.boundsMaxX, maxY: d.boundsMaxY }
    }))
  };
}
