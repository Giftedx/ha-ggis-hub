import { getGameById, type HubGameDefinition } from '../games/registry';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';

export function formatDoorStatus(
  snapshot: DecodedSnapshot,
  registry: readonly HubGameDefinition[],
  fallbackText = ''
): string {
  if (snapshot.interactionKind === 'none') return fallbackText;

  const door = snapshot.doors[snapshot.interactionDoorIndex];
  if (door === undefined) return fallbackText;

  const title = getGameById(registry, door.id)?.title ?? door.id;
  if (snapshot.interactionKind === 'launchable') {
    return `${title} door — press Enter, Space, or E tae chap, or tap the door.`;
  }

  return `${title} door — comin’ soon.`;
}

export function createDoorStatusAnnouncer(options: {
  readonly status: HTMLElement;
  readonly registry: readonly HubGameDefinition[];
  readonly fallbackText?: string;
}): (snapshot: DecodedSnapshot) => void {
  let lastText: string | null = null;
  return (snapshot: DecodedSnapshot): void => {
    const nextText = formatDoorStatus(snapshot, options.registry, options.fallbackText ?? '');
    if (nextText === lastText) return;
    options.status.textContent = nextText;
    lastText = nextText;
  };
}
