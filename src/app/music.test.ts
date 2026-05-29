import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMusicController, type MusicTrackModel } from './music';

class FakeButton {
  readonly listeners = new Map<string, EventListener>();
  className = '';
  textContent = '';
  disabled = false;
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

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  click(): void {
    this.listeners.get('click')?.(new Event('click'));
  }
}

class FakeAudio {
  readonly listeners = new Map<string, EventListener>();
  // Simulate HTMLAudioElement.src: the browser resolves relative paths to absolute URLs.
  // Faithful getter prevents test doubles from masking src-comparison bugs.
  #src = '';
  get src(): string {
    return this.#src ? `https://ha.ggis.test${this.#src}` : '';
  }
  set src(v: string) {
    this.#src = v;
    this.srcSetCount += 1;
  }
  preload = '';
  volume = 1;
  paused = true;
  playCalls = 0;
  pauseCalls = 0;
  srcSetCount = 0;

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  async play(): Promise<void> {
    this.playCalls += 1;
    this.paused = false;
  }

  pause(): void {
    this.pauseCalls += 1;
    this.paused = true;
  }

  end(): void {
    this.paused = true;
    this.listeners.get('ended')?.(new Event('ended'));
  }
}

const TRACKS: MusicTrackModel[] = [
  {
    title: 'Flower of Scotland',
    src: '/music/flower-of-scotland.mp3',
    midiSrc: '/music/flower-of-scotland.mid',
    sourceUrl: 'https://www.wario.style/s/7u0vk4ok',
  },
  {
    title: 'Scotland the Brave',
    src: '/music/scotland-the-brave.mp3',
    midiSrc: '/music/scotland-the-brave.mid',
    sourceUrl: 'https://www.wario.style/s/tw6IWdAL',
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createMusicController', () => {
  it('starts paused and plays only after the user presses the music control', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: TRACKS,
    });

    expect(audio.preload).toBe('none');
    expect(audio.src).toBe('https://ha.ggis.test/music/flower-of-scotland.mp3');
    expect(audio.volume).toBe(0.38);
    expect(button.textContent).toBe('music');
    expect(button.getAttribute('aria-label')).toBe('Play hub music: Flower of Scotland');

    button.click();
    await Promise.resolve();

    expect(audio.playCalls).toBe(1);
    expect(button.textContent).toBe('music on');
    expect(button.getAttribute('aria-label')).toBe('Pause hub music');
  });

  it('advances through the playlist while playback is active', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: TRACKS,
    });

    button.click();
    await Promise.resolve();
    audio.end();
    await Promise.resolve();

    expect(audio.src).toBe('https://ha.ggis.test/music/scotland-the-brave.mp3');
    expect(audio.playCalls).toBe(2);
    expect(button.textContent).toBe('music on');
    expect(button.getAttribute('aria-label')).toBe('Pause hub music');
  });

  it('pauses on a second click while audio is actively playing', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: TRACKS,
    });

    button.click();
    await Promise.resolve();
    expect(button.textContent).toBe('music on');

    button.click();

    expect(audio.pauseCalls).toBe(1);
    expect(button.textContent).toBe('music');
    expect(button.getAttribute('aria-label')).toBe('Play hub music: Flower of Scotland');
  });

  it('resumes a paused track without reloading its source (no restart)', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: TRACKS,
    });

    button.click();
    await Promise.resolve();
    button.click(); // pause
    const setsWhilePaused = audio.srcSetCount;

    button.click(); // resume the same track
    await Promise.resolve();

    // Re-assigning audio.src re-runs the media load algorithm, resetting
    // currentTime to 0 and re-fetching. Resuming the same track must leave
    // src untouched so playback continues from where it paused.
    expect(audio.srcSetCount).toBe(setsWhilePaused);
    expect(audio.playCalls).toBe(2);
    expect(button.textContent).toBe('music on');
  });

  it('shows unavailable state when the track-ended event fires with an empty playlist', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: [],
    });

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Hub music unavailable');

    audio.end();

    expect(audio.playCalls).toBe(0);
    expect(button.textContent).toBe('music');
  });

  it('does not restart playback when a track ends and the user has not opted in', () => {
    const button = new FakeButton();
    const audio = new FakeAudio();

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: TRACKS,
    });

    audio.end();

    expect(audio.playCalls).toBe(0);
    expect(audio.src).toBe('https://ha.ggis.test/music/scotland-the-brave.mp3');
    expect(button.textContent).toBe('music');
  });

  it('reverts to unavailable state when playCurrent is called with no track available', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: [],
    });

    button.click();
    await Promise.resolve();

    expect(audio.playCalls).toBe(0);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Hub music unavailable');
  });

  it('reverts to paused state when audio.play() rejects (browser NotAllowedError)', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();
    audio.play = async (): Promise<void> => {
      throw new DOMException('User gesture required', 'NotAllowedError');
    };

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: TRACKS,
    });

    button.click();
    await Promise.resolve();

    expect(button.textContent).toBe('music');
    expect(button.getAttribute('aria-label')).toBe('Play hub music: Flower of Scotland');
  });

  it('stays paused when play() resolves but audio.paused is still true', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();
    audio.play = async (): Promise<void> => {
      audio.playCalls += 1;
      // paused stays true — edge case where play resolves without unpausing
    };

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: TRACKS,
    });

    button.click();
    await Promise.resolve();

    expect(audio.playCalls).toBe(1);
    expect(button.textContent).toBe('music');
    expect(button.getAttribute('aria-label')).toBe('Play hub music: Flower of Scotland');
  });

  it('pauses and unregisters listeners on destroy', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();

    const controller = createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: TRACKS,
    });

    button.click();
    await Promise.resolve();
    controller.destroy();

    expect(audio.pauseCalls).toBe(1);
    expect(button.listeners.size).toBe(0);
    expect(audio.listeners.size).toBe(0);
    expect(button.textContent).toBe('music');
    expect(button.getAttribute('aria-label')).toBe('Play hub music: Flower of Scotland');
  });

  it('ignores a second click while a play call is in flight', async () => {
    const button = new FakeButton();
    const audio = new FakeAudio();
    let playCalls = 0;
    let resolvePlay!: () => void;
    audio.play = (): Promise<void> =>
      new Promise((resolve) => {
        playCalls += 1;
        resolvePlay = (): void => {
          audio.paused = false;
          resolve();
        };
      });

    createMusicController({
      button: button as unknown as HTMLButtonElement,
      audio: audio as unknown as HTMLAudioElement,
      tracks: TRACKS,
    });

    button.click();
    button.click();
    resolvePlay();
    await Promise.resolve();

    expect(playCalls).toBe(1);
    expect(button.textContent).toBe('music on');
  });
});
