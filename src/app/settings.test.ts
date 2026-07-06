import { describe, expect, it } from 'vitest';
import {
  HUB_SETTINGS_KEY,
  createDefaultHubSettings,
  createHubSettingsStore,
  serializeHubSettingsForStorage,
  type HubSettings,
} from './settings';

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

const customSettings: HubSettings = {
  music: {
    enabled: true,
    trackIndex: 1,
  },
};

describe('hub settings persistence', () => {
  it('returns default settings when local storage has no hub settings key', () => {
    const storage = new FakeStorage();
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
    expect(storage.values.has(HUB_SETTINGS_KEY)).toBe(false);
  });

  it('writes only the owned ggis_hub_settings key with a tamper-evident digest', () => {
    const storage = new FakeStorage();
    const store = createHubSettingsStore(storage);

    store.save(customSettings);

    expect([...storage.values.keys()]).toEqual([HUB_SETTINGS_KEY]);
    expect(storage.values.has('whs_save')).toBe(false);
    const stored = JSON.parse(storage.values.get(HUB_SETTINGS_KEY) ?? '{}') as {
      schema?: number;
      digest?: string;
      music?: unknown;
    };
    expect(stored.schema).toBe(1);
    expect(stored.music).toEqual(customSettings.music);
    expect(stored.digest).toMatch(/^[a-f0-9]{16}$/);
  });

  it('round-trips current schema settings when the digest matches', () => {
    const storage = new FakeStorage();
    storage.values.set(HUB_SETTINGS_KEY, serializeHubSettingsForStorage(customSettings));
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(customSettings);
  });

  it('serializes defaults when a malformed caller passes an invalid track index', () => {
    const malformed = {
      music: { enabled: true, trackIndex: -1 },
    } as HubSettings;

    expect(JSON.parse(serializeHubSettingsForStorage(malformed))).toMatchObject({
      schema: 1,
      music: createDefaultHubSettings().music,
    });
  });

  it('migrates the legacy v0 raw settings shape into the current schema', () => {
    const storage = new FakeStorage();
    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({ schema: 0, music: { wantsPlayback: true, currentTrackIndex: 1 } })
    );
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(customSettings);
  });

  it('falls back to defaults when the stored digest does not match the payload', () => {
    const storage = new FakeStorage();
    const stored = JSON.parse(serializeHubSettingsForStorage(customSettings)) as {
      digest: string;
      music: { trackIndex: number };
    };
    stored.music.trackIndex = 0;
    storage.values.set(HUB_SETTINGS_KEY, JSON.stringify(stored));
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('normalizes malformed settings instead of throwing during startup', () => {
    const storage = new FakeStorage();
    storage.values.set(HUB_SETTINGS_KEY, '{"schema":1,"music":{"enabled":"yes","trackIndex":-4}}');
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('falls back to defaults when the stored value is not parseable JSON', () => {
    const storage = new FakeStorage();
    storage.values.set(HUB_SETTINGS_KEY, '{"schema":1');
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('rejects current schema settings when the music payload is not an object', () => {
    const storage = new FakeStorage();
    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({ schema: 1, music: null, digest: '0000000000000000' })
    );
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('rejects current schema settings with an invalid track index before digest validation', () => {
    const storage = new FakeStorage();
    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({
        schema: 1,
        music: { enabled: true, trackIndex: -1 },
        digest: '0000000000000000',
      })
    );
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('rejects legacy settings when the opt-in flag or track index cannot migrate', () => {
    const storage = new FakeStorage();
    const store = createHubSettingsStore(storage);

    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({ schema: 0, music: { wantsPlayback: 'yes', currentTrackIndex: 1 } })
    );
    expect(store.load()).toEqual(createDefaultHubSettings());

    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({ schema: 0, music: { wantsPlayback: true, currentTrackIndex: -1 } })
    );
    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('treats unavailable browser storage as an in-memory default settings store', () => {
    const storage = new FakeStorage();
    storage.throwOnGet = true;
    storage.throwOnSet = true;
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
    expect(() => {
      store.save(customSettings);
    }).not.toThrow();
  });

  it('treats absent storage as an in-memory default settings store', () => {
    const store = createHubSettingsStore(undefined);

    expect(store.load()).toEqual(createDefaultHubSettings());
    expect(() => {
      store.save(customSettings);
    }).not.toThrow();
  });
});
