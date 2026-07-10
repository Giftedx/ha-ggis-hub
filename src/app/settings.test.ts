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

// Every field deliberately non-default so round-trips prove persistence.
const customSettings: HubSettings = {
  music: {
    enabled: true,
    trackIndex: 1,
  },
  sfx: {
    enabled: false,
  },
};

// The exact envelope schema 1 wrote (golden-pinned before the v2 bump).
// Visitors' browsers still hold copies of this string; the v1→v2 migration
// tests below feed it through the current store.
const STORED_V1_GOLDEN =
  '{"schema":1,"music":{"enabled":true,"trackIndex":1},"digest":"a573fff4eefb2481"}';

describe('hub settings persistence', () => {
  it('serializes the exact golden v2 envelope bytes', () => {
    // Golden pin: the stored string is a compatibility surface (existing
    // visitors' browsers hold copies of it). Any change to key order,
    // schema number, or digest recipe must show up here as a diff.
    expect(serializeHubSettingsForStorage(customSettings)).toBe(
      '{"schema":2,"music":{"enabled":true,"trackIndex":1},"sfx":{"enabled":false},"digest":"8be862adf64eaa07"}'
    );
  });

  it('defaults chap sounds on and music off for a fresh visitor', () => {
    expect(createDefaultHubSettings()).toEqual({
      music: { enabled: false, trackIndex: 0 },
      sfx: { enabled: true },
    });
  });

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
      sfx?: unknown;
    };
    expect(stored.schema).toBe(2);
    expect(stored.music).toEqual(customSettings.music);
    expect(stored.sfx).toEqual(customSettings.sfx);
    expect(stored.digest).toMatch(/^[a-f0-9]{16}$/);
  });

  it('round-trips current schema settings when the digest matches', () => {
    const storage = new FakeStorage();
    storage.values.set(HUB_SETTINGS_KEY, serializeHubSettingsForStorage(customSettings));
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(customSettings);
  });

  it('serializes defaults when a malformed caller passes invalid payload fields', () => {
    const malformed = {
      music: { enabled: true, trackIndex: -1 },
      sfx: { enabled: 'aye' },
    } as unknown as HubSettings;

    expect(JSON.parse(serializeHubSettingsForStorage(malformed))).toMatchObject({
      schema: 2,
      music: createDefaultHubSettings().music,
      sfx: createDefaultHubSettings().sfx,
    });
  });

  it('migrates the golden v1 envelope, defaulting chap sounds on', () => {
    const storage = new FakeStorage();
    storage.values.set(HUB_SETTINGS_KEY, STORED_V1_GOLDEN);
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual({
      music: { enabled: true, trackIndex: 1 },
      sfx: { enabled: true },
    });
  });

  it('rejects a tampered v1 envelope instead of migrating it', () => {
    const storage = new FakeStorage();
    const tampered = JSON.parse(STORED_V1_GOLDEN) as { music: { trackIndex: number } };
    tampered.music.trackIndex = 0;
    storage.values.set(HUB_SETTINGS_KEY, JSON.stringify(tampered));
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('rejects a v1 record whose digest is missing or malformed', () => {
    const storage = new FakeStorage();
    const store = createHubSettingsStore(storage);

    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({ schema: 1, music: { enabled: true, trackIndex: 1 } })
    );
    expect(store.load()).toEqual(createDefaultHubSettings());

    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({ schema: 1, music: { enabled: 'yes', trackIndex: 1 }, digest: 'ff' })
    );
    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('migrates the legacy v0 raw settings shape, defaulting chap sounds on', () => {
    const storage = new FakeStorage();
    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({ schema: 0, music: { wantsPlayback: true, currentTrackIndex: 1 } })
    );
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual({
      music: { enabled: true, trackIndex: 1 },
      sfx: { enabled: true },
    });
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
    storage.values.set(
      HUB_SETTINGS_KEY,
      '{"schema":2,"music":{"enabled":"yes","trackIndex":-4},"sfx":{"enabled":true}}'
    );
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('falls back to defaults when the stored value is not parseable JSON', () => {
    const storage = new FakeStorage();
    storage.values.set(HUB_SETTINGS_KEY, '{"schema":2');
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('rejects current schema settings when a payload section is not an object', () => {
    const storage = new FakeStorage();
    const store = createHubSettingsStore(storage);

    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({ schema: 2, music: null, sfx: { enabled: true }, digest: '0' })
    );
    expect(store.load()).toEqual(createDefaultHubSettings());

    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({
        schema: 2,
        music: { enabled: true, trackIndex: 1 },
        sfx: null,
        digest: '0',
      })
    );
    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('rejects current schema settings with an invalid track index before digest validation', () => {
    const storage = new FakeStorage();
    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({
        schema: 2,
        music: { enabled: true, trackIndex: -1 },
        sfx: { enabled: true },
        digest: '0000000000000000',
      })
    );
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('rejects a legacy record whose music payload is not an object', () => {
    const storage = new FakeStorage();
    storage.values.set(HUB_SETTINGS_KEY, JSON.stringify({ schema: 0, music: null }));
    const store = createHubSettingsStore(storage);

    expect(store.load()).toEqual(createDefaultHubSettings());
  });

  it('returns defaults for an unknown future schema instead of guessing', () => {
    const storage = new FakeStorage();
    storage.values.set(
      HUB_SETTINGS_KEY,
      JSON.stringify({ schema: 99, music: customSettings.music, digest: 'ff' })
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
