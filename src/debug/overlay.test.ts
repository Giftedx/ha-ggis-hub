import { describe, expect, it, vi, afterEach } from 'vitest';
import { createDebugOverlay, createFpsTracker, formatStats, type DebugStats } from './overlay';

// Minimal DOM stub for createDebugOverlay — avoids a jsdom dependency.
// The overlay only touches: document.createElement, el.className,
// container.appendChild, el.textContent, el.remove.
interface FakeEl {
  tag: string;
  className: string;
  textContent: string | null;
  removed: boolean;
  remove(): void;
}

function makeFakeEl(tag: string): FakeEl {
  const el: FakeEl = {
    tag,
    className: '',
    textContent: null,
    removed: false,
    remove() {
      el.removed = true;
    },
  };
  return el;
}

interface FakeContainer {
  children: FakeEl[];
  appendChild(el: FakeEl): void;
  lastChild(): FakeEl | undefined;
}

function makeFakeContainer(): FakeContainer {
  const c: FakeContainer = {
    children: [],
    appendChild(el) {
      c.children.push(el);
    },
    lastChild() {
      return c.children[c.children.length - 1];
    },
  };
  return c;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubDocument(): { els: FakeEl[] } {
  const els: FakeEl[] = [];
  vi.stubGlobal('document', {
    createElement(tag: string): FakeEl {
      const el = makeFakeEl(tag);
      els.push(el);
      return el;
    },
  });
  return { els };
}

// ─── createDebugOverlay ───────────────────────────────────────────────────────

const BASE_STATS: DebugStats = {
  fps: 60,
  frameMs: 16.67,
  tick: 1200,
  playerX: 250,
  playerY: 500,
  interactionKind: 'none',
  interactionDoorId: null,
  wasmInitMs: 0,
};

describe('createDebugOverlay', () => {
  it('appends a pre element to the container', () => {
    const { els } = stubDocument();
    const container = makeFakeContainer();
    createDebugOverlay(container as unknown as HTMLElement);
    const el = els[0]!;
    expect(els.length).toBe(1);
    expect(el.tag).toBe('pre');
    expect(container.children).toContain(el);
  });

  it('applies the debug-overlay class', () => {
    const { els } = stubDocument();
    createDebugOverlay(makeFakeContainer() as unknown as HTMLElement);
    expect(els[0]!.className).toBe('debug-overlay');
  });

  it('update sets textContent to formatted stats', () => {
    const { els } = stubDocument();
    const overlay = createDebugOverlay(makeFakeContainer() as unknown as HTMLElement);
    overlay.update(BASE_STATS);
    const text = els[0]!.textContent ?? '';
    expect(text).toContain('FPS');
    expect(text).toContain('tick');
    expect(text).toContain('pos');
    expect(text).toContain('door');
  });

  it('destroy marks the element as removed', () => {
    const { els } = stubDocument();
    const overlay = createDebugOverlay(makeFakeContainer() as unknown as HTMLElement);
    overlay.destroy();
    expect(els[0]!.removed).toBe(true);
  });

  it('repeated updates overwrite content rather than appending', () => {
    const { els } = stubDocument();
    const overlay = createDebugOverlay(makeFakeContainer() as unknown as HTMLElement);
    overlay.update(BASE_STATS);
    overlay.update({ ...BASE_STATS, tick: 9999 });
    const text = els[0]!.textContent ?? '';
    expect(text).toContain('9999');
    expect((text.match(/tick/g) ?? []).length).toBe(1);
  });
});

// ─── createFpsTracker ─────────────────────────────────────────────────────────

describe('createFpsTracker', () => {
  it('returns ~60 fps for consistent 16.67ms deltas', () => {
    const tracker = createFpsTracker(10);
    let result = { fps: 0, frameMs: 0 };
    for (let i = 0; i < 10; i++) result = tracker.record(16.667);
    expect(result.fps).toBeCloseTo(60, 0);
  });

  it('returns the raw delta as frameMs', () => {
    const tracker = createFpsTracker(5);
    const { frameMs } = tracker.record(22.5);
    expect(frameMs).toBe(22.5);
  });

  it('adapts to a new steady rate after filling the window', () => {
    const tracker = createFpsTracker(5);
    for (let i = 0; i < 5; i++) tracker.record(16.667);
    let result = { fps: 0, frameMs: 0 };
    for (let i = 0; i < 5; i++) result = tracker.record(33.333);
    expect(result.fps).toBeCloseTo(30, 0);
  });

  it('handles zero delta without throwing', () => {
    const tracker = createFpsTracker(5);
    expect(() => tracker.record(0)).not.toThrow();
  });
});

// ─── formatStats ─────────────────────────────────────────────────────────────

describe('formatStats', () => {
  it('includes all four stat lines', () => {
    const text = formatStats(BASE_STATS);
    expect(text).toContain('FPS');
    expect(text).toContain('tick');
    expect(text).toContain('pos');
    expect(text).toContain('door');
  });

  it('shows "none" when interactionKind is none', () => {
    expect(formatStats({ ...BASE_STATS, interactionKind: 'none' })).toContain('door none');
  });

  it('shows launchable + door id when interaction is launchable', () => {
    const text = formatStats({
      ...BASE_STATS,
      interactionKind: 'launchable',
      interactionDoorId: 'wild-haggis-survivors',
    });
    expect(text).toContain('launchable');
    expect(text).toContain('wild-haggis-survivors');
  });

  it('shows locked verb when interaction is locked', () => {
    const text = formatStats({
      ...BASE_STATS,
      interactionKind: 'locked',
      interactionDoorId: 'future-bothy',
    });
    expect(text).toContain('locked');
    expect(text).toContain('future-bothy');
  });

  it('shows interaction kind without brackets when interactionDoorId is null — exercises empty-id branch', () => {
    const text = formatStats({
      ...BASE_STATS,
      interactionKind: 'launchable',
      interactionDoorId: null,
    });
    expect(text).toContain('launchable');
    expect(text).not.toContain('[');
  });

  it('includes wasm init time when wasmInitMs > 0', () => {
    expect(formatStats({ ...BASE_STATS, wasmInitMs: 312 })).toContain('wasm init 312ms');
  });

  it('omits wasm init annotation when wasmInitMs is 0', () => {
    expect(formatStats({ ...BASE_STATS, wasmInitMs: 0 })).not.toContain('wasm init');
  });
});
