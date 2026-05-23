export type GameLaunchSource = 'direct-play' | 'door' | 'route';

export interface GameMountOptions {
  readonly launchSource: GameLaunchSource;
  readonly reducedMotion: boolean;
}

export interface GameInstance {
  pause(): void;
  resume(): void;
  destroy(): void | Promise<void>;
  serialize?(): unknown;
  restore?(state: unknown): void;
}

export interface GameModule {
  readonly id: string;
  readonly title: string;
  preload?(): Promise<void>;
  mount(target: HTMLElement, options: GameMountOptions): Promise<GameInstance>;
}
