import { describe, expect, it } from 'vitest';
import type { HubGameDefinition } from '../games/registry';
import {
  asEventListener,
  createDomListenerBag,
  finishPointerCapture,
  INTERACT_BIT,
  launchStatusForDoor,
  logicalCanvasPoint,
  packInputForTick,
  parseFixedVisualGatePhase,
  parseSeedFromSearch,
  pointerIntentBits,
  worldPointFromClient
} from './bothy-runtime';

const ZERO_POINTER = {
  active: false,
  targetX: 0,
  targetY: 0,
  playerX: 0,
  playerY: 0
} as const;

describe('packInputForTick', () => {
  it('packs keyboard movement and interact in the same tick', () => {
    expect(packInputForTick({
      keyboardVector: { x: -1, y: 1 },
      keyboardInteractHeld: true,
      pointer: ZERO_POINTER
    })).toBe(0b10 | (0b01 << 2) | INTERACT_BIT);
  });

  it('uses pointer movement only when keyboard movement is idle', () => {
    expect(packInputForTick({
      keyboardVector: { x: 0, y: 0 },
      keyboardInteractHeld: false,
      pointer: {
        active: true,
        targetX: 140,
        targetY: 78,
        playerX: 100,
        playerY: 100
      }
    })).toBe(0b01 | (0b10 << 2));
  });
});

describe('pointerIntentBits', () => {
  it('ignores inactive pointers and movement inside the deadzone', () => {
    expect(pointerIntentBits({
      active: true,
      targetX: 111,
      targetY: 100,
      playerX: 100,
      playerY: 100
    })).toBe(0);
    expect(pointerIntentBits(ZERO_POINTER)).toBe(0);
  });

  it('requires each axis to pass the threshold before setting that axis bit', () => {
    expect(pointerIntentBits({
      active: true,
      targetX: 106,
      targetY: 123,
      playerX: 100,
      playerY: 100
    })).toBe(0b01 << 2);
  });
});

describe('URL parameter parsing', () => {
  it('accepts unsigned decimal seed input and falls back on invalid seed input', () => {
    expect(parseSeedFromSearch('?seed=18446744073709551615', 99)).toBe(18_446_744_073_709_551_615n);
    expect(parseSeedFromSearch('?seed=-1', 99)).toBe(99n);
    expect(parseSeedFromSearch('?seed=abc', 99)).toBe(99n);
  });

  it('accepts finite visual gate phases in range and rejects invalid phases', () => {
    expect(parseFixedVisualGatePhase('?visualGatePhase=0')).toBe(0);
    expect(parseFixedVisualGatePhase('?visualGatePhase=86400')).toBe(86_400);
    expect(parseFixedVisualGatePhase('?visualGatePhase=12.5')).toBe(12.5);
    expect(parseFixedVisualGatePhase('?visualGatePhase=86400.1')).toBeUndefined();
    expect(parseFixedVisualGatePhase('?visualGatePhase=Infinity')).toBeUndefined();
    expect(parseFixedVisualGatePhase('?visualGatePhase=-1')).toBeUndefined();
  });
});

describe('coordinate helpers', () => {
  it('maps browser client coordinates into world coordinates', () => {
    expect(worldPointFromClient({
      clientX: 55,
      clientY: 45,
      rect: { left: 5, top: 15, width: 100, height: 50 },
      canvasWidth: 540,
      canvasHeight: 360,
      worldWidth: 1080,
      worldHeight: 720
    })).toEqual({ x: 540, y: 432 });
  });

  it('maps browser client coordinates into logical canvas coordinates after DPR scaling', () => {
    expect(logicalCanvasPoint({
      clientX: 55,
      clientY: 45,
      rect: { left: 5, top: 15, width: 100, height: 50 },
      canvasWidth: 1080,
      canvasHeight: 720,
      devicePixelRatio: 2
    })).toEqual({ x: 270, y: 216 });
  });
});

describe('launchStatusForDoor', () => {
  const registry: readonly HubGameDefinition[] = [
    {
      id: 'playable-door',
      title: 'Playable Door',
      status: 'playable',
      launch: { kind: 'route', target: '/playable' }
    },
    {
      id: 'locked-door',
      title: 'Locked Door',
      status: 'coming-soon',
      launch: { kind: 'none' }
    }
  ];

  it('returns a launchable plan when the door maps to a playable game', () => {
    expect(launchStatusForDoor('playable-door', registry)).toEqual({
      kind: 'launchable',
      plan: {
        kind: 'launchable',
        gameId: 'playable-door',
        title: 'Playable Door',
        target: '/playable',
        targetKind: 'route'
      }
    });
  });

  it('returns stable status copy for missing and locked doors', () => {
    expect(launchStatusForDoor('missing-door', registry)).toEqual({
      kind: 'missing',
      statusText: 'that door leads nowhere yet'
    });
    expect(launchStatusForDoor('locked-door', registry)).toEqual({
      kind: 'locked',
      statusText: 'Locked Door \u2014 comin\u2019 soon.'
    });
  });
});

describe('createDomListenerBag', () => {
  it('removes every registered listener exactly once in reverse order even when removeAll is repeated', () => {
    const calls: Array<readonly ['add' | 'remove', string, unknown]> = [];
    const target = {
      addEventListener(type: string, _listener: EventListenerOrEventListenerObject, options?: unknown): void {
        calls.push(['add', type, options]);
      },
      removeEventListener(type: string, _listener: EventListenerOrEventListenerObject, options?: unknown): void {
        calls.push(['remove', type, options]);
      }
    };
    const listener = (): void => {};
    const options = { capture: true } as const;
    const bag = createDomListenerBag();

    bag.add(target, 'pointerdown', listener, options);
    bag.add(target, 'pointermove', listener);
    bag.removeAll();
    bag.removeAll();

    expect(calls).toEqual([
      ['add', 'pointerdown', options],
      ['add', 'pointermove', undefined],
      ['remove', 'pointermove', undefined],
      ['remove', 'pointerdown', options]
    ]);
  });
});

describe('finishPointerCapture', () => {
  it('releases capture for an active captured pointer and returns inactive state', () => {
    const released: number[] = [];
    const target = {
      hasPointerCapture(pointerId: number): boolean {
        return pointerId === 7;
      },
      releasePointerCapture(pointerId: number): void {
        released.push(pointerId);
      }
    };

    expect(finishPointerCapture({ pointerActive: true, pointerId: 7, target })).toBe(false);
    expect(released).toEqual([7]);
  });

  it('does not release capture when the pointer is inactive or not captured', () => {
    const released: number[] = [];
    const target = {
      hasPointerCapture(): boolean {
        return false;
      },
      releasePointerCapture(pointerId: number): void {
        released.push(pointerId);
      }
    };

    expect(finishPointerCapture({ pointerActive: false, pointerId: 7, target })).toBe(false);
    expect(finishPointerCapture({ pointerActive: true, pointerId: 7, target })).toBe(false);
    expect(released).toEqual([]);
  });
});

describe('asEventListener', () => {
  it('wraps a typed event handler behind a DOM EventListener', () => {
    const seen: string[] = [];
    const listener = asEventListener((event) => {
      const pointerEvent = event as PointerEvent;
      seen.push(`${pointerEvent.type}:${pointerEvent.pointerId}`);
    });

    listener({ type: 'pointerdown', pointerId: 42 } as PointerEvent);

    expect(seen).toEqual(['pointerdown:42']);
  });
});
