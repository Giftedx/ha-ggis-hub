import {
  createStoredRecordStore,
  createVersionedRecordCodec,
  isRecord,
  type RecordStorage,
  type StoredRecordStore,
} from './versioned-record';

export const HUB_SETTINGS_KEY = 'ggis_hub_settings';

const HUB_SETTINGS_SCHEMA = 2;

export interface HubSettings {
  readonly music: {
    readonly enabled: boolean;
    readonly trackIndex: number;
  };
  readonly sfx: {
    readonly enabled: boolean;
  };
}

export type HubSettingsStore = StoredRecordStore<HubSettings>;

export function createDefaultHubSettings(): HubSettings {
  return {
    music: {
      enabled: false,
      trackIndex: 0,
    },
    // Interaction feedback (the chap knock) defaults ON: it only ever plays
    // inside the visitor's own chap gesture, unlike ambient music which
    // stays strictly opt-in. The toggle persists an opt-out.
    sfx: {
      enabled: true,
    },
  };
}

// Envelope + digest + migration handling lives in the shared versioned-record
// codec; this module owns only what a settings payload MEANS: the music and
// sfx fields, their validation, and the older stored shapes.
const hubSettingsCodec = createVersionedRecordCodec<HubSettings>({
  schema: HUB_SETTINGS_SCHEMA,
  defaults: createDefaultHubSettings,
  normalize: (record) => {
    const music = normalizeMusicSettings(record.music);
    const sfx = normalizeSfxSettings(record.sfx);
    return music === null || sfx === null ? null : { music, sfx };
  },
  payloadOf: (settings) => ({
    music: normalizeMusicSettings(settings.music) ?? createDefaultHubSettings().music,
    sfx: normalizeSfxSettings(settings.sfx) ?? createDefaultHubSettings().sfx,
  }),
  migrations: [migrateV1Settings, migrateLegacySettings],
});

export function createHubSettingsStore(storage?: RecordStorage | null): HubSettingsStore {
  return createStoredRecordStore(HUB_SETTINGS_KEY, hubSettingsCodec, storage);
}

export function serializeHubSettingsForStorage(settings: HubSettings): string {
  return hubSettingsCodec.serialize(settings);
}

/** Schema 1 (2026-06-27 → 2026-07-10): `{ schema: 1, music, digest }` — the
 *  music-only envelope. Its digest is verified against the v1 canonical form
 *  before migrating; sfx did not exist yet and defaults on. */
function migrateV1Settings(record: Record<string, unknown>): HubSettings | null {
  if (record.schema !== 1 || typeof record.digest !== 'string') {
    return null;
  }
  const music = normalizeMusicSettings(record.music);
  if (music === null) {
    return null;
  }
  if (record.digest !== hubSettingsCodec.digestForRecord({ schema: 1, music })) {
    return null;
  }
  return { music, sfx: createDefaultHubSettings().sfx };
}

/** Pre-envelope v0 shape (no digest): `{ schema: 0, music: { wantsPlayback,
 *  currentTrackIndex } }`. Kept so the earliest visitors' stored settings
 *  survive, and as the worked example of a direct-to-current migration. */
function migrateLegacySettings(record: Record<string, unknown>): HubSettings | null {
  if (record.schema !== 0 || !isRecord(record.music)) {
    return null;
  }
  const { wantsPlayback, currentTrackIndex } = record.music;
  if (typeof wantsPlayback !== 'boolean') {
    return null;
  }
  const trackIndex = normalizeTrackIndex(currentTrackIndex);
  if (trackIndex === null) {
    return null;
  }
  return {
    music: {
      enabled: wantsPlayback,
      trackIndex,
    },
    sfx: createDefaultHubSettings().sfx,
  };
}

function normalizeMusicSettings(value: unknown): HubSettings['music'] | null {
  if (!isRecord(value) || typeof value.enabled !== 'boolean') {
    return null;
  }
  const trackIndex = normalizeTrackIndex(value.trackIndex);
  if (trackIndex === null) {
    return null;
  }
  return {
    enabled: value.enabled,
    trackIndex,
  };
}

function normalizeSfxSettings(value: unknown): HubSettings['sfx'] | null {
  if (!isRecord(value) || typeof value.enabled !== 'boolean') {
    return null;
  }
  return { enabled: value.enabled };
}

function normalizeTrackIndex(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}
