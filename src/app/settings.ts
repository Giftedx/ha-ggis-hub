import { fnv1a64 } from '../engine/fnv';

export const HUB_SETTINGS_KEY = 'ggis_hub_settings';

const HUB_SETTINGS_SCHEMA = 1;

interface HubSettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface HubSettings {
  readonly music: {
    readonly enabled: boolean;
    readonly trackIndex: number;
  };
}

export interface HubSettingsStore {
  load(): HubSettings;
  save(settings: HubSettings): void;
}

interface StoredHubSettingsV1 {
  readonly schema: typeof HUB_SETTINGS_SCHEMA;
  readonly music: HubSettings['music'];
}

export function createDefaultHubSettings(): HubSettings {
  return {
    music: {
      enabled: false,
      trackIndex: 0,
    },
  };
}

export function createHubSettingsStore(storage?: HubSettingsStorage | null): HubSettingsStore {
  return {
    load(): HubSettings {
      if (storage === undefined || storage === null) {
        return createDefaultHubSettings();
      }
      try {
        return parseHubSettings(storage.getItem(HUB_SETTINGS_KEY));
      } catch {
        return createDefaultHubSettings();
      }
    },

    save(settings: HubSettings): void {
      if (storage === undefined || storage === null) {
        return;
      }
      try {
        storage.setItem(HUB_SETTINGS_KEY, serializeHubSettingsForStorage(settings));
      } catch {
        // Settings are a convenience; blocked/quota-full storage must not stop the hub.
      }
    },
  };
}

export function serializeHubSettingsForStorage(settings: HubSettings): string {
  const stored: StoredHubSettingsV1 = {
    schema: HUB_SETTINGS_SCHEMA,
    music: normalizeMusicSettings(settings.music) ?? createDefaultHubSettings().music,
  };
  return JSON.stringify({ ...stored, digest: digestStoredSettings(stored) });
}

function parseHubSettings(raw: string | null): HubSettings {
  if (raw === null) {
    return createDefaultHubSettings();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return createDefaultHubSettings();
  }

  const current = parseCurrentSettings(parsed);
  if (current !== null) {
    return current;
  }

  const migrated = migrateLegacySettings(parsed);
  return migrated ?? createDefaultHubSettings();
}

function parseCurrentSettings(value: unknown): HubSettings | null {
  if (!isRecord(value) || value.schema !== HUB_SETTINGS_SCHEMA) {
    return null;
  }
  if (typeof value.digest !== 'string') {
    return null;
  }
  const music = normalizeMusicSettings(value.music);
  if (music === null) {
    return null;
  }
  const stored: StoredHubSettingsV1 = { schema: HUB_SETTINGS_SCHEMA, music };
  if (value.digest !== digestStoredSettings(stored)) {
    return null;
  }
  return { music };
}

function migrateLegacySettings(value: unknown): HubSettings | null {
  if (!isRecord(value) || value.schema !== 0 || !isRecord(value.music)) {
    return null;
  }
  const { wantsPlayback, currentTrackIndex } = value.music;
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

function digestStoredSettings(settings: StoredHubSettingsV1): string {
  const canonical = JSON.stringify(settings);
  const bytes = Array.from(new TextEncoder().encode(canonical));
  return fnv1a64(bytes).toString(16).padStart(16, '0');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
