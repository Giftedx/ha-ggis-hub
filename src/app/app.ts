import { createDirectPlayPlan } from '../navigation/launch';
import { HUB_GAME_REGISTRY } from '../games/registry';

export interface DirectPlayModel {
  readonly label: string;
  readonly target: string;
  readonly title: string;
}

export interface AppModel {
  readonly projectName: string;
  readonly publicUrl: string;
  readonly stack: string;
  readonly phase: string;
  readonly directPlay: DirectPlayModel;
}

export function createAppModel(): AppModel {
  const directPlayPlan = createDirectPlayPlan(HUB_GAME_REGISTRY);

  if (directPlayPlan.kind !== 'launchable') {
    throw new Error(`Direct play target is unavailable: ${directPlayPlan.reason}`);
  }

  return {
    projectName: 'ha.ggis Hub',
    publicUrl: 'https://ha.ggis.xyz',
    stack: 'Rust hub-core -> WASM wrapper -> TypeScript/Vite host -> replaceable renderer',
    phase: 'Canvas2D first-room slice with Rust/WASM movement, registry, input, and direct play seams',
    directPlay: {
      label: `Play ${directPlayPlan.title}`,
      target: directPlayPlan.target,
      title: directPlayPlan.title
    }
  };
}
