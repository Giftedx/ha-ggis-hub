import { describe, expect, it } from 'vitest';
import { HUB_GAME_REGISTRY } from '../games/registry';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';
import { createDoorStatusAnnouncer, formatDoorStatus } from './door-status';

const BASE_SNAPSHOT: DecodedSnapshot = {
  playerX: 500,
  playerY: 500,
  playerHalfExtent: 80,
  worldWidth: 1000,
  worldHeight: 1000,
  interactionKind: 'none',
  interactionDoorIndex: 0,
  doors: [
    {
      id: 'wild-haggis-survivors',
      status: 'launchable',
      bounds: { minX: 760, minY: 380, maxX: 940, maxY: 620 }
    },
    {
      id: 'future-bothy',
      status: 'locked',
      bounds: { minX: 60, minY: 380, maxX: 220, maxY: 620 }
    }
  ]
};

function snapshotWithInteraction(
  interactionKind: DecodedSnapshot['interactionKind'],
  interactionDoorIndex: number
): DecodedSnapshot {
  return { ...BASE_SNAPSHOT, interactionKind, interactionDoorIndex };
}

describe('formatDoorStatus', () => {
  it('keeps the fallback text when no door is active', () => {
    expect(formatDoorStatus(BASE_SNAPSHOT, HUB_GAME_REGISTRY, 'reduced motion · the bothy bides quiet'))
      .toBe('reduced motion · the bothy bides quiet');
  });

  it('announces the launchable door with every supported interaction key', () => {
    expect(formatDoorStatus(snapshotWithInteraction('launchable', 0), HUB_GAME_REGISTRY))
      .toBe('Wild Haggis Survivors door — press Enter, Space, or E tae chap, or tap the door.');
  });

  it('announces a locked door without promising launch controls', () => {
    expect(formatDoorStatus(snapshotWithInteraction('locked', 1), HUB_GAME_REGISTRY))
      .toBe('Comin\' Wi\' The Next Moon door — comin’ soon.');
  });

  it('falls back when the interaction points outside the snapshot doors', () => {
    expect(formatDoorStatus(snapshotWithInteraction('launchable', 99), HUB_GAME_REGISTRY, 'fallback'))
      .toBe('fallback');
  });

  it('uses the door id as the title when the registry has no matching game', () => {
    const snapshot: DecodedSnapshot = {
      ...BASE_SNAPSHOT,
      interactionKind: 'locked',
      interactionDoorIndex: 0,
      doors: [{ id: 'unregistered-door', status: 'locked', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } }]
    };
    expect(formatDoorStatus(snapshot, HUB_GAME_REGISTRY))
      .toBe("unregistered-door door — comin’ soon.");
  });
});

describe('createDoorStatusAnnouncer', () => {
  it('writes status text only when the announcement changes', () => {
    const writes: string[] = [];
    const status = {
      get textContent(): string { return writes.at(-1) ?? ''; },
      set textContent(value: string) { writes.push(value); }
    } as HTMLElement;
    const announce = createDoorStatusAnnouncer({ status, registry: HUB_GAME_REGISTRY });

    announce(BASE_SNAPSHOT);
    announce(BASE_SNAPSHOT);
    announce(snapshotWithInteraction('launchable', 0));
    announce(snapshotWithInteraction('launchable', 0));
    announce(snapshotWithInteraction('locked', 1));

    expect(writes).toEqual([
      '',
      'Wild Haggis Survivors door — press Enter, Space, or E tae chap, or tap the door.',
      'Comin\' Wi\' The Next Moon door — comin’ soon.'
    ]);
  });
});
