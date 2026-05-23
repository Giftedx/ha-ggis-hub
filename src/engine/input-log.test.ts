import { describe, expect, it } from 'vitest';
import { InputLogWriter } from './input-log';

describe('InputLogWriter', () => {
  it('writes a HGLG header', () => {
    const writer = new InputLogWriter({
      seed: 7n,
      coreApiVersion: 1,
      startedAtUtcMs: 0n,
      initialStateHash: 0n
    });
    const bytes = writer.finish(0, 0n);
    expect(bytes[0]).toBe(0x48); // H
    expect(bytes[1]).toBe(0x47); // G
    expect(bytes[2]).toBe(0x4c); // L
    expect(bytes[3]).toBe(0x47); // G
  });

  it('only writes a record when input changes', () => {
    const writer = new InputLogWriter({
      seed: 0n,
      coreApiVersion: 1,
      startedAtUtcMs: 0n,
      initialStateHash: 0n
    });
    writer.recordIfChanged(0, 0b0001);
    writer.recordIfChanged(1, 0b0001); // same — should not append
    writer.recordIfChanged(2, 0b0010);
    const bytes = writer.finish(3, 0n);
    // Header 34 + 2 records * 8 + trailer 20 = 70 bytes.
    expect(bytes.byteLength).toBe(70);
  });
});
