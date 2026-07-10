import './style.css';
import { createAppModel } from './app/app';
import { createShell } from './app/shell';
import { createMusicController } from './app/music';
import { createHubProgressStore } from './app/progress';
import { createHubSettingsStore } from './app/settings';
import { createChapKnockPlayer, createSfxController } from './app/sfx';
import { createGameLifecycleHost } from './engine/lifecycle';
import { createBothyGameModule } from './hub/bothy-module';

const appRoot = document.querySelector<HTMLElement>('#app');

if (appRoot === null) {
  throw new Error('Expected #app root element to exist.');
}

void start(appRoot);

async function start(root: HTMLElement): Promise<void> {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let model: ReturnType<typeof createAppModel>;
  try {
    model = createAppModel();
  } catch (error: unknown) {
    console.error(error);
    return;
  }

  const shell = createShell(model);
  const settingsStore = createHubSettingsStore(getLocalStorage());
  createMusicController({
    button: shell.musicButton,
    audio: shell.musicAudio,
    tracks: model.music.tracks,
    settings: settingsStore,
  });
  const sfx = createSfxController({ button: shell.sfxButton, settings: settingsStore });
  const chapKnock = createChapKnockPlayer({ isEnabled: () => sfx.enabled() });
  root.replaceChildren(shell.scene);

  const host = createGameLifecycleHost(shell.scene);
  try {
    await host.launch(
      createBothyGameModule(shell, {
        progressStore: createHubProgressStore(getLocalStorage()),
        playChapKnock: () => {
          chapKnock.play();
        },
      }),
      {
        launchSource: 'route',
        reducedMotion,
      }
    );
  } catch (error: unknown) {
    shell.status.textContent = 'the bothy wouldnae load — try the corner link';
    console.error(error);
  }
}

function getLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
