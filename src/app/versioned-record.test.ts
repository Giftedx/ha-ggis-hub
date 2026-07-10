import { describe, expect, it } from 'vitest';
import { createStoredRecordStore, createVersionedRecordCodec } from './versioned-record';

// Sample codec used across the suite: current schema 3 with a single
// numeric field, plus a schema-2 migration that renames `tally` → count.
// Small on purpose — the suite pins the envelope/migration contract, not
// any real hub record (settings.ts and progress.ts own their own tests).
interface Sample {
  readonly count: number;
}

function createSampleCodec(
  migrations?: readonly ((record: Record<string, unknown>) => Sample | null)[]
) {
  return createVersionedRecordCodec<Sample>({
    schema: 3,
    defaults: () => ({ count: 0 }),
    normalize: (record) =>
      Number.isSafeInteger(record.count) && Number(record.count) >= 0
        ? { count: Number(record.count) }
        : null,
    payloadOf: (value) => ({ count: value.count }),
    migrations,
  });
}

const migrateV2 = (record: Record<string, unknown>): Sample | null =>
  record.schema === 2 && Number.isSafeInteger(record.tally) && Number(record.tally) >= 0
    ? { count: Number(record.tally) }
    : null;

describe('createVersionedRecordCodec', () => {
  it('returns defaults when no record is stored', () => {
    expect(createSampleCodec().load(null)).toEqual({ count: 0 });
  });

  it('returns defaults when the stored value is not parseable JSON', () => {
    expect(createSampleCodec().load('{"schema":3')).toEqual({ count: 0 });
  });

  it('returns defaults when the stored JSON is not an object record', () => {
    const codec = createSampleCodec();
    expect(codec.load('42')).toEqual({ count: 0 });
    expect(codec.load('[1,2]')).toEqual({ count: 0 });
    expect(codec.load('null')).toEqual({ count: 0 });
  });

  it('round-trips a serialized value through load', () => {
    const codec = createSampleCodec();
    expect(codec.load(codec.serialize({ count: 7 }))).toEqual({ count: 7 });
  });

  it('serializes schema-first with the FNV digest as the final field', () => {
    // Envelope layout is a stability contract: consumers golden-pin exact
    // strings, so key order (schema, payload…, digest) must never drift.
    const stored = JSON.parse(createSampleCodec().serialize({ count: 7 })) as Record<
      string,
      unknown
    >;
    expect(Object.keys(stored)).toEqual(['schema', 'count', 'digest']);
    expect(stored.schema).toBe(3);
    expect(stored.digest).toMatch(/^[a-f0-9]{16}$/);
  });

  it('returns defaults when the payload was tampered after signing', () => {
    const codec = createSampleCodec();
    const stored = JSON.parse(codec.serialize({ count: 7 })) as { count: number };
    stored.count = 9;
    expect(codec.load(JSON.stringify(stored))).toEqual({ count: 0 });
  });

  it('returns defaults when the digest field is wrong or missing', () => {
    const codec = createSampleCodec();
    const stored = JSON.parse(codec.serialize({ count: 7 })) as { digest: string };
    stored.digest = '0000000000000000';
    expect(codec.load(JSON.stringify(stored))).toEqual({ count: 0 });

    expect(codec.load(JSON.stringify({ schema: 3, count: 7 }))).toEqual({ count: 0 });
    expect(codec.load(JSON.stringify({ schema: 3, count: 7, digest: 12 }))).toEqual({ count: 0 });
  });

  it('returns defaults when the current-schema payload fails normalization', () => {
    const codec = createSampleCodec();
    expect(codec.load(JSON.stringify({ schema: 3, count: -1, digest: 'x' }))).toEqual({
      count: 0,
    });
  });

  it('dispatches non-current schemas through migrations in order', () => {
    const codec = createSampleCodec([migrateV2]);
    expect(codec.load(JSON.stringify({ schema: 2, tally: 5 }))).toEqual({ count: 5 });
  });

  it('takes the first migration that accepts the record', () => {
    const rejectAll = (): Sample | null => null;
    const codec = createSampleCodec([rejectAll, migrateV2]);
    expect(codec.load(JSON.stringify({ schema: 2, tally: 5 }))).toEqual({ count: 5 });
  });

  it('returns defaults when no migration accepts a non-current schema', () => {
    expect(createSampleCodec([migrateV2]).load(JSON.stringify({ schema: 1, tally: 5 }))).toEqual({
      count: 0,
    });
    // No migrations configured at all.
    expect(createSampleCodec().load(JSON.stringify({ schema: 2, tally: 5 }))).toEqual({
      count: 0,
    });
  });

  it('does not consult migrations for a valid current-schema record', () => {
    const explode = (): Sample | null => {
      throw new Error('migration must not run for current schema');
    };
    const codec = createSampleCodec([explode]);
    expect(codec.load(codec.serialize({ count: 4 }))).toEqual({ count: 4 });
  });

  it('exposes digestForRecord so migrations can verify old-envelope digests', () => {
    // A v1→v2 migration needs to check the digest the v1 era wrote. The
    // codec exposes its canonical digest so eras share one implementation.
    const codec = createSampleCodec();
    const stored = JSON.parse(codec.serialize({ count: 7 })) as {
      schema: number;
      count: number;
      digest: string;
    };
    expect(codec.digestForRecord({ schema: stored.schema, count: stored.count })).toBe(
      stored.digest
    );
  });
});

class FakeStorage {
  readonly values = new Map<string, string>();
  throwOnGet = false;
  throwOnSet = false;

  getItem(key: string): string | null {
    if (this.throwOnGet) throw new DOMException('blocked', 'SecurityError');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw new DOMException('full', 'QuotaExceededError');
    this.values.set(key, value);
  }
}

describe('createStoredRecordStore', () => {
  const KEY = 'ggis_test_record';

  it('round-trips a value through the backing storage under its key', () => {
    const storage = new FakeStorage();
    const store = createStoredRecordStore(KEY, createSampleCodec(), storage);

    store.save({ count: 7 });

    expect([...storage.values.keys()]).toEqual([KEY]);
    expect(store.load()).toEqual({ count: 7 });
  });

  it('loads defaults and swallows saves when storage is absent', () => {
    // Private browsing / blocked storage: the record is a convenience and
    // must never block hub startup.
    for (const storage of [null, undefined]) {
      const store = createStoredRecordStore(KEY, createSampleCodec(), storage);
      expect(store.load()).toEqual({ count: 0 });
      expect(() => {
        store.save({ count: 7 });
      }).not.toThrow();
    }
  });

  it('degrades to defaults when the backing storage throws', () => {
    const storage = new FakeStorage();
    storage.throwOnGet = true;
    storage.throwOnSet = true;
    const store = createStoredRecordStore(KEY, createSampleCodec(), storage);

    expect(store.load()).toEqual({ count: 0 });
    expect(() => {
      store.save({ count: 7 });
    }).not.toThrow();
  });
});
