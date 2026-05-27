import { describe, expect, it } from 'vitest';
import { createAppModel } from './app';

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
});
