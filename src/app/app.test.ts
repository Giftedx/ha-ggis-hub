import { describe, expect, it } from 'vitest';
import { createAppModel } from './app';

describe('createAppModel', () => {
  it('describes the executable foundation without claiming gameplay is built', () => {
    expect(createAppModel()).toEqual({
      projectName: 'ha.ggis Hub',
      publicUrl: 'https://ha.ggis.xyz',
      stack: 'Rust hub-core -> WASM wrapper -> TypeScript/Vite host -> replaceable renderer',
      phase: 'Canvas2D first-room slice with Rust/WASM movement, registry, input, and direct play seams',
      directPlay: {
        label: 'Play Wild Haggis Survivors',
        target: 'https://wild-haggis-survivors.pages.dev/',
        title: 'Wild Haggis Survivors'
      }
    });
  });
});
