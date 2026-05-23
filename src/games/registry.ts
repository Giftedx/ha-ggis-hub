/**
 * Minimal interaction shape consumed by the registry lookup. The kernel's
 * full interaction lives inside `DecodedSnapshot`; the registry only needs
 * to know whether an interaction exists and which door id it targets, so
 * a local alias keeps the boundary surface lean.
 */
export interface HubInteraction {
  readonly kind: 'none' | 'launchable' | 'locked';
  readonly id: string;
}

export type HubGameStatus = 'playable' | 'coming-soon' | 'disabled';

export type HubGameLaunchTarget =
  | { readonly kind: 'route'; readonly target: string }
  | { readonly kind: 'external-url'; readonly target: string }
  | { readonly kind: 'none' };

export interface HubGameDefinition {
  readonly id: string;
  readonly title: string;
  readonly status: HubGameStatus;
  readonly launch: HubGameLaunchTarget;
}

export const WILD_HAGGIS_SURVIVORS_GAME_ID = 'wild-haggis-survivors';

export const HUB_GAME_REGISTRY: readonly HubGameDefinition[] = [
  {
    id: WILD_HAGGIS_SURVIVORS_GAME_ID,
    title: 'Wild Haggis Survivors',
    status: 'playable',
    launch: { kind: 'external-url', target: 'https://wild-haggis-survivors.pages.dev/' }
  },
  {
    id: 'future-bothy',
    title: 'Future Bothy',
    status: 'coming-soon',
    launch: { kind: 'none' }
  }
];

const GAME_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function getGameById(
  registry: readonly HubGameDefinition[],
  id: string
): HubGameDefinition | undefined {
  return registry.find((game) => game.id === id);
}

export function interactionToRegistryEntry(
  interaction: HubInteraction,
  registry: readonly HubGameDefinition[]
): HubGameDefinition | null {
  if (interaction.kind === 'none' || interaction.id.length === 0) {
    return null;
  }

  return getGameById(registry, interaction.id) ?? null;
}

export function validateGameRegistry(registry: readonly HubGameDefinition[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const game of registry) {
    if (seenIds.has(game.id)) {
      errors.push(`Duplicate game id: ${game.id}`);
    }
    seenIds.add(game.id);

    if (!GAME_ID_PATTERN.test(game.id)) {
      errors.push(`Invalid game id "${game.id}": ids must be lowercase kebab-case`);
    }

    if (game.status === 'playable' && game.launch.kind === 'none') {
      errors.push(`Playable game ${game.id} must define a route or external-url launch target`);
    }

    if (game.status !== 'playable' && game.launch.kind !== 'none') {
      errors.push(`Non-playable game ${game.id} must not define a launch target`);
    }

    const launchTargetError = validateLaunchTarget(game.launch);
    if (launchTargetError !== null) {
      errors.push(`${game.id}: ${launchTargetError}`);
    }
  }

  return errors;
}

function validateLaunchTarget(launch: HubGameLaunchTarget): string | null {
  switch (launch.kind) {
    case 'none':
      return null;
    case 'route':
      if (!launch.target.startsWith('/') || launch.target.startsWith('//')) {
        return `Route launch target must be a same-origin absolute path: ${launch.target}`;
      }
      return null;
    case 'external-url':
      return validateExternalUrl(launch.target);
  }
}

function validateExternalUrl(target: string): string | null {
  try {
    const url = new URL(target);
    if (url.protocol !== 'https:') {
      return `External launch target must use https: ${target}`;
    }
    return null;
  } catch (_error: unknown) {
    return `External launch target must be a valid URL: ${target}`;
  }
}
