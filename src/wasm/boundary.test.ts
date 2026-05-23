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
      default: async () => undefined,
      HubHandle,
      hub_core_api_version: () => 1,
      memory
    }),
    memory
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

  it('throws HubBoundaryError when tick returns a non-zero tag', async () => {
    const { loader } = makeStubModule();
    const boundary = await initializeHubBoundaryV2(loader, 0n);
    expect(() => boundary.tick(0x10000)).toThrow(HubBoundaryError);
  });
});
