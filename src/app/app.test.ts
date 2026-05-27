import { describe, expect, it, vi } from 'vitest';

vi.mock('../games/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../games/registry')>();
  return { ...actual, validateGameRegistry: vi.fn(actual.validateGameRegistry) };
});

vi.mock('../navigation/launch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../navigation/launch')>();
  return { ...actual, createDirectPlayPlan: vi.fn(actual.createDirectPlayPlan) };
});

import { createAppModel } from './app';
import { validateGameRegistry } from '../games/registry';
import { createDirectPlayPlan } from '../navigation/launch';

describe('createAppModel', () => {
  it('describes the executable foundation without claiming gameplay is built', () => {
    expect(createAppModel()).toEqual({
      projectName: 'ha.ggis Hub',
      directPlay: {
        label: 'Play Wild Haggis Survivors',
        target: 'https://wild-haggis-survivors.pages.dev/',
        title: 'Wild Haggis Survivors'
      },
      music: {
        tracks: [
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
        ]
      }
    });
  });

  it('throws when the registry contains invalid entries', () => {
    vi.mocked(validateGameRegistry).mockReturnValueOnce(['id is required']);
    expect(() => createAppModel()).toThrow('Invalid game registry: id is required');
  });

  it('throws when the direct-play target is unavailable', () => {
    vi.mocked(createDirectPlayPlan).mockReturnValueOnce({
      kind: 'missing-game',
      gameId: 'wild-haggis-survivors',
      reason: 'Game is not registered'
    });
    expect(() => createAppModel()).toThrow('Direct play target is unavailable: Game is not registered');
  });
});
