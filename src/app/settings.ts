import {
  createStoredRecordStore,
  createVersionedRecordCodec,
  isRecord,
  type RecordStorage,
  type StoredRecordStore,
} from './versioned-record';

export const HUB_SETTINGS_KEY = 'ggis_hub_settings';

const HUB_SETTINGS_SCHEMA = 1;

export interface HubSettings {
  readonly music: {
    readonly enabled: boolean;
    readonly trackIndex: number;
  };
}

export type HubSettingsStore = StoredRecordStore<HubSettings>;

export function createDefaultHubSettings(): HubSettings {
  return {
    music: {
      enabled: false,
      trackIndex: 0,
    },
  };
}

// Envelope + digest + migration handling lives in the shared versioned-record
// codec; this module owns only what a settings payload MEANS: the music
// fields, their validation, and the legacy v0 shape.
const hubSettingsCodec = createVersionedRecordCodec<HubSettings>({
  schema: HUB_SETTINGS_SCHEMA,
  defaults: createDefaultHubSettings,
  normalize: (record) => {
    const music = normalizeMusicSettings(record.music);
    return music === null ? null : { music };
  },
  payloadOf: (settings) => ({
    music: normalizeMusicSettings(settings.music) ?? createDefaultHubSettings().music,
  }),
  migrations: [migrateLegacySettings],
});

export function createHubSettingsStore(storage?: RecordStorage | null): HubSettingsStore {
  return createStoredRecordStore(HUB_SETTINGS_KEY, hubSettingsCodec, storage);
}

export function serializeHubSettingsForStorage(settings: HubSettings): string {
  return hubSettingsCodec.serialize(settings);
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

function normalizeTrackIndex(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}
