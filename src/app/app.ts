import { createDirectPlayPlan } from '../navigation/launch';
import { HUB_GAME_REGISTRY, validateGameRegistry } from '../games/registry';
import type { MusicTrackModel } from './music';

export interface DirectPlayModel {
  readonly label: string;
  readonly target: string;
  readonly title: string;
}

export interface AppModel {
  readonly projectName: string;
  readonly directPlay: DirectPlayModel;
  readonly music: {
    readonly tracks: readonly MusicTrackModel[];
  };
}

const HUB_MUSIC_TRACKS: readonly MusicTrackModel[] = [
  {
    title: 'Flower of Scotland',
    src: '/music/flower-of-scotland.mp3',
    midiSrc: '/music/flower-of-scotland.mid',
    sourceUrl: 'https://www.wario.style/s/7u0vk4ok'
  },
  {
    title: 'Scotland the Brave',
    src: '/music/scotland-the-brave.mp3',
    midiSrc: '/music/scotland-the-brave.mid',
    sourceUrl: 'https://www.wario.style/s/tw6IWdAL'
  }
];

export function createAppModel(): AppModel {
  const registryErrors = validateGameRegistry(HUB_GAME_REGISTRY);
  if (registryErrors.length > 0) {
    throw new Error(`Invalid game registry: ${registryErrors.join('; ')}`);
  }

  const directPlayPlan = createDirectPlayPlan(HUB_GAME_REGISTRY);

  if (directPlayPlan.kind !== 'launchable') {
    throw new Error(`Direct play target is unavailable: ${directPlayPlan.reason}`);
  }

  return {
    projectName: 'ha.ggis Hub',
    directPlay: {
      label: `Play ${directPlayPlan.title}`,
      target: directPlayPlan.target,
      title: directPlayPlan.title
    },
    music: {
      tracks: HUB_MUSIC_TRACKS
    }
  };
}
