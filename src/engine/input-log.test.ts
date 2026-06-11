import { describe, expect, it } from 'vitest';
import { InputLogWriter, INPUT_LOG_INTERACT_EDGE_FLAG, fnv1a64 } from './input-log';

const HEADER_LEN = 34;
const RECORD_LEN = 8;
const TRAILER_LEN = 20;

function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! |
      (bytes[offset + 1]! << 8) |
      (bytes[offset + 2]! << 16) |
      (bytes[offset + 3]! << 24)) >>>
    0
  );
}

function recordInputPacked(bytes: Uint8Array, recordIndex: number): number {
  return readU32(bytes, HEADER_LEN + recordIndex * RECORD_LEN + 4);
}

function recordCount(bytes: Uint8Array): number {
  return (bytes.byteLength - HEADER_LEN - TRAILER_LEN) / RECORD_LEN;
}

describe('InputLogWriter', () => {
  it('writes a HGLG header', () => {
    const writer = new InputLogWriter({
      seed: 7n,
      coreApiVersion: 1,
      startedAtUtcMs: 0n,
      initialStateHash: 0n,
    });
    const bytes = writer.finish(0, 0n);
    expect(bytes[0]).toBe(0x48); // H
    expect(bytes[1]).toBe(0x47); // G
    expect(bytes[2]).toBe(0x4c); // L
    expect(bytes[3]).toBe(0x47); // G
    expect(readU16(bytes, 4)).toBe(1);
  });

  it('only writes a record when input changes', () => {
    const writer = new InputLogWriter({
      seed: 0n,
      coreApiVersion: 1,
      startedAtUtcMs: 0n,
      initialStateHash: 0n,
    });
    writer.recordIfChanged(0, 0b0001);
    writer.recordIfChanged(1, 0b0001); // same — should not append
    writer.recordIfChanged(2, 0b0010);
    const bytes = writer.finish(3, 0n);
    // Header 34 + 2 records * 8 + trailer 20 = 70 bytes.
    expect(bytes.byteLength).toBe(70);
    expect(recordCount(bytes)).toBe(2);
    expect(recordInputPacked(bytes, 0)).toBe(0b0001);
    expect(recordInputPacked(bytes, 1)).toBe(0b0010);
  });

  it('records interact presses as a distinct packed input', () => {
    const writer = new InputLogWriter({
      seed: 0n,
      coreApiVersion: 1,
      startedAtUtcMs: 0n,
      initialStateHash: 0n,
    });
    writer.recordIfChanged(0, 0b0001);
    writer.recordIfChanged(1, 0b0001 | 0b1_0000);
    const bytes = writer.finish(2, 0n);
    expect(bytes.byteLength).toBe(70);
    expect(recordInputPacked(bytes, 0)).toBe(0b0001);
    expect(recordInputPacked(bytes, 1)).toBe(0b0001 | 0b1_0000);
  });

  it('records an interact-edge pulse even when held movement is unchanged', () => {
    const writer = new InputLogWriter({
      seed: 0n,
      coreApiVersion: 1,
      startedAtUtcMs: 0n,
      initialStateHash: 0n,
    });
    writer.recordTick(0, 0b0001);
    writer.recordTick(1, 0b0001, { interactEdge: true });
    writer.recordTick(2, 0b0001); // same core input and no pulse — should not append a clear record
    const bytes = writer.finish(3, 0n);
    expect(recordCount(bytes)).toBe(2);
    expect(recordInputPacked(bytes, 0)).toBe(0b0001);
    expect(recordInputPacked(bytes, 1)).toBe(INPUT_LOG_INTERACT_EDGE_FLAG | 0b0001);
    // Native movement replay masks the body u32 to the low 16-bit InputSnapshot.
    expect(recordInputPacked(bytes, 1) & 0xffff).toBe(0b0001);
  });

  it('treats idle as the initial state and does not record idle frames before any input', () => {
    const writer = new InputLogWriter({
      seed: 0n,
      coreApiVersion: 1,
      startedAtUtcMs: 0n,
      initialStateHash: 0n,
    });
    writer.recordIfChanged(0, 0); // idle == initial assumption, do not append
    writer.recordIfChanged(1, 0);
    writer.recordIfChanged(2, 0);
    const bytes = writer.finish(3, 0n);
    // Header 34 + 0 records + trailer 20 = 54 bytes.
    expect(bytes.byteLength).toBe(54);
    expect(recordCount(bytes)).toBe(0);
  });

  it('finish() is idempotent — calling it twice produces identical output without double-trailer corruption', () => {
    const writer = new InputLogWriter({
      seed: 42n,
      coreApiVersion: 1,
      startedAtUtcMs: 0n,
      initialStateHash: 0n,
    });
    writer.recordIfChanged(0, 0b0001);
    const first = writer.finish(1, 0xdeadbeefn);
    const second = writer.finish(1, 0xdeadbeefn);
    expect(first.byteLength).toBe(second.byteLength);
    expect(Array.from(first)).toEqual(Array.from(second));
  });
});

describe('fnv1a64', () => {
  // The .haggislog digest is a fourth hand-rolled FNV-1a 64, alongside Rust
  // (hub-core), C (hub-hardlang), and Go (haggis-eval). Pin it to the published
  // Fowler/Noll/Vo reference vectors — the same external truth that
  // crates/hub-core/src/hash.rs asserts — so all four implementations are
  // proven to agree byte-for-byte, not merely assumed to.
  const bytesOf = (s: string): number[] => Array.from(s, (c) => c.charCodeAt(0));

  it('matches the published FNV-1a 64 reference vectors', () => {
    expect(fnv1a64([])).toBe(0xcbf29ce484222325n);
    expect(fnv1a64(bytesOf('a'))).toBe(0xaf63dc4c8601ec8cn);
    expect(fnv1a64(bytesOf('foobar'))).toBe(0x85944171f73967e8n);
    expect(fnv1a64(bytesOf('chongo was here!\n'))).toBe(0x46810940eff5f915n);
  });
});
