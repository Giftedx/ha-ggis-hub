import { describe, expect, it } from 'vitest';
import {
  HUB_PROGRESS_KEY,
  createDefaultHubProgress,
  createHubProgressStore,
  recordDoorEntry,
  recordLockedChap,
  recordVisit,
  serializeHubProgressForStorage,
  type HubProgress,
} from './progress';

class FakeStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const sampleProgress: HubProgress = {
  visits: 3,
  lockedChaps: 5,
  doorEntries: { 'wild-haggis-survivors': 2 },
};

describe('hub progress persistence', () => {
  it('starts a fresh visitor at zero everything', () => {
    expect(createDefaultHubProgress()).toEqual({
      visits: 0,
      lockedChaps: 0,
      doorEntries: {},
    });
  });

  it('serializes the exact golden v1 envelope bytes', () => {
    // Golden pin: the stored string is a compatibility surface (visitors'
    // browsers hold copies). Key order, schema number, and digest recipe
    // changes must all surface here as a diff.
    expect(serializeHubProgressForStorage(sampleProgress)).toBe(
      '{"schema":1,"visits":3,"lockedChaps":5,"doorEntries":{"wild-haggis-survivors":2},"digest":"d848c67421936a56"}'
    );
  });

  it('writes only the owned ggis_hub_save key, never WHS keys', () => {
    const storage = new FakeStorage();
    const store = createHubProgressStore(storage);

    store.save(sampleProgress);

    expect([...storage.values.keys()]).toEqual([HUB_PROGRESS_KEY]);
    expect(HUB_PROGRESS_KEY).toBe('ggis_hub_save');
    expect(storage.values.has('whs_save')).toBe(false);
    expect(storage.values.has('whs_meta_save')).toBe(false);
    expect(storage.values.has('whs_game_settings')).toBe(false);
  });

  it('round-trips progress through the store', () => {
    const storage = new FakeStorage();
    const store = createHubProgressStore(storage);

    store.save(sampleProgress);

    expect(store.load()).toEqual(sampleProgress);
  });

  it('returns defaults when nothing is stored or storage is absent', () => {
    expect(createHubProgressStore(new FakeStorage()).load()).toEqual(createDefaultHubProgress());
    expect(createHubProgressStore(undefined).load()).toEqual(createDefaultHubProgress());
  });

  it('falls back to defaults when the stored payload was tampered', () => {
    const storage = new FakeStorage();
    const stored = JSON.parse(serializeHubProgressForStorage(sampleProgress)) as {
      visits: number;
    };
    stored.visits = 99;
    storage.values.set(HUB_PROGRESS_KEY, JSON.stringify(stored));

    expect(createHubProgressStore(storage).load()).toEqual(createDefaultHubProgress());
  });

  it('rejects malformed counter fields instead of throwing at startup', () => {
    const storage = new FakeStorage();
    const cases = [
      { visits: -1, lockedChaps: 0, doorEntries: {} },
      { visits: 1.5, lockedChaps: 0, doorEntries: {} },
      { visits: 0, lockedChaps: 'many', doorEntries: {} },
      { visits: 0, lockedChaps: 0, doorEntries: [] },
      { visits: 0, lockedChaps: 0, doorEntries: { 'wild-haggis-survivors': 0 } },
      { visits: 0, lockedChaps: 0, doorEntries: { 'Not Kebab!': 1 } },
    ];
    for (const payload of cases) {
      storage.values.set(
        HUB_PROGRESS_KEY,
        JSON.stringify({ schema: 1, ...payload, digest: '0000000000000000' })
      );
      expect(createHubProgressStore(storage).load()).toEqual(createDefaultHubProgress());
    }
  });

  it('serializes defaults when a malformed caller passes invalid counters', () => {
    const malformed = { visits: -3, lockedChaps: 1, doorEntries: {} } as HubProgress;

    expect(JSON.parse(serializeHubProgressForStorage(malformed))).toMatchObject({
      schema: 1,
      visits: 0,
      lockedChaps: 0,
      doorEntries: {},
    });
  });

  it('returns defaults for an unknown future schema instead of guessing', () => {
    const storage = new FakeStorage();
    storage.values.set(
      HUB_PROGRESS_KEY,
      JSON.stringify({ schema: 2, visits: 4, lockedChaps: 0, doorEntries: {}, digest: 'ff' })
    );

    expect(createHubProgressStore(storage).load()).toEqual(createDefaultHubProgress());
  });
});

describe('progress transitions', () => {
  it('recordVisit increments the visit counter without touching the rest', () => {
    expect(recordVisit(sampleProgress)).toEqual({ ...sampleProgress, visits: 4 });
  });

  it('recordLockedChap increments the lifetime chap counter', () => {
    expect(recordLockedChap(sampleProgress)).toEqual({ ...sampleProgress, lockedChaps: 6 });
  });

  it('recordDoorEntry increments an existing door tally', () => {
    expect(recordDoorEntry(sampleProgress, 'wild-haggis-survivors')).toEqual({
      ...sampleProgress,
      doorEntries: { 'wild-haggis-survivors': 3 },
    });
  });

  it('recordDoorEntry starts a first-time door at one', () => {
    expect(recordDoorEntry(sampleProgress, 'just-five-more-minutes')).toEqual({
      ...sampleProgress,
      doorEntries: { 'wild-haggis-survivors': 2, 'just-five-more-minutes': 1 },
    });
  });

  it('transitions return new values instead of mutating their input', () => {
    const before = { ...sampleProgress, doorEntries: { ...sampleProgress.doorEntries } };

    recordVisit(sampleProgress);
    recordLockedChap(sampleProgress);
    recordDoorEntry(sampleProgress, 'wild-haggis-survivors');

    expect(sampleProgress).toEqual(before);
  });
});
