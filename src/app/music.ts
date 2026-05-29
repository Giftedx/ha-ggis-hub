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
}

export interface MusicController {
  destroy(): void;
}

const MUSIC_VOLUME = 0.38;

export function createMusicController({
  button,
  audio,
  tracks,
}: MusicControllerOptions): MusicController {
  let currentIndex = 0;
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
    button.textContent = 'music on';
    button.setAttribute('aria-label', 'Pause hub music');
    button.disabled = false;
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
      }
    } catch {
      wantsPlayback = false;
      audio.pause();
      setPausedState();
    } finally {
      inFlight = false;
    }
  }

  function pauseCurrent(): void {
    wantsPlayback = false;
    audio.pause();
    setPausedState();
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
      wantsPlayback = false;
      audio.pause();
      setPausedState();
    },
  };
}
