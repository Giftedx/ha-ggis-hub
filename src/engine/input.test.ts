import { describe, expect, it } from 'vitest';
import { createKeyboardInputSampler, inputVectorFromPressedKeys } from './input';

class FakeKeyboardTarget {
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const listenersForType = this.listeners.get(type) ?? new Set<EventListener>();
    listenersForType.add(listener);
    this.listeners.set(type, listenersForType);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, code: string): void {
    const event = { code } as unknown as Event;
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe('input sampling', () => {
  it('maps arrow keys and WASD to compact Rust-compatible axes', () => {
    expect(inputVectorFromPressedKeys(new Set(['ArrowRight']))).toEqual({ x: 1, y: 0 });
    expect(inputVectorFromPressedKeys(new Set(['ArrowLeft']))).toEqual({ x: -1, y: 0 });
    expect(inputVectorFromPressedKeys(new Set(['ArrowUp']))).toEqual({ x: 0, y: -1 });
    expect(inputVectorFromPressedKeys(new Set(['ArrowDown']))).toEqual({ x: 0, y: 1 });
    expect(inputVectorFromPressedKeys(new Set(['KeyD', 'KeyW']))).toEqual({ x: 1, y: -1 });
    expect(inputVectorFromPressedKeys(new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS']))).toEqual({ x: 0, y: 0 });
  });

  it('ignores unrelated keys and tracks keyup cleanup', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);

    target.dispatch('keydown', 'KeyD');
    target.dispatch('keydown', 'ShiftLeft');
    expect(sampler.snapshot()).toEqual({ x: 1, y: 0 });

    target.dispatch('keyup', 'KeyD');
    expect(sampler.snapshot()).toEqual({ x: 0, y: 0 });
  });

  it('removes listeners when destroyed', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);

    target.dispatch('keydown', 'KeyD');
    expect(sampler.snapshot()).toEqual({ x: 1, y: 0 });

    sampler.destroy();
    target.dispatch('keyup', 'KeyD');
    target.dispatch('keydown', 'KeyA');

    expect(sampler.snapshot()).toEqual({ x: 0, y: 0 });
  });
});
