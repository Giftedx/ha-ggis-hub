export interface AppModel {
  readonly projectName: string;
  readonly publicUrl: string;
  readonly stack: string;
  readonly phase: string;
}

export function createAppModel(): AppModel {
  return {
    projectName: 'ha.ggis Hub',
    publicUrl: 'https://ha.ggis.xyz',
    stack: 'Rust hub-core -> WASM wrapper -> TypeScript/Vite host -> replaceable renderer',
    phase: 'executable foundation skeleton'
  };
}
