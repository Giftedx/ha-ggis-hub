import { fnv1a64 } from '../engine/fnv';

// Versioned storage envelope shared by every hub-owned browser record
// (ggis_hub_settings, ggis_hub_save). One place owns the contract:
//
//   { "schema": <number>, ...payload, "digest": <fnv1a64 hex16> }
//
// The digest is keyless FNV-1a over the canonical JSON of the record
// WITHOUT the digest field — tamper-evident against accidental corruption,
// not a cryptographic signature (same posture as the haggis-eval reports).
// Any invalid, corrupt, or foreign-schema record degrades to defaults; a
// bad save must never block hub startup.
//
// Migrations map an old stored record DIRECTLY to the current value shape
// (rather than chaining schema→schema transforms) — with one or two live
// versions per record, a flat table is the honest amount of machinery.
// Each migration owns its own era's validation, including digest checks
// via `digestForRecord` for eras that signed their payloads.

export interface VersionedRecordCodec<T> {
  /** Parse a stored string (or null) into a value; defaults on any failure. */
  load(raw: string | null): T;
  /** Serialize a value into the current-schema signed envelope. */
  serialize(value: T): string;
  /** Canonical digest of a digest-less record, for migrations verifying old envelopes. */
  digestForRecord(record: Record<string, unknown>): string;
}

export interface VersionedRecordConfig<T> {
  /** Current schema number written by serialize. */
  readonly schema: number;
  readonly defaults: () => T;
  /** Validate + normalize a current-schema stored record into a value; null rejects. */
  readonly normalize: (record: Record<string, unknown>) => T | null;
  /** Project a value into the stored payload fields (everything between schema and digest). */
  readonly payloadOf: (value: T) => Record<string, unknown>;
  /** Direct old-record → current-value migrations, tried in order; first non-null wins. */
  readonly migrations?: readonly ((record: Record<string, unknown>) => T | null)[] | undefined;
}

export function createVersionedRecordCodec<T>(
  config: VersionedRecordConfig<T>
): VersionedRecordCodec<T> {
  function digestForRecord(record: Record<string, unknown>): string {
    const canonical = JSON.stringify(record);
    const bytes = Array.from(new TextEncoder().encode(canonical));
    return fnv1a64(bytes).toString(16).padStart(16, '0');
  }

  function parseCurrent(record: Record<string, unknown>): T | null {
    if (typeof record.digest !== 'string') {
      return null;
    }
    const value = config.normalize(record);
    if (value === null) {
      return null;
    }
    const signed = { schema: config.schema, ...config.payloadOf(value) };
    if (record.digest !== digestForRecord(signed)) {
      return null;
    }
    return value;
  }

  function migrate(record: Record<string, unknown>): T | null {
    for (const migration of config.migrations ?? []) {
      const migrated = migration(record);
      if (migrated !== null) {
        return migrated;
      }
    }
    return null;
  }

  return {
    load(raw: string | null): T {
      if (raw === null) {
        return config.defaults();
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return config.defaults();
      }
      if (!isRecord(parsed)) {
        return config.defaults();
      }
      const value = parsed.schema === config.schema ? parseCurrent(parsed) : migrate(parsed);
      return value ?? config.defaults();
    },

    serialize(value: T): string {
      const signed = { schema: config.schema, ...config.payloadOf(value) };
      return JSON.stringify({ ...signed, digest: digestForRecord(signed) });
    },

    digestForRecord,
  };
}

/** Minimal storage surface (subset of DOM Storage) so tests can fake it. */
export interface RecordStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StoredRecordStore<T> {
  load(): T;
  save(value: T): void;
}

/** Bind a codec to a browser-storage key. Absent or throwing storage degrades
 *  to defaults on load and silently drops saves — stored records are a
 *  convenience and must never block hub startup. */
export function createStoredRecordStore<T>(
  key: string,
  codec: VersionedRecordCodec<T>,
  storage: RecordStorage | null | undefined
): StoredRecordStore<T> {
  return {
    load(): T {
      if (storage === undefined || storage === null) {
        return codec.load(null);
      }
      try {
        return codec.load(storage.getItem(key));
      } catch {
        return codec.load(null);
      }
    },

    save(value: T): void {
      if (storage === undefined || storage === null) {
        return;
      }
      try {
        storage.setItem(key, codec.serialize(value));
      } catch {
        // Blocked or quota-full storage: drop the save, keep the hub running.
      }
    },
  };
}

/** Narrow a parsed JSON value to a plain object record. Exported so record
 *  modules can validate nested payload objects with the same rule. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
