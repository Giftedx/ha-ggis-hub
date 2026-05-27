import {
  validateGameRegistry,
  WILD_HAGGIS_SURVIVORS_GAME_ID,
  getGameById,
} from '../games/registry';
import type { HubGameDefinition, HubGameLaunchTarget } from '../games/registry';

export type LaunchPlan =
  | {
      readonly kind: 'launchable';
      readonly gameId: string;
      readonly title: string;
      readonly target: string;
      readonly targetKind: Exclude<HubGameLaunchTarget['kind'], 'none'>;
    }
  | {
      readonly kind: 'unavailable';
      readonly gameId: string;
      readonly title: string;
      readonly reason: string;
    }
  | {
      readonly kind: 'missing-game';
      readonly gameId: string;
      readonly reason: string;
    };

export interface LaunchNavigator {
  navigate(target: string, targetKind: Exclude<HubGameLaunchTarget['kind'], 'none'>): void;
}

export function canLaunchGame(
  game: HubGameDefinition | undefined
): game is HubGameDefinition & { launch: Exclude<HubGameLaunchTarget, { kind: 'none' }> } {
  return game?.status === 'playable' && game.launch.kind !== 'none';
}

export function createDirectPlayPlan(registry: readonly HubGameDefinition[]): LaunchPlan {
  const game = getGameById(registry, WILD_HAGGIS_SURVIVORS_GAME_ID);

  if (game === undefined) {
    return {
      kind: 'missing-game',
      gameId: WILD_HAGGIS_SURVIVORS_GAME_ID,
      reason: 'Game is not registered',
    };
  }

  return createLaunchPlan(game);
}

export function createLaunchPlan(game: HubGameDefinition): LaunchPlan {
  const validationErrors = validateGameRegistry([game]);
  if (validationErrors.length > 0) {
    return {
      kind: 'unavailable',
      gameId: game.id,
      title: game.title,
      reason: validationErrors.join('; '),
    };
  }

  if (!canLaunchGame(game)) {
    return {
      kind: 'unavailable',
      gameId: game.id,
      title: game.title,
      reason: game.status,
    };
  }

  return {
    kind: 'launchable',
    gameId: game.id,
    title: game.title,
    target: game.launch.target,
    targetKind: game.launch.kind,
  };
}

export function performLaunch(plan: LaunchPlan, navigator: LaunchNavigator): void {
  if (plan.kind !== 'launchable') {
    return;
  }

  navigator.navigate(plan.target, plan.targetKind);
}
