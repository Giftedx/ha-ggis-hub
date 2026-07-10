import type { HubSettingsStore } from './settings';

// Chap knock SFX — a hand-rolled WebAudio "chap-chap" for door knocks.
// No sample assets, no library: each knock is two one-shot oscillators
// (a low triangle thump with a steep pitch drop + a short knuckle tick)
// through their own gain envelopes, and the double-knock is two of those
// 160ms apart. The knock only ever plays inside the visitor's own chap
// gesture (keyboard interact or pointer tap), so creating/resuming the
// AudioContext here satisfies browser autoplay policies.

/** Narrow structural slice of AudioParam used by the knock. */
export interface KnockAudioParam {
  setValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
}

interface KnockOscillator {
  type: string;
  readonly frequency: KnockAudioParam;
  connect(node: unknown): void;
  start(time: number): void;
  stop(time: number): void;
}

interface KnockGain {
  readonly gain: KnockAudioParam;
  connect(node: unknown): void;
}

/** Narrow structural slice of AudioContext used by the knock, so tests can
 *  fake it and the browser's real AudioContext satisfies it unchanged. */
export interface KnockAudioContext {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  createOscillator(): KnockOscillator;
  createGain(): KnockGain;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export interface ChapKnockPlayer {
  /** Schedule one chap-chap now. No-op when disabled, destroyed, or audio is unavailable. */
  play(): void;
  destroy(): void;
}

export interface ChapKnockOptions {
  /** Live query — reads the sfx toggle so a mid-session opt-out silences the next chap. */
  readonly isEnabled: () => boolean;
  /** Injectable for tests; defaults to the platform AudioContext (null when absent). */
  readonly createContext?: (() => KnockAudioContext | null) | undefined;
}

const KNOCK_GAP_SECONDS = 0.16;

export function createChapKnockPlayer(options: ChapKnockOptions): ChapKnockPlayer {
  const createContext = options.createContext ?? defaultAudioContextFactory;
  let context: KnockAudioContext | null = null;
  let contextUnavailable = false;
  let destroyed = false;

  function ensureContext(): KnockAudioContext | null {
    if (context !== null || contextUnavailable) {
      return context;
    }
    try {
      context = createContext();
    } catch {
      context = null;
    }
    if (context === null) {
      // Remember the miss: a platform without WebAudio will not grow it
      // mid-session, so don't re-probe on every chap.
      contextUnavailable = true;
    }
    return context;
  }

  return {
    play(): void {
      if (destroyed || !options.isEnabled()) {
        return;
      }
      const audio = ensureContext();
      if (audio === null) {
        return;
      }
      if (audio.state === 'suspended') {
        // Called inside a user gesture, so resume is permitted; failure just
        // means this chap stays silent.
        void audio.resume().catch(() => undefined);
      }
      const start = audio.currentTime + 0.001;
      scheduleKnock(audio, start, 1);
      scheduleKnock(audio, start + KNOCK_GAP_SECONDS, 0.8);
    },

    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      if (context !== null) {
        void context.close().catch(() => undefined);
      }
    },
  };
}

/** One knock = a low door-plank thump plus a short knuckle tick. `weight`
 *  scales gain and pitch slightly so the second chap sounds like the same
 *  hand, not a sample replay. */
function scheduleKnock(audio: KnockAudioContext, at: number, weight: number): void {
  // Thump: pitch falls fast (165→62Hz) while the envelope decays — the
  // resonant body of the door.
  scheduleThump(audio, {
    at,
    type: 'triangle',
    startHz: 165 * (0.94 + 0.06 * weight),
    endHz: 62,
    pitchFall: 0.055,
    peak: 0.5 * weight,
    decay: 0.11,
  });
  // Tick: a much shorter, quieter, higher partial — the knuckle contact.
  scheduleThump(audio, {
    at,
    type: 'square',
    startHz: 810,
    endHz: 340,
    pitchFall: 0.02,
    peak: 0.12 * weight,
    decay: 0.035,
  });
}

function scheduleThump(
  audio: KnockAudioContext,
  spec: {
    readonly at: number;
    readonly type: string;
    readonly startHz: number;
    readonly endHz: number;
    readonly pitchFall: number;
    readonly peak: number;
    readonly decay: number;
  }
): void {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = spec.type;
  oscillator.frequency.setValueAtTime(spec.startHz, spec.at);
  // Exponential ramps must target > 0; endHz/0.001 floors keep WebAudio happy.
  oscillator.frequency.exponentialRampToValueAtTime(spec.endHz, spec.at + spec.pitchFall);
  gain.gain.setValueAtTime(spec.peak, spec.at);
  gain.gain.exponentialRampToValueAtTime(0.001, spec.at + spec.decay);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(spec.at);
  oscillator.stop(spec.at + spec.decay + 0.02);
}

function defaultAudioContextFactory(): KnockAudioContext | null {
  if (typeof AudioContext === 'undefined') {
    return null;
  }
  return new AudioContext();
}

// ── Sounds toggle ──────────────────────────────────────────────────────────

export interface SfxController {
  /** Current chap-sound preference; live view for the knock player. */
  enabled(): boolean;
  destroy(): void;
}

export interface SfxControllerOptions {
  readonly button: HTMLButtonElement;
  readonly settings: HubSettingsStore;
}

/** Chrome pill next to the music control. Chap sounds default on (they only
 *  play inside the visitor's own gesture), so this persists an opt-out via
 *  the shared settings record — read-modify-write, music untouched. */
export function createSfxController({ button, settings }: SfxControllerOptions): SfxController {
  let enabled = settings.load().sfx.enabled;

  function render(): void {
    button.className = 'scene-sfx';
    // WCAG 2.5.3 label-in-name: the accessible name must contain the
    // visible text, so the label leads with it and appends the action.
    button.textContent = enabled ? 'sounds on' : 'sounds aff';
    button.setAttribute(
      'aria-label',
      enabled
        ? 'Chap sounds on — press to turn them off'
        : 'Chap sounds aff — press to turn them on'
    );
  }

  const onClick = (): void => {
    enabled = !enabled;
    settings.save({ ...settings.load(), sfx: { enabled } });
    render();
  };

  render();
  button.addEventListener('click', onClick);

  return {
    enabled(): boolean {
      return enabled;
    },
    destroy(): void {
      button.removeEventListener('click', onClick);
    },
  };
}
