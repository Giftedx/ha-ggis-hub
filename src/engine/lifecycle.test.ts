import { describe, expect, it, vi } from 'vitest';
import { createGameLifecycleHost } from './lifecycle';
import type { GameInstance, GameModule } from './game-module';

function testInstance(): GameInstance & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    pause: () => {
      calls.push('pause');
    },
    resume: () => {
      calls.push('resume');
    },
    destroy: () => {
      calls.push('destroy');
    }
  };
}

describe('game lifecycle host', () => {
  it('preloads before mount and forwards pause/resume/destroy to the active instance', async () => {
    const calls: string[] = [];
    const instance = testInstance();
    const module: GameModule = {
      id: 'wild-haggis-survivors',
      title: 'Wild Haggis Survivors',
      preload: async () => {
        calls.push('preload');
      },
      mount: async () => {
        calls.push('mount');
        return instance;
      }
    };
    const host = createGameLifecycleHost({} as HTMLElement);

    await host.launch(module, { launchSource: 'direct-play', reducedMotion: false });
    host.pause();
    host.resume();
    await host.destroy();

    expect(calls).toEqual(['preload', 'mount']);
    expect(instance.calls).toEqual(['pause', 'resume', 'destroy']);
    expect(host.current()).toBeNull();
  });

  it('destroys the previous instance before launching a replacement', async () => {
    const first = testInstance();
    const second = testInstance();
    const target = {} as HTMLElement;
    const firstModule: GameModule = {
      id: 'first',
      title: 'First',
      mount: async () => first
    };
    const secondModule: GameModule = {
      id: 'second',
      title: 'Second',
      mount: async (mountTarget) => {
        expect(mountTarget).toBe(target);
        expect(first.calls).toEqual(['destroy']);
        return second;
      }
    };
    const host = createGameLifecycleHost(target);

    await host.launch(firstModule, { launchSource: 'route', reducedMotion: true });
    await host.launch(secondModule, { launchSource: 'door', reducedMotion: true });

    expect(host.current()).toBe(second);
    expect(second.calls).toEqual([]);
  });

  it('serializes overlapping launches so stale work cannot replace a newer active instance', async () => {
    const calls: string[] = [];
    const first = testInstance();
    const second = testInstance();
    let releaseFirstPreload: (() => void) | undefined;
    const host = createGameLifecycleHost({} as HTMLElement);

    const firstLaunch = host.launch(
      {
        id: 'first',
        title: 'First',
        preload: () =>
          new Promise<void>((resolve) => {
            releaseFirstPreload = resolve;
          }),
        mount: async () => {
          calls.push('first mount');
          return first;
        }
      },
      { launchSource: 'route', reducedMotion: false }
    );
    const secondLaunch = host.launch(
      {
        id: 'second',
        title: 'Second',
        mount: async () => {
          calls.push('second mount');
          return second;
        }
      },
      { launchSource: 'route', reducedMotion: false }
    );

    expect(host.current()).toBeNull();
    await Promise.resolve();
    releaseFirstPreload?.();

    await firstLaunch;
    await secondLaunch;

    expect(calls).toEqual(['first mount', 'second mount']);
    expect(first.calls).toEqual(['destroy']);
    expect(host.current()).toBe(second);
  });

  it('keeps an existing instance running when replacement preload fails', async () => {
    const current = testInstance();
    const host = createGameLifecycleHost({} as HTMLElement);
    await host.launch({ id: 'current', title: 'Current', mount: async () => current }, { launchSource: 'route', reducedMotion: false });

    await expect(
      host.launch(
        {
          id: 'failing',
          title: 'Failing',
          preload: async () => {
            throw new Error('preload failed');
          },
          mount: async () => testInstance()
        },
        { launchSource: 'route', reducedMotion: false }
      )
    ).rejects.toThrow('preload failed');

    expect(host.current()).toBe(current);
    expect(current.calls).toEqual([]);
  });

  it('cleans up a partially mounted instance when mount throws after creating one', async () => {
    const partial = testInstance();
    const host = createGameLifecycleHost({} as HTMLElement);

    await expect(
      host.launch(
        {
          id: 'partial',
          title: 'Partial',
          mount: () => Promise.reject(Object.assign(new Error('mount failed'), { instance: partial }))
        },
        { launchSource: 'route', reducedMotion: false }
      )
    ).rejects.toThrow('mount failed');

    expect(partial.calls).toEqual(['destroy']);
    expect(host.current()).toBeNull();
  });

  it('treats pause, resume, and repeated destroy as safe no-ops without an active instance', async () => {
    const host = createGameLifecycleHost({} as HTMLElement);
    const destroySpy = vi.fn();

    host.pause();
    host.resume();
    await host.destroy();
    await host.destroy();
    destroySpy();

    expect(destroySpy).toHaveBeenCalledOnce();
    expect(host.current()).toBeNull();
  });
});
