import type { HubSettingsStore } from './settings';

export interface MusicTrackModel {
  readonly title: string;
  readonly src: string;
  readonly midiSrc: string;
  readonly sourceUrl: string;
}

export interface MusicControllerOptions {
  readonly button: HTMLButtonElement;
  readonly audio: HTMLAudioElement;
  readonly tracks: readonly MusicTrackModel[];
  readonly settings?: HubSettingsStore;
}

export interface MusicController {
  destroy(): void;
}

const MUSIC_VOLUME = 0.38;

export function createMusicController({
  button,
  audio,
  tracks,
  settings,
}: MusicControllerOptions): MusicController {
  const loadedSettings = settings?.load();
  let currentIndex = normalizeTrackIndex(loadedSettings?.music.trackIndex ?? 0, tracks);
  let loadedIndex = -1;
  let wantsPlayback = false;
  let inFlight = false;

  audio.preload = 'none';
  audio.volume = MUSIC_VOLUME;

  function currentTrack(): MusicTrackModel | undefined {
    return tracks[currentIndex];
  }

  // Set audio.src only when the selected track actually changes. Re-assigning
  // src (even to the same value) re-runs the media load algorithm, resetting
  // currentTime to 0 and re-fetching the file — which would restart the track
  // on every resume. Tracking the loaded index keeps pause/resume on the same
  // track from touching src.
  function applyCurrentTrack(): void {
    if (currentIndex === loadedIndex) {
      return;
    }
    const track = currentTrack();
    if (track !== undefined) {
      audio.src = track.src;
      loadedIndex = currentIndex;
    }
  }

  function setPausedState(): void {
    button.className = 'scene-music';
    button.textContent = 'music';
    const track = currentTrack();
    button.setAttribute(
      'aria-label',
      track === undefined ? 'Hub music unavailable' : `Play hub music: ${track.title}`
    );
    button.disabled = track === undefined;
  }

  function setPlayingState(): void {
    button.className = 'scene-music is-playing';
    // WCAG 2.5.3 label-in-name: the accessible name must contain the
    // visible "music on" text, so the label leads with it.
    button.textContent = 'music on';
    button.setAttribute('aria-label', 'Hub music on — press to pause');
    button.disabled = false;
  }

  function persistMusicSettings(enabled: boolean): void {
    if (settings === undefined) {
      return;
    }
    // Read-modify-write: the settings record is shared with other
    // controllers (sfx toggle), so only the music section may change here.
    settings.save({
      ...settings.load(),
      music: {
        enabled,
        trackIndex: currentIndex,
      },
    });
  }

  async function playCurrent(): Promise<void> {
    const track = currentTrack();
    if (track === undefined) {
      setPausedState();
      return;
    }
    inFlight = true;
    wantsPlayback = true;
    applyCurrentTrack();
    try {
      await audio.play();
      if (!audio.paused) {
        setPlayingState();
        persistMusicSettings(true);
      } else {
        wantsPlayback = false;
        setPausedState();
        persistMusicSettings(false);
      }
    } catch {
      wantsPlayback = false;
      audio.pause();
      setPausedState();
      persistMusicSettings(false);
    } finally {
      inFlight = false;
    }
  }

  function pauseCurrent(persist = true): void {
    wantsPlayback = false;
    audio.pause();
    setPausedState();
    if (persist) {
      persistMusicSettings(false);
    }
  }

  const onClick = (): void => {
    if (inFlight) return;
    if (wantsPlayback && !audio.paused) {
      pauseCurrent();
      return;
    }
    void playCurrent();
  };

  const onEnded = (): void => {
    if (tracks.length === 0) {
      setPausedState();
      return;
    }
    currentIndex = (currentIndex + 1) % tracks.length;
    applyCurrentTrack();
    if (wantsPlayback) {
      void playCurrent();
    } else {
      setPausedState();
      persistMusicSettings(false);
    }
  };

  applyCurrentTrack();
  setPausedState();
  button.addEventListener('click', onClick);
  audio.addEventListener('ended', onEnded);

  return {
    destroy(): void {
      button.removeEventListener('click', onClick);
      audio.removeEventListener('ended', onEnded);
      pauseCurrent(false);
    },
  };
}

function normalizeTrackIndex(index: number, tracks: readonly MusicTrackModel[]): number {
  return tracks.length > 0 && Number.isSafeInteger(index) && index >= 0 && index < tracks.length
    ? index
    : 0;
}
