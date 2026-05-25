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
      }
    });
  });
});
