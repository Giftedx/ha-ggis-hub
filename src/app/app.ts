import { createDirectPlayPlan } from '../navigation/launch';
import { HUB_GAME_REGISTRY, validateGameRegistry } from '../games/registry';

export interface DirectPlayModel {
  readonly label: string;
  readonly target: string;
  readonly title: string;
}

export interface AppModel {
  readonly projectName: string;
  readonly directPlay: DirectPlayModel;
}

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
    }
  };
}
