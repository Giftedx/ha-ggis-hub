import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneElements } from '../app/shell';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';
import type { HubBoundary, RoomDefinition } from '../wasm/boundary';

const mocks = vi.hoisted(() => ({
  initializeHubBoundaryV2: vi.fn(),
  loadGeneratedHubWasm: vi.fn(),
  createCanvasRoomRenderer: vi.fn(),
  computeVisualDoorBounds: vi.fn(),
  createKeyboardInputSampler: vi.fn(),
  createBrowserLaunchNavigator: vi.fn(),
  createDebugOverlay: vi.fn(),
  createFpsTracker: vi.fn(),
}));

vi.mock('../wasm/boundary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../wasm/boundary')>();
  return {
    ...actual,
    initializeHubBoundaryV2: mocks.initializeHubBoundaryV2,
  };
});

vi.mock('../wasm/generated-loader', () => ({
  loadGeneratedHubWasm: mocks.loadGeneratedHubWasm,
}));

vi.mock('../render/canvas-room', () => ({
  createCanvasRoomRenderer: mocks.createCanvasRoomRenderer,
  computeVisualDoorBounds: mocks.computeVisualDoorBounds,
}));

vi.mock('../engine/input', () => ({
  createKeyboardInputSampler: mocks.createKeyboardInputSampler,
}));

vi.mock('../navigation/browser-navigator', () => ({
  createBrowserLaunchNavigator: mocks.createBrowserLaunchNavigator,
}));

vi.mock('../debug/overlay', () => ({
  createDebugOverlay: mocks.createDebugOverlay,
  createFpsTracker: mocks.createFpsTracker,
}));

const ROOM: RoomDefinition = {
  worldWidth: 1_000,
  worldHeight: 1_000,
  doors: [
    {
      id: 'wild-haggis-survivors',
      status: 'launchable',
      bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 },
    },
    {
      id: 'future-bothy',
      status: 'locked',
      bounds: { minX: 80, minY: 420, maxX: 200, maxY: 580 },
    },
  ],
};

const SNAPSHOT: DecodedSnapshot = {
  playerX: 340,
  playerY: 540,
  playerHalfExtent: 56,
  worldWidth: 1_000,
  worldHeight: 1_000,
  interactionKind: 'none',
  interactionDoorIndex: 0,
  doors: ROOM.doors,
};

interface FakeCanvas {
  width: number;
  height: number;
  readonly listeners: Map<string, EventListener[]>;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  dispatch: (type: string, event: Record<string, unknown>) => void;
  getContext: (kind: '2d') => unknown;
  getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
  setPointerCapture: (pointerId: number) => void;
  hasPointerCapture: (pointerId: number) => boolean;
  releasePointerCapture: (pointerId: number) => void;
}

function makeCanvas(): FakeCanvas {
  return {
    width: 540,
    height: 360,
    listeners: new Map(),
    addEventListener(type, listener) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type, listener) {
      this.listeners.set(
        type,
        (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener)
      );
    },
    dispatch(type, event) {
      for (const listener of this.listeners.get(type) ?? []) {
        listener(event as unknown as Event);
      }
    },
    getContext() {
      return {};
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 540, height: 360 };
    },
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
  };
}

function makeShell(): SceneElements {
  return {
    scene: { append: vi.fn() } as unknown as HTMLElement,
    canvas: makeCanvas() as unknown as HTMLCanvasElement,
    status: { textContent: '' } as HTMLElement,
    fallback: {} as HTMLElement,
    musicButton: {} as HTMLButtonElement,
    musicAudio: {} as HTMLAudioElement,
  };
}

function installBrowserGlobals(search = ''): {
  flushRaf(now: number): void;
  docAddEventListener: ReturnType<typeof vi.fn>;
  winAddEventListener: ReturnType<typeof vi.fn>;
} {
  let rafId = 0;
  let callbacks: Array<(now: number) => void> = [];
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  const fakeWindow = {
    location: { search },
    devicePixelRatio: 1,
    addEventListener,
    removeEventListener,
    requestAnimationFrame: (callback: (now: number) => void): number => {
      callbacks.push(callback);
      rafId += 1;
      return rafId;
    },
    cancelAnimationFrame: vi.fn(),
  };
  const docAddEventListener = vi.fn();
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('requestAnimationFrame', fakeWindow.requestAnimationFrame);
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: docAddEventListener,
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('performance', {
    now: vi.fn(() => 0),
    mark: vi.fn(),
  });
  return {
    docAddEventListener,
    winAddEventListener: addEventListener,
    flushRaf(now: number): void {
      const pending = callbacks;
      callbacks = [];
      for (const callback of pending) {
        callback(now);
      }
    },
  };
}

type MockHubBoundary = HubBoundary & {
  readonly snapshot: ReturnType<typeof vi.fn<() => DecodedSnapshot>>;
  readonly tick: ReturnType<typeof vi.fn<(inputPacked: number) => DecodedSnapshot>>;
  readonly stateHash: ReturnType<typeof vi.fn<() => bigint>>;
  readonly destroy: ReturnType<typeof vi.fn<() => void>>;
};

function makeBoundary(snapshot: DecodedSnapshot = SNAPSHOT, room = ROOM): MockHubBoundary {
  return {
    apiVersion: 2,
    room,
    snapshot: vi.fn(() => snapshot),
    tick: vi.fn(() => snapshot),
    stateHash: vi.fn(() => 123n),
    destroy: vi.fn(),
  };
}

async function mountHarness(options?: {
  readonly search?: string;
  readonly snapshot?: DecodedSnapshot;
  readonly room?: RoomDefinition;
  readonly reducedMotion?: boolean;
}) {
  vi.resetModules();
  const browser = installBrowserGlobals(options?.search ?? '');
  const boundary = makeBoundary(options?.snapshot ?? SNAPSHOT, options?.room ?? ROOM);
  const renderer = { render: vi.fn() };
  const keyboard = {
    snapshot: vi.fn(() => ({ x: 0, y: 0 })),
    interactHeld: vi.fn(() => false),
    consumeInteract: vi.fn(() => false),
    destroy: vi.fn(),
  };
  const navigator = { navigate: vi.fn() };
  mocks.initializeHubBoundaryV2.mockResolvedValue(boundary);
  mocks.createCanvasRoomRenderer.mockReturnValue(renderer);
  mocks.computeVisualDoorBounds.mockReturnValue([
    { id: 'wild-haggis-survivors', x: 450, y: 150, width: 70, height: 85 },
    { id: 'future-bothy', x: 20, y: 150, width: 70, height: 85 },
  ]);
  mocks.createKeyboardInputSampler.mockReturnValue(keyboard);
  mocks.createBrowserLaunchNavigator.mockReturnValue(navigator);
  mocks.createDebugOverlay.mockReturnValue({ update: vi.fn(), destroy: vi.fn() });
  mocks.createFpsTracker.mockReturnValue({ record: vi.fn(() => ({ fps: 60, frameMs: 16 })) });
  const shell = makeShell();
  const { createBothyGameModule } = await import('./bothy-module');
  const module = createBothyGameModule(shell);
  const instance = await module.mount({} as HTMLElement, {
    launchSource: 'door',
    reducedMotion: options?.reducedMotion ?? false,
  });
  return {
    browser,
    boundary,
    renderer,
    keyboard,
    navigator,
    shell,
    instance,
    docAddEventListener: browser.docAddEventListener,
    winAddEventListener: browser.winAddEventListener,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe('createBothyGameModule', () => {
  it('mounts the bothy with deterministic seed and fixed visual-gate phase', async () => {
    const { browser, renderer, instance } = await mountHarness({
      search: '?seed=42&visualGatePhase=2.5',
      reducedMotion: true,
    });
    expect(mocks.initializeHubBoundaryV2).toHaveBeenCalledWith(mocks.loadGeneratedHubWasm, 42n);
    expect(mocks.createCanvasRoomRenderer).toHaveBeenCalledWith(
      expect.objectContaining({ width: 540, height: 360 }),
      ROOM,
      { reducedMotion: true, fixedPhaseSeconds: 2.5 }
    );
    expect(renderer.render).toHaveBeenCalledWith(SNAPSHOT);
    browser.flushRaf(16);
    instance.pause();
    instance.resume();
    await instance.destroy();
    expect(mocks.createKeyboardInputSampler().destroy).toHaveBeenCalled();
  });

  it('launches the playable game when pointer-down lands on the WHS door bounds', async () => {
    const { shell, navigator } = await mountHarness();
    (shell.canvas as unknown as FakeCanvas).dispatch('pointerdown', {
      clientX: 460,
      clientY: 160,
      pointerId: 7,
    });
    expect(navigator.navigate).toHaveBeenCalledWith('/wild/', 'route');
  });

  it('announces coming soon when pointer-down lands on a locked door', async () => {
    const { shell, navigator } = await mountHarness();
    (shell.canvas as unknown as FakeCanvas).dispatch('pointerdown', {
      clientX: 30,
      clientY: 160,
      pointerId: 8,
    });
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(shell.status.textContent).toBe("Comin' Wi' The Next Moon door — comin’ soon.");
  });

  it('samples pointer-drive input during the fixed-step loop and releases pointer capture', async () => {
    const { browser, boundary, shell } = await mountHarness();
    const canvas = shell.canvas as unknown as FakeCanvas;
    canvas.dispatch('pointerdown', {
      clientX: 390,
      clientY: 180,
      pointerId: 9,
    });
    canvas.dispatch('pointermove', {
      clientX: 420,
      clientY: 180,
      pointerId: 9,
    });
    browser.flushRaf(100);
    const tick = vi.mocked(boundary.tick);
    expect(tick).toHaveBeenCalled();
    expect(tick).toHaveBeenCalledWith(9);
    canvas.dispatch('pointerup', { pointerId: 9 });
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(9);
  });

  it('launches through the keyboard interact edge when the active door is launchable', async () => {
    const activeSnapshot: DecodedSnapshot = {
      ...SNAPSHOT,
      interactionKind: 'launchable',
      interactionDoorIndex: 0,
    };
    const { browser, keyboard, navigator } = await mountHarness({ snapshot: activeSnapshot });
    keyboard.interactHeld.mockReturnValue(true);
    keyboard.consumeInteract.mockReturnValue(true);
    browser.flushRaf(100);
    expect(navigator.navigate).toHaveBeenCalledWith('/wild/', 'route');
  });

  it('resets the fixed-step accumulator when the page returns to visible', async () => {
    const { browser, boundary, docAddEventListener } = await mountHarness();

    const calls = docAddEventListener.mock.calls as [string, EventListener][];
    const visEntry = calls.find(([type]) => type === 'visibilitychange');
    expect(visEntry).toBeDefined();

    // Huge delta fills the accumulator; last becomes 100_000_000.
    browser.flushRaf(100_000_000);
    vi.mocked(boundary.tick).mockClear();

    const handler = visEntry![1];
    handler(new Event('visibilitychange')); // resets last=performance.now()=0, accumulatorMs=0

    // With reset: delta=17ms → 1 tick. Without reset: delta=17-100_000_000 → negative → 0 ticks.
    browser.flushRaf(17);
    expect(vi.mocked(boundary.tick).mock.calls.length).toBe(1);
  });

  it('releases pointer capture on pointercancel when a drag is active', async () => {
    const { shell } = await mountHarness();
    const canvas = shell.canvas as unknown as FakeCanvas;
    canvas.dispatch('pointerdown', { clientX: 390, clientY: 180, pointerId: 11 });
    canvas.dispatch('pointercancel', { pointerId: 11 });
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(11);
  });

  it('ignores pointer-up events that arrive without an active drag', async () => {
    const { shell } = await mountHarness();
    const canvas = shell.canvas as unknown as FakeCanvas;
    canvas.dispatch('pointerup', { pointerId: 99 });
    expect(canvas.releasePointerCapture).not.toHaveBeenCalledWith(99);
  });

  it('translates keyboard rightward+downward movement into correct packed bits', async () => {
    const { browser, boundary, keyboard } = await mountHarness();
    keyboard.snapshot.mockReturnValue({ x: 1, y: 1 });
    browser.flushRaf(100);
    // right = 0b01 = 1, down = 0b01<<2 = 4, total = 5
    expect(vi.mocked(boundary.tick)).toHaveBeenCalledWith(5);
  });

  it('translates keyboard leftward-only movement into correct packed bits', async () => {
    const { browser, boundary, keyboard } = await mountHarness();
    // x<0 exercises the else-if branch; y=0 exercises the y-not-positive and y-not-negative branches
    keyboard.snapshot.mockReturnValue({ x: -1, y: 0 });
    browser.flushRaf(100);
    // left = 0b10 = 2
    expect(vi.mocked(boundary.tick)).toHaveBeenCalledWith(2);
  });

  it('translates keyboard upward-only movement into correct packed bits', async () => {
    const { browser, boundary, keyboard } = await mountHarness();
    // x=0 exercises x-not-positive and x-not-negative branches; y<0 exercises y else-if
    keyboard.snapshot.mockReturnValue({ x: 0, y: -1 });
    browser.flushRaf(100);
    // up = 0b10<<2 = 8
    expect(vi.mocked(boundary.tick)).toHaveBeenCalledWith(8);
  });

  it('includes the interact bit when keyboard axis and interact are both active', async () => {
    const { browser, boundary, keyboard } = await mountHarness();
    keyboard.snapshot.mockReturnValue({ x: 1, y: 0 });
    keyboard.interactHeld.mockReturnValue(true);
    browser.flushRaf(100);
    // right = 0b00001 = 1, interact = 0b10000 = 16, total = 17
    // Before fix: early return on axis input dropped the interact bit (tick called with 1)
    expect(vi.mocked(boundary.tick)).toHaveBeenCalledWith(17);
  });

  it('skips launch when consumeInteract fires but interaction is not launchable', async () => {
    const { browser, keyboard, navigator } = await mountHarness();
    // SNAPSHOT has interactionKind: 'none' — consumeInteract=true should hit the early return
    keyboard.consumeInteract.mockReturnValue(true);
    browser.flushRaf(100);
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('mounts in debug mode and drives the overlay on each frame', async () => {
    const { browser } = await mountHarness({ search: '?debug' });
    browser.flushRaf(100);
    expect(mocks.createDebugOverlay).toHaveBeenCalled();
    expect(mocks.createFpsTracker).toHaveBeenCalled();
    const overlay = vi.mocked(mocks.createDebugOverlay).mock.results[0]?.value as {
      update: ReturnType<typeof vi.fn>;
    };
    expect(overlay.update).toHaveBeenCalled();
  });

  it('ignores the visibilitychange event when the page is not visible', async () => {
    const { docAddEventListener } = await mountHarness();
    const calls = docAddEventListener.mock.calls as [string, EventListener][];
    const handler = calls.find(([type]) => type === 'visibilitychange')![1];
    // Re-stub document with hidden state before firing the event
    vi.stubGlobal('document', {
      visibilityState: 'hidden',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    // Should not throw or reset accumulator — just a no-op guard
    handler(new Event('visibilitychange'));
  });

  it('ignores rAF callbacks that fire after destroy', async () => {
    const { browser, instance } = await mountHarness();
    await instance.destroy();
    // cancelAnimationFrame is a vi.fn — it does not prevent the callback from firing in tests.
    // A second flush should hit the destroyed guard and return immediately.
    browser.flushRaf(200);
  });

  it('cancels both the animation loop and the first-frame mark RAF on destroy', async () => {
    const { instance } = await mountHarness();
    await instance.destroy();
    // Two distinct RAF handles are registered on mount: firstFrameRafId (id=1) and the loop (id=2).
    // Both must be cancelled so that post-destroy callbacks never fire in a real browser.
    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it('is safe to call destroy twice', async () => {
    const { instance } = await mountHarness();
    await instance.destroy();
    // Second destroy should hit the guard and return without error.
    await instance.destroy();
  });

  it('ignores pointermove events that arrive before any pointerdown', async () => {
    const { browser, boundary, shell } = await mountHarness();
    const canvas = shell.canvas as unknown as FakeCanvas;
    // pointermove fires before pointerdown — pointerActive is false, handler returns early
    canvas.dispatch('pointermove', { clientX: 200, clientY: 200, pointerId: 5 });
    browser.flushRaf(100);
    // No pointer direction bits set → tick(0)
    expect(vi.mocked(boundary.tick)).toHaveBeenCalledWith(0);
  });

  it('does not set movement bits when pointer stays inside the deadzone', async () => {
    const { browser, boundary, shell } = await mountHarness();
    const canvas = shell.canvas as unknown as FakeCanvas;
    // Player at world(340,540). Canvas 540x360, world 1000x1000.
    // clientX=183 → worldX≈339, clientY=194 → worldY≈539; hypot≈1.6 < POINTER_DEADZONE(18).
    canvas.dispatch('pointerdown', { clientX: 183, clientY: 194, pointerId: 3 });
    browser.flushRaf(100);
    expect(vi.mocked(boundary.tick)).toHaveBeenCalledWith(0);
  });

  it('sets leftward+downward bits when pointer is left of and below the player', async () => {
    const { browser, boundary, shell } = await mountHarness();
    const canvas = shell.canvas as unknown as FakeCanvas;
    // clientX=50 → worldX≈93, dx≈-247 (< -threshold); clientY=300 → worldY≈833, dy≈293 (> threshold).
    canvas.dispatch('pointerdown', { clientX: 50, clientY: 300, pointerId: 4 });
    browser.flushRaf(100);
    // left = 0b10 = 2, down = 0b01<<2 = 4, total = 6
    expect(vi.mocked(boundary.tick)).toHaveBeenCalledWith(6);
  });

  it('sets downward bits only when pointer is directly below with no significant horizontal offset', async () => {
    const { browser, boundary, shell } = await mountHarness();
    const canvas = shell.canvas as unknown as FakeCanvas;
    // clientX=183 → worldX≈339, dx≈-1.1 (between -threshold and threshold);
    // clientY=300 → worldY≈833, dy≈293 (> threshold).
    canvas.dispatch('pointerdown', { clientX: 183, clientY: 300, pointerId: 5 });
    browser.flushRaf(100);
    // down only = 0b01<<2 = 4
    expect(vi.mocked(boundary.tick)).toHaveBeenCalledWith(4);
  });

  it('sets rightward bits with no vertical bits when pointer is at neutral y offset', async () => {
    const { browser, boundary, shell } = await mountHarness();
    const canvas = shell.canvas as unknown as FakeCanvas;
    // clientX=200 → worldX≈370, dx≈30 (> threshold); clientY=193 → worldY≈536, dy≈-4 (|dy| < threshold).
    canvas.dispatch('pointerdown', { clientX: 200, clientY: 193, pointerId: 6 });
    browser.flushRaf(100);
    // right only = 0b01 = 1
    expect(vi.mocked(boundary.tick)).toHaveBeenCalledWith(1);
  });

  it('does not release pointer capture when capture is already gone at pointer-up', async () => {
    const { shell } = await mountHarness();
    const canvas = shell.canvas as unknown as FakeCanvas;
    canvas.dispatch('pointerdown', { clientX: 300, clientY: 200, pointerId: 20 });
    (canvas.hasPointerCapture as ReturnType<typeof vi.fn>).mockReturnValue(false);
    canvas.dispatch('pointerup', { pointerId: 20 });
    expect(canvas.releasePointerCapture).not.toHaveBeenCalledWith(20);
  });

  it('sets the status text when keyboard interact fires on an unregistered door id', async () => {
    const phantomSnapshot: DecodedSnapshot = {
      ...SNAPSHOT,
      interactionKind: 'launchable',
      interactionDoorIndex: 0,
      doors: [{ id: 'phantom-game', status: 'launchable', bounds: SNAPSHOT.doors[0]!.bounds }],
    };
    const { browser, keyboard, shell } = await mountHarness({ snapshot: phantomSnapshot });
    keyboard.consumeInteract.mockReturnValue(true);
    browser.flushRaf(100);
    expect(shell.status.textContent).toBe('that door leads nowhere yet');
  });

  it('announces coming soon via keyboard interact when the door is registered but not playable', async () => {
    // interactionDoorIndex=1 points to future-bothy (locked), which is in the registry but not launchable
    const lockedDoorSnapshot: DecodedSnapshot = {
      ...SNAPSHOT,
      interactionKind: 'launchable',
      interactionDoorIndex: 1,
    };
    const { browser, keyboard, shell } = await mountHarness({ snapshot: lockedDoorSnapshot });
    keyboard.consumeInteract.mockReturnValue(true);
    browser.flushRaf(100);
    expect(shell.status.textContent).toContain('soon.');
  });

  it('does not navigate when interact fires but door index is out of bounds', async () => {
    const outOfBoundsSnapshot: DecodedSnapshot = {
      ...SNAPSHOT,
      interactionKind: 'launchable',
      interactionDoorIndex: 99,
    };
    const { browser, keyboard, navigator } = await mountHarness({ snapshot: outOfBoundsSnapshot });
    keyboard.consumeInteract.mockReturnValue(true);
    browser.flushRaf(100);
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('passes the active door id to the debug overlay when an interaction is in progress', async () => {
    const activeSnapshot: DecodedSnapshot = {
      ...SNAPSHOT,
      interactionKind: 'launchable',
      interactionDoorIndex: 0,
    };
    const { browser } = await mountHarness({ search: '?debug', snapshot: activeSnapshot });
    browser.flushRaf(100);
    const overlay = mocks.createDebugOverlay.mock.results[0]?.value as {
      update: ReturnType<typeof vi.fn>;
    };
    expect(overlay.update).toHaveBeenCalledWith(
      expect.objectContaining({ interactionDoorId: 'wild-haggis-survivors' })
    );
  });

  it('passes null interactionDoorId to debug overlay when door index is out of bounds', async () => {
    const badIndexSnapshot: DecodedSnapshot = {
      ...SNAPSHOT,
      interactionKind: 'launchable',
      interactionDoorIndex: 99,
    };
    const { browser } = await mountHarness({ search: '?debug', snapshot: badIndexSnapshot });
    browser.flushRaf(100);
    const overlay = mocks.createDebugOverlay.mock.results[0]?.value as {
      update: ReturnType<typeof vi.fn>;
    };
    expect(overlay.update).toHaveBeenCalledWith(
      expect.objectContaining({ interactionDoorId: null })
    );
  });

  it('writes the serialised input log to window.__lastHaggisLog on beforeunload', async () => {
    const { browser, winAddEventListener } = await mountHarness();
    browser.flushRaf(100);
    const calls = winAddEventListener.mock.calls as [string, EventListener][];
    const entry = calls.find(([type]) => type === 'beforeunload');
    expect(entry).toBeDefined();
    entry![1](new Event('beforeunload'));
    expect((window as { __lastHaggisLog?: Uint8Array }).__lastHaggisLog).toBeInstanceOf(Uint8Array);
  });

  it('destroys the boundary and throws when room doors drift from the registry', async () => {
    vi.resetModules();
    installBrowserGlobals();
    const badRoom: RoomDefinition = {
      ...ROOM,
      doors: [{ ...ROOM.doors[0]!, id: 'missing-door' }],
    };
    const boundary = makeBoundary(SNAPSHOT, badRoom);
    mocks.initializeHubBoundaryV2.mockResolvedValue(boundary);
    const shell = makeShell();
    const { createBothyGameModule } = await import('./bothy-module');
    await expect(
      createBothyGameModule(shell).mount({} as HTMLElement, {
        launchSource: 'door',
        reducedMotion: false,
      })
    ).rejects.toThrow('Room/registry mismatch');
    const destroy = vi.mocked(boundary.destroy);
    expect(destroy).toHaveBeenCalled();
  });
});
