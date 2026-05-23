import { describe, expect, it } from 'vitest';
import { SNAPSHOT_BYTES, decodeSnapshot } from './snapshot-codec';

function emptyBuffer(): Uint8Array {
  return new Uint8Array(SNAPSHOT_BYTES);
}

function writeI32LE(buffer: Uint8Array, offset: number, value: number): void {
  new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).setInt32(offset, value, true);
}

function writeAsciiId(buffer: Uint8Array, offset: number, id: string): void {
  for (let i = 0; i < id.length; i += 1) buffer[offset + i] = id.charCodeAt(i);
}

describe('decodeSnapshot', () => {
  it('rejects buffers of the wrong length', () => {
    expect(() => decodeSnapshot(new Uint8Array(10))).toThrow(/SNAPSHOT_BYTES|must be/);
  });

  it('reads header fields and door count', () => {
    const buf = emptyBuffer();
    writeI32LE(buf, 0, 500); // player x
    writeI32LE(buf, 4, 500); // player y
    writeI32LE(buf, 8, 80); // half extent
    writeI32LE(buf, 12, 1000); // world w
    writeI32LE(buf, 16, 1000); // world h
    writeI32LE(buf, 20, 1); // interaction launchable
    writeI32LE(buf, 24, 0); // door index
    writeI32LE(buf, 28, 1); // door count = 1
    writeAsciiId(buf, 32, 'wild-haggis-survivors');
    writeI32LE(buf, 32 + 32, 820);
    writeI32LE(buf, 32 + 32 + 4, 420);
    writeI32LE(buf, 32 + 32 + 8, 940);
    writeI32LE(buf, 32 + 32 + 12, 580);
    writeI32LE(buf, 32 + 32 + 16, 1); // launchable

    const decoded = decodeSnapshot(buf);
    expect(decoded.playerX).toBe(500);
    expect(decoded.worldWidth).toBe(1000);
    expect(decoded.interactionKind).toBe('launchable');
    expect(decoded.doors).toHaveLength(1);
    expect(decoded.doors[0]).toEqual({
      id: 'wild-haggis-survivors',
      status: 'launchable',
      bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 }
    });
  });
});
