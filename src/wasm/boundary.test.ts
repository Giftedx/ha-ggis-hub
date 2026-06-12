import { describe, expect, it } from 'vitest';
import { HubBoundaryError, initializeHubBoundaryV2 } from './boundary';
import { SNAPSHOT_BYTES } from './snapshot-codec';

function makeStubModule(): {
  loader: () => Promise<any>;
  memory: WebAssembly.Memory;
} {
  const memory = new WebAssembly.Memory({ initial: 1 });
  const snapshotPtr = 0;
  const snapshotBuf = new Uint8Array(memory.buffer, snapshotPtr, SNAPSHOT_BYTES);
  const view = new DataView(snapshotBuf.buffer, snapshotBuf.byteOffset, snapshotBuf.byteLength);
  view.setInt32(0, 500, true); // player x
  view.setInt32(4, 500, true); // player y
  view.setInt32(12, 1000, true); // world w
  view.setInt32(16, 1000, true); // world h
  view.setInt32(28, 0, true); // door count = 0

  let lastError = '';
  const HubHandle = class {
    constructor(_seed: bigint) {}
    tick(input: number): number {
      if (input > 0xffff) {
        lastError = 'bad';
        return 1;
      }
      return 0;
    }
    snapshot_ptr(): number {
      return snapshotPtr;
    }
    snapshot_len(): number {
      return SNAPSHOT_BYTES;
    }
    state_hash(): bigint {
      return 0xdeadbeefn;
    }
    room_definition(): string {
      return '{"worldWidth":1000,"worldHeight":1000,"doors":[]}';
    }
    error_message_ptr(): number {
      const errBuf = new TextEncoder().encode(lastError);
      const dst = new Uint8Array(memory.buffer, SNAPSHOT_BYTES, errBuf.length);
      dst.set(errBuf);
      return SNAPSHOT_BYTES;
    }
    error_message_len(): number {
      return new TextEncoder().encode(lastError).length;
    }
    free(): void {}
  };

  return {
    loader: async () => ({
      // Mirror wasm-bindgen: `default` returns the live instance exports
      // including `memory`. The module namespace itself does not expose
      // memory directly.
      default: async () => ({ memory }),
      HubHandle,
      hub_core_api_version: () => 1,
      replay_run: (logBytes: Uint8Array) => BigInt(logBytes.byteLength),
    }),
    memory,
  };
}

describe('initializeHubBoundaryV2', () => {
  it('reports the API version and the room definition', async () => {
    const { loader } = makeStubModule();
    const boundary = await initializeHubBoundaryV2(loader, 0n);
    expect(boundary.apiVersion).toBe(1);
    expect(boundary.room.worldWidth).toBe(1000);
    expect(boundary.room.doors).toHaveLength(0);
  });

  it('reads the snapshot zero-copy from linear memory', async () => {
    const { loader } = makeStubModule();
    const boundary = await initializeHubBoundaryV2(loader, 0n);
    const snapshot = boundary.tick(0);
    expect(snapshot.playerX).toBe(500);
    expect(snapshot.playerY).toBe(500);
    expect(snapshot.worldWidth).toBe(1000);
  });

  it('snapshot() returns the current state without advancing the simulation', async () => {
    const { loader } = makeStubModule();
    const boundary = await initializeHubBoundaryV2(loader, 0n);
    const snapshotDirect = boundary.snapshot();
    expect(snapshotDirect.playerX).toBe(500);
    expect(snapshotDirect.worldWidth).toBe(1000);
  });

  it('throws HubBoundaryError when tick returns a non-zero tag', async () => {
    const { loader } = makeStubModule();
    const boundary = await initializeHubBoundaryV2(loader, 0n);
    expect(() => boundary.tick(0x10000)).toThrow(HubBoundaryError);
  });

  it('throws HubBoundaryError with tag -1 when snapshot buffer length is wrong', async () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const HubHandle = class {
      constructor(_seed: bigint) {}
      tick(): number {
        return 0;
      }
      snapshot_ptr(): number {
        return 0;
      }
      snapshot_len(): number {
        return 1;
      } // wrong — should be SNAPSHOT_BYTES
      state_hash(): bigint {
        return 0n;
      }
      room_definition(): string {
        return '{"worldWidth":1,"worldHeight":1,"doors":[]}';
      }
      error_message_ptr(): number {
        return 0;
      }
      error_message_len(): number {
        return 0;
      }
      free(): void {}
    };
    const loader = async () => ({
      default: async () => ({ memory }),
      HubHandle,
      hub_core_api_version: () => 1,
      replay_run: () => 0n,
    });
    await expect(initializeHubBoundaryV2(loader, 0n)).rejects.toThrow(HubBoundaryError);
  });

  it('returns correct room definition including doors', async () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const snapshotBuf = new Uint8Array(memory.buffer, 0, SNAPSHOT_BYTES);
    const view = new DataView(snapshotBuf.buffer, 0, snapshotBuf.byteLength);
    view.setInt32(0, 100, true);
    view.setInt32(4, 200, true);
    view.setInt32(12, 540, true);
    view.setInt32(16, 360, true);
    view.setInt32(28, 0, true);
    const HubHandle = class {
      constructor(_seed: bigint) {}
      tick(): number {
        return 0;
      }
      snapshot_ptr(): number {
        return 0;
      }
      snapshot_len(): number {
        return SNAPSHOT_BYTES;
      }
      state_hash(): bigint {
        return 42n;
      }
      room_definition(): string {
        return JSON.stringify({
          worldWidth: 540,
          worldHeight: 360,
          doors: [
            { id: 'whs', status: 1, boundsMinX: 0, boundsMinY: 0, boundsMaxX: 10, boundsMaxY: 10 },
          ],
        });
      }
      error_message_ptr(): number {
        return 0;
      }
      error_message_len(): number {
        return 0;
      }
      free(): void {}
    };
    const loader = async () => ({
      default: async () => ({ memory }),
      HubHandle,
      hub_core_api_version: () => 2,
      replay_run: () => 0n,
    });
    const boundary = await initializeHubBoundaryV2(loader, 0n);
    expect(boundary.room.doors).toHaveLength(1);
    expect(boundary.room.doors[0]?.id).toBe('whs');
    expect(boundary.room.doors[0]?.status).toBe('launchable');
    expect(boundary.stateHash()).toBe(42n);
  });

  it('parses a locked door (status !== 1) from room_definition JSON', async () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const view = new DataView(memory.buffer, 0, SNAPSHOT_BYTES);
    view.setInt32(12, 1000, true); // worldWidth
    view.setInt32(16, 1000, true); // worldHeight
    view.setInt32(28, 0, true); // door count in snapshot (independent of room def)
    const HubHandle = class {
      constructor(_seed: bigint) {}
      tick(): number {
        return 0;
      }
      snapshot_ptr(): number {
        return 0;
      }
      snapshot_len(): number {
        return SNAPSHOT_BYTES;
      }
      state_hash(): bigint {
        return 0n;
      }
      room_definition(): string {
        return JSON.stringify({
          worldWidth: 1000,
          worldHeight: 1000,
          // status=0 → parseRoomDefinition maps to 'locked' (the d.status !== 1 branch)
          doors: [
            {
              id: 'locked-door',
              status: 0,
              boundsMinX: 0,
              boundsMinY: 0,
              boundsMaxX: 10,
              boundsMaxY: 10,
            },
          ],
        });
      }
      error_message_ptr(): number {
        return 0;
      }
      error_message_len(): number {
        return 0;
      }
      free(): void {}
    };
    const loader = async () => ({
      default: async () => ({ memory }),
      HubHandle,
      hub_core_api_version: () => 1,
      replay_run: () => 0n,
    });
    const boundary = await initializeHubBoundaryV2(loader, 0n);
    expect(boundary.room.doors[0]?.status).toBe('locked');
  });

  it('delegates replayLog byte buffers to the generated replay_run export', async () => {
    const { loader } = makeStubModule();
    const boundary = await initializeHubBoundaryV2(loader, 0n);
    expect(boundary.replayLog(new Uint8Array([1, 2, 3]))).toBe(3n);
  });

  it('frees the handle on destroy', async () => {
    const { loader } = makeStubModule();
    const freed: number[] = [];
    const origLoader = await loader();
    const patchedLoader = async () => ({
      ...origLoader,
      HubHandle: class extends origLoader.HubHandle {
        free(): void {
          freed.push(1);
        }
      },
    });
    const boundary = await initializeHubBoundaryV2(patchedLoader, 0n);
    boundary.destroy();
    expect(freed).toHaveLength(1);
  });
});
