import type { GameInstance, GameModule, GameMountOptions } from './game-module';

export interface GameLifecycleHost {
  launch(module: GameModule, options: GameMountOptions): Promise<GameInstance>;
  pause(): void;
  resume(): void;
  destroy(): Promise<void>;
  current(): GameInstance | null;
}

interface ErrorWithPartialInstance extends Error {
  readonly instance?: GameInstance;
}

export function createGameLifecycleHost(target: HTMLElement): GameLifecycleHost {
  let currentInstance: GameInstance | null = null;
  let operations: Promise<void> = Promise.resolve();

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const queued = operations.then(operation, operation);
    operations = queued.then(
      () => undefined,
      () => undefined
    );
    return queued;
  }

  return {
    launch(module: GameModule, options: GameMountOptions): Promise<GameInstance> {
      return enqueue(async () => {
        await module.preload?.();
        const previous = currentInstance;
        currentInstance = null;

        try {
          currentInstance = await module.mount(target, options);
        } catch (error: unknown) {
          currentInstance = previous;
          await destroyPartialInstance(error);
          throw error;
        }

        await destroyInstance(previous);
        return currentInstance;
      });
    },
    pause(): void {
      currentInstance?.pause();
    },
    resume(): void {
      currentInstance?.resume();
    },
    destroy(): Promise<void> {
      return enqueue(async () => {
        await destroyInstance(currentInstance);
        currentInstance = null;
      });
    },
    current(): GameInstance | null {
      return currentInstance;
    },
  };
}

async function destroyPartialInstance(error: unknown): Promise<void> {
  if (!isErrorWithPartialInstance(error)) {
    return;
  }

  await destroyInstance(error.instance ?? null);
}

function isErrorWithPartialInstance(error: unknown): error is ErrorWithPartialInstance {
  return typeof error === 'object' && error !== null && 'instance' in error;
}

async function destroyInstance(instance: GameInstance | null): Promise<void> {
  await instance?.destroy();
}
