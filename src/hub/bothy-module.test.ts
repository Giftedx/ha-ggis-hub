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
  createFpsTracker: vi.fn()
}));

vi.mock('../wasm/boundary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../wasm/boundary')>();
  return {
    ...actual,
    initializeHubBoundaryV2: mocks.initializeHubBoundaryV2
  };
});

vi.mock('../wasm/generated-loader', () => ({
  loadGeneratedHubWasm: mocks.loadGeneratedHubWasm
}));

vi.mock('../render/canvas-room', () => ({
  createCanvasRoomRenderer: mocks.createCanvasRoomRenderer,
  computeVisualDoorBounds: mocks.computeVisualDoorBounds
}));

vi.mock('../engine/input', () => ({
  createKeyboardInputSampler: mocks.createKeyboardInputSampler
}));

vi.mock('../navigation/browser-navigator', () => ({
  createBrowserLaunchNavigator: mocks.createBrowserLaunchNavigator
}));

vi.mock('../debug/overlay', () => ({
  createDebugOverlay: mocks.createDebugOverlay,
  createFpsTracker: mocks.createFpsTracker
}));

const ROOM: RoomDefinition = {
  worldWidth: 1_000,
  worldHeight: 1_000,
  doors: [
    {
      id: 'wild-haggis-survivors',
      status: 'launchable',
      bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 }
    },
    {
      id: 'future-bothy',
      status: 'locked',
      bounds: { minX: 80, minY: 420, maxX: 200, maxY: 580 }
    }
  ]
};

const SNAPSHOT: DecodedSnapshot = {
  playerX: 340,
  playerY: 540,
  playerHalfExtent: 56,
  worldWidth: 1_000,
  worldHeight: 1_000,
  interactionKind: 'none',
  interactionDoorIndex: 0,
  doors: ROOM.doors
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
      this.listeners.set(type, (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener));
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
    releasePointerCapture: vi.fn()
  };
}

function makeShell(): SceneElements {
  return {
    scene: { append: vi.fn() } as unknown as HTMLElement,
    canvas: makeCanvas() as unknown as HTMLCanvasElement,
    status: { textContent: '' } as HTMLElement,
    fallback: {} as HTMLElement,
    musicButton: {} as HTMLButtonElement,
    musicAudio: {} as HTMLAudioElement
  };
}

function installBrowserGlobals(search = ''): { flushRaf(now: number): void } {
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
    cancelAnimationFrame: vi.fn()
  };
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('requestAnimationFrame', fakeWindow.requestAnimationFrame);
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  });
  vi.stubGlobal('performance', {
    now: vi.fn(() => 0),
    mark: vi.fn()
  });
  return {
    flushRaf(now: number): void {
      const pending = callbacks;
      callbacks = [];
      for (const callback of pending) {
        callback(now);
      }
    }
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
    destroy: vi.fn()
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
    destroy: vi.fn()
  };
  const navigator = { navigate: vi.fn() };
  mocks.initializeHubBoundaryV2.mockResolvedValue(boundary);
  mocks.createCanvasRoomRenderer.mockReturnValue(renderer);
  mocks.computeVisualDoorBounds.mockReturnValue([
    { id: 'wild-haggis-survivors', x: 450, y: 150, width: 70, height: 85 },
    { id: 'future-bothy', x: 20, y: 150, width: 70, height: 85 }
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
    reducedMotion: options?.reducedMotion ?? false
  });
  return { browser, boundary, renderer, keyboard, navigator, shell, instance };
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
      reducedMotion: true
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
      pointerId: 7
    });
    expect(navigator.navigate).toHaveBeenCalledWith(
      'https://wild-haggis-survivors.pages.dev/',
      'external-url'
    );
  });

  it('announces coming soon when pointer-down lands on a locked door', async () => {
    const { shell, navigator } = await mountHarness();
    (shell.canvas as unknown as FakeCanvas).dispatch('pointerdown', {
      clientX: 30,
      clientY: 160,
      pointerId: 8
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
      pointerId: 9
    });
    canvas.dispatch('pointermove', {
      clientX: 420,
      clientY: 180,
      pointerId: 9
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
      interactionDoorIndex: 0
    };
    const { browser, keyboard, navigator } = await mountHarness({ snapshot: activeSnapshot });
    keyboard.interactHeld.mockReturnValue(true);
    keyboard.consumeInteract.mockReturnValue(true);
    browser.flushRaf(100);
    expect(navigator.navigate).toHaveBeenCalledWith(
      'https://wild-haggis-survivors.pages.dev/',
      'external-url'
    );
  });

  it('resets the fixed-step accumulator when the page returns to visible', async () => {
    await mountHarness();

    const docCalls = vi.mocked(document.addEventListener).mock.calls;
    const visEntry = docCalls.find(([type]) => type === 'visibilitychange');
    expect(visEntry).toBeDefined();

    const handler = visEntry![1] as EventListener;
    handler(new Event('visibilitychange'));
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

  it('destroys the boundary and throws when room doors drift from the registry', async () => {
    vi.resetModules();
    installBrowserGlobals();
    const badRoom: RoomDefinition = {
      ...ROOM,
      doors: [{ ...ROOM.doors[0]!, id: 'missing-door' }]
    };
    const boundary = makeBoundary(SNAPSHOT, badRoom);
    mocks.initializeHubBoundaryV2.mockResolvedValue(boundary);
    const shell = makeShell();
    const { createBothyGameModule } = await import('./bothy-module');
    await expect(
      createBothyGameModule(shell).mount({} as HTMLElement, { launchSource: 'door', reducedMotion: false })
    ).rejects.toThrow('Room/registry mismatch');
    const destroy = vi.mocked(boundary.destroy);
    expect(destroy).toHaveBeenCalled();
  });
});
