import { describe, expect, it } from 'vitest';
import {
  HUB_GAME_REGISTRY,
  getGameById,
  interactionToRegistryEntry,
  validateGameRegistry
} from './registry';
import type { HubInteraction } from '../wasm/boundary';

describe('game registry', () => {
  it('keeps the canonical registry valid and maps Wild Haggis Survivors by stable id', () => {
    expect(validateGameRegistry(HUB_GAME_REGISTRY)).toEqual([]);

    const whs = getGameById(HUB_GAME_REGISTRY, 'wild-haggis-survivors');

    expect(whs).toMatchObject({
      id: 'wild-haggis-survivors',
      title: 'Wild Haggis Survivors',
      status: 'playable',
      launch: { kind: 'external-url', target: 'https://wild-haggis-survivors.pages.dev/' }
    });
  });

  it('keeps future doors non-launchable', () => {
    const future = getGameById(HUB_GAME_REGISTRY, 'future-bothy');

    expect(future).toMatchObject({
      id: 'future-bothy',
      status: 'coming-soon',
      launch: { kind: 'none' }
    });
  });

  it('rejects duplicate ids, invalid ids, playable games without launch targets, and future games with launch targets', () => {
    expect(
      validateGameRegistry([
        {
          id: 'wild-haggis-survivors',
          title: 'Wild Haggis Survivors',
          status: 'playable',
          launch: { kind: 'external-url', target: 'https://wild-haggis-survivors.pages.dev/' }
        },
        {
          id: 'wild-haggis-survivors',
          title: 'Duplicate',
          status: 'playable',
          launch: { kind: 'external-url', target: 'https://example.com/' }
        },
        {
          id: 'Bad Id',
          title: 'Bad Id',
          status: 'coming-soon',
          launch: { kind: 'none' }
        },
        {
          id: 'no-launch',
          title: 'No Launch',
          status: 'playable',
          launch: { kind: 'none' }
        },
        {
          id: 'future-with-launch',
          title: 'Future With Launch',
          status: 'coming-soon',
          launch: { kind: 'route', target: '/future/' }
        }
      ])
    ).toEqual([
      'Duplicate game id: wild-haggis-survivors',
      'Invalid game id "Bad Id": ids must be lowercase kebab-case',
      'Playable game no-launch must define a route or external-url launch target',
      'Non-playable game future-with-launch must not define a launch target'
    ]);
  });

  it('rejects unsafe launch targets', () => {
    expect(
      validateGameRegistry([
        {
          id: 'bad-route',
          title: 'Bad Route',
          status: 'playable',
          launch: { kind: 'route', target: '//evil.example/path' }
        },
        {
          id: 'bad-protocol',
          title: 'Bad Protocol',
          status: 'playable',
          launch: { kind: 'external-url', target: 'javascript:alert(1)' }
        },
        {
          id: 'bad-url',
          title: 'Bad URL',
          status: 'playable',
          launch: { kind: 'external-url', target: 'not a url' }
        }
      ])
    ).toEqual([
      'bad-route: Route launch target must be a same-origin absolute path: //evil.example/path',
      'bad-protocol: External launch target must use https: javascript:alert(1)',
      'bad-url: External launch target must be a valid URL: not a url'
    ]);
  });

  it('maps WASM interactions to registry entries by id and fails closed for unknown or empty interactions', () => {
    const launchable: HubInteraction = {
      kind: 'launchable',
      id: 'wild-haggis-survivors',
      title: 'Title drift from core'
    };
    const locked: HubInteraction = { kind: 'locked', id: 'future-bothy', title: 'Future Bothy' };
    const unknown: HubInteraction = { kind: 'launchable', id: 'missing-game', title: 'Missing Game' };
    const empty: HubInteraction = { kind: 'none', id: '', title: '' };

    expect(interactionToRegistryEntry(launchable, HUB_GAME_REGISTRY)?.title).toBe('Wild Haggis Survivors');
    expect(interactionToRegistryEntry(locked, HUB_GAME_REGISTRY)?.launch.kind).toBe('none');
    expect(interactionToRegistryEntry(unknown, HUB_GAME_REGISTRY)).toBeNull();
    expect(interactionToRegistryEntry(empty, HUB_GAME_REGISTRY)).toBeNull();
  });
});
