import { GAME_ID_PATTERN } from '../games/registry';
import {
  createStoredRecordStore,
  createVersionedRecordCodec,
  isRecord,
  type RecordStorage,
  type StoredRecordStore,
} from './versioned-record';

// Hub progress save — the `ggis_hub_save` key reserved since the foundation
// docs and deferred until the hub had progress worth saving (ADR-0008). The
// bothy now remembers three things about a visitor: how often they've come
// by, how often they've chapped the locked door, and which doors they've
// actually gone through. All host-side: none of this enters the Rust sim,
// so the deterministic state hash and replay contract are untouched.

export const HUB_PROGRESS_KEY = 'ggis_hub_save';

const HUB_PROGRESS_SCHEMA = 1;

export interface HubProgress {
  /** Completed hub loads, counted once per mount. 2+ means a returning visitor. */
  readonly visits: number;
  /** Lifetime chaps on the coming-soon door; drives the persistent retort rotation. */
  readonly lockedChaps: number;
  /** Game id → times the visitor has gone through that door. */
  readonly doorEntries: Readonly<Record<string, number>>;
}

export type HubProgressStore = StoredRecordStore<HubProgress>;

export function createDefaultHubProgress(): HubProgress {
  return {
    visits: 0,
    lockedChaps: 0,
    doorEntries: {},
  };
}

const hubProgressCodec = createVersionedRecordCodec<HubProgress>({
  schema: HUB_PROGRESS_SCHEMA,
  defaults: createDefaultHubProgress,
  normalize: normalizeProgressFields,
  payloadOf: (progress) => ({
    ...(normalizeProgressFields({ ...progress }) ?? createDefaultHubProgress()),
  }),
});

export function createHubProgressStore(storage?: RecordStorage | null): HubProgressStore {
  return createStoredRecordStore(HUB_PROGRESS_KEY, hubProgressCodec, storage);
}

export function serializeHubProgressForStorage(progress: HubProgress): string {
  return hubProgressCodec.serialize(progress);
}

export function recordVisit(progress: HubProgress): HubProgress {
  return { ...progress, visits: progress.visits + 1 };
}

export function recordLockedChap(progress: HubProgress): HubProgress {
  return { ...progress, lockedChaps: progress.lockedChaps + 1 };
}

export function recordDoorEntry(progress: HubProgress, doorId: string): HubProgress {
  return {
    ...progress,
    doorEntries: {
      ...progress.doorEntries,
      [doorId]: (progress.doorEntries[doorId] ?? 0) + 1,
    },
  };
}

function normalizeProgressFields(record: Record<string, unknown>): HubProgress | null {
  const visits = normalizeCount(record.visits);
  const lockedChaps = normalizeCount(record.lockedChaps);
  const doorEntries = normalizeDoorEntries(record.doorEntries);
  if (visits === null || lockedChaps === null || doorEntries === null) {
    return null;
  }
  return { visits, lockedChaps, doorEntries };
}

function normalizeCount(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function normalizeDoorEntries(value: unknown): Readonly<Record<string, number>> | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries: Record<string, number> = {};
  for (const [id, count] of Object.entries(value)) {
    // Zero-entry doors are omitted rather than stored, so a stored zero (or
    // any non-positive count) is corruption, not a valid tally.
    if (!GAME_ID_PATTERN.test(id) || !Number.isSafeInteger(count) || Number(count) < 1) {
      return null;
    }
    entries[id] = Number(count);
  }
  return entries;
}
