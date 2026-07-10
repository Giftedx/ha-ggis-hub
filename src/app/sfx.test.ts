import { describe, expect, it, vi } from 'vitest';
import {
  createChapKnockPlayer,
  createSfxController,
  type KnockAudioContext,
  type KnockAudioParam,
} from './sfx';
import { createDefaultHubSettings, type HubSettings, type HubSettingsStore } from './settings';

class FakeParam implements KnockAudioParam {
  readonly sets: Array<{ value: number; time: number }> = [];
  readonly ramps: Array<{ value: number; time: number }> = [];

  setValueAtTime(value: number, time: number): void {
    this.sets.push({ value, time });
  }

  exponentialRampToValueAtTime(value: number, time: number): void {
    this.ramps.push({ value, time });
  }
}

class FakeOscillator {
  type = 'sine';
  readonly frequency = new FakeParam();
  readonly connections: unknown[] = [];
  readonly starts: number[] = [];
  readonly stops: number[] = [];

  connect(node: unknown): void {
    this.connections.push(node);
  }

  start(time: number): void {
    this.starts.push(time);
  }

  stop(time: number): void {
    this.stops.push(time);
  }
}

class FakeGain {
  readonly gain = new FakeParam();
  readonly connections: unknown[] = [];

  connect(node: unknown): void {
    this.connections.push(node);
  }
}

class FakeAudioContext implements KnockAudioContext {
  currentTime = 10;
  state = 'running';
  readonly destination = { sink: true };
  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];
  resumeCalls = 0;
  closeCalls = 0;

  createOscillator(): FakeOscillator {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  resume(): Promise<void> {
    this.resumeCalls += 1;
    this.state = 'running';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.closeCalls += 1;
    return Promise.resolve();
  }
}

describe('createChapKnockPlayer', () => {
  it('never creates an audio context while chap sounds are disabled', () => {
    const factory = vi.fn(() => new FakeAudioContext());
    const player = createChapKnockPlayer({ isEnabled: () => false, createContext: factory });

    player.play();
    player.play();

    expect(factory).not.toHaveBeenCalled();
  });

  it('lazily creates one context and schedules a two-thump chap-chap', () => {
    const context = new FakeAudioContext();
    const factory = vi.fn(() => context);
    const player = createChapKnockPlayer({ isEnabled: () => true, createContext: factory });

    player.play();

    expect(factory).toHaveBeenCalledTimes(1);
    // Two knocks, each a low thump + a knuckle tick = 4 one-shot oscillators.
    expect(context.oscillators).toHaveLength(4);
    expect(context.gains).toHaveLength(4);
    for (const oscillator of context.oscillators) {
      expect(oscillator.starts).toHaveLength(1);
      expect(oscillator.stops).toHaveLength(1);
      expect(oscillator.connections).toHaveLength(1);
    }
    for (const gain of context.gains) {
      expect(gain.connections).toEqual([context.destination]);
    }
    // The second knock lands audibly after the first (chap … chap).
    const startTimes = [...new Set(context.oscillators.map((o) => o.starts[0]!))].sort(
      (a, b) => a - b
    );
    expect(startTimes).toHaveLength(2);
    expect(startTimes[1]! - startTimes[0]!).toBeGreaterThan(0.1);
    // Exponential ramps must never target zero (WebAudio throws on 0).
    for (const node of [...context.oscillators.map((o) => o.frequency)]) {
      for (const ramp of node.ramps) {
        expect(ramp.value).toBeGreaterThan(0);
      }
    }
    for (const gain of context.gains) {
      for (const ramp of gain.gain.ramps) {
        expect(ramp.value).toBeGreaterThan(0);
      }
    }
  });

  it('reuses the same context across repeated chaps', () => {
    const factory = vi.fn(() => new FakeAudioContext());
    const player = createChapKnockPlayer({ isEnabled: () => true, createContext: factory });

    player.play();
    player.play();

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('resumes a suspended context before scheduling (autoplay-policy recovery)', () => {
    const context = new FakeAudioContext();
    context.state = 'suspended';
    const player = createChapKnockPlayer({ isEnabled: () => true, createContext: () => context });

    player.play();

    expect(context.resumeCalls).toBe(1);
    expect(context.oscillators.length).toBeGreaterThan(0);
  });

  it('stays silent without retrying when no context is available', () => {
    const factory = vi.fn((): KnockAudioContext | null => null);
    const player = createChapKnockPlayer({ isEnabled: () => true, createContext: factory });

    player.play();
    player.play();

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('swallows a context factory that throws (no WebAudio in this browser)', () => {
    const factory = vi.fn((): KnockAudioContext | null => {
      throw new Error('SecurityError');
    });
    const player = createChapKnockPlayer({ isEnabled: () => true, createContext: factory });

    expect(() => {
      player.play();
      player.play();
    }).not.toThrow();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('survives resume and close rejections without unhandled errors', async () => {
    const context = new FakeAudioContext();
    context.state = 'suspended';
    context.resume = (): Promise<void> => {
      context.resumeCalls += 1;
      return Promise.reject(new Error('nae audio the noo'));
    };
    context.close = (): Promise<void> => {
      context.closeCalls += 1;
      return Promise.reject(new Error('already closed'));
    };
    const player = createChapKnockPlayer({ isEnabled: () => true, createContext: () => context });

    player.play();
    player.destroy();
    // Let the rejected promises settle; vitest fails the test on any
    // unhandled rejection, so reaching the assertions proves the catches.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(context.resumeCalls).toBe(1);
    expect(context.closeCalls).toBe(1);
  });

  it('closes a created context once on destroy and goes inert afterwards', () => {
    const context = new FakeAudioContext();
    const player = createChapKnockPlayer({ isEnabled: () => true, createContext: () => context });

    player.play();
    player.destroy();
    player.destroy();
    player.play();

    expect(context.closeCalls).toBe(1);
    expect(context.oscillators).toHaveLength(4);
  });

  it('destroys cleanly when no context was ever created', () => {
    const context = new FakeAudioContext();
    const player = createChapKnockPlayer({ isEnabled: () => false, createContext: () => context });

    expect(() => {
      player.destroy();
    }).not.toThrow();
    expect(context.closeCalls).toBe(0);
  });

  it('falls back to the global AudioContext factory when none is injected', () => {
    class StubAudioContext extends FakeAudioContext {}
    vi.stubGlobal('AudioContext', StubAudioContext);
    try {
      const player = createChapKnockPlayer({ isEnabled: () => true });
      expect(() => {
        player.play();
      }).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('stays silent when the platform has no AudioContext at all', () => {
    const player = createChapKnockPlayer({ isEnabled: () => true });
    expect(() => {
      player.play();
    }).not.toThrow();
  });
});

class FakeButton {
  readonly listeners = new Map<string, EventListener>();
  className = '';
  textContent = '';
  readonly attributes = new Map<string, string>();

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  click(): void {
    this.listeners.get('click')?.(new Event('click'));
  }
}

class FakeSettingsStore implements HubSettingsStore {
  settings: HubSettings = createDefaultHubSettings();
  readonly saves: HubSettings[] = [];

  load(): HubSettings {
    return this.settings;
  }

  save(settings: HubSettings): void {
    this.settings = settings;
    this.saves.push(settings);
  }
}

describe('createSfxController', () => {
  it('renders the default-on state with an opt-out accessible label', () => {
    const button = new FakeButton();
    const controller = createSfxController({
      button: button as unknown as HTMLButtonElement,
      settings: new FakeSettingsStore(),
    });

    expect(button.textContent).toBe('sounds on');
    expect(button.attributes.get('aria-label')).toBe('Chap sounds on — press to turn them off');
    expect(controller.enabled()).toBe(true);
  });

  it('renders a persisted opt-out as sounds aff', () => {
    const settings = new FakeSettingsStore();
    settings.settings = { ...createDefaultHubSettings(), sfx: { enabled: false } };
    const button = new FakeButton();
    const controller = createSfxController({
      button: button as unknown as HTMLButtonElement,
      settings,
    });

    expect(button.textContent).toBe('sounds aff');
    expect(button.attributes.get('aria-label')).toBe('Chap sounds aff — press to turn them on');
    expect(controller.enabled()).toBe(false);
  });

  it('flips and persists on click while preserving the music section', () => {
    const settings = new FakeSettingsStore();
    settings.settings = {
      music: { enabled: true, trackIndex: 1 },
      sfx: { enabled: true },
    };
    const button = new FakeButton();
    const controller = createSfxController({
      button: button as unknown as HTMLButtonElement,
      settings,
    });

    button.click();

    expect(controller.enabled()).toBe(false);
    expect(button.textContent).toBe('sounds aff');
    expect(settings.settings).toEqual({
      music: { enabled: true, trackIndex: 1 },
      sfx: { enabled: false },
    });

    button.click();

    expect(controller.enabled()).toBe(true);
    expect(settings.settings.sfx).toEqual({ enabled: true });
  });

  it('stops reacting to clicks after destroy', () => {
    const button = new FakeButton();
    const settings = new FakeSettingsStore();
    const controller = createSfxController({
      button: button as unknown as HTMLButtonElement,
      settings,
    });

    controller.destroy();
    button.click();

    expect(controller.enabled()).toBe(true);
    expect(settings.saves).toHaveLength(0);
  });
});
