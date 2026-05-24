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

  dispatch(type: string, code: string): { preventedDefault: boolean } {
    let preventedDefault = false;
    const event = {
      code,
      preventDefault: () => { preventedDefault = true; }
    } as unknown as Event;
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
    return { preventedDefault };
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

  it('fires consumeInteract once per fresh press, then waits for release', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);

    expect(sampler.consumeInteract()).toBe(false);
    target.dispatch('keydown', 'Enter');
    expect(sampler.consumeInteract()).toBe(true);
    // Still held — repeated calls return false until release.
    expect(sampler.consumeInteract()).toBe(false);
    expect(sampler.consumeInteract()).toBe(false);
    // Release re-arms.
    target.dispatch('keyup', 'Enter');
    target.dispatch('keydown', 'Enter');
    expect(sampler.consumeInteract()).toBe(true);
  });

  it('treats Space and KeyE as interact keys', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);
    target.dispatch('keydown', 'Space');
    expect(sampler.consumeInteract()).toBe(true);
    target.dispatch('keyup', 'Space');
    target.dispatch('keydown', 'KeyE');
    expect(sampler.consumeInteract()).toBe(true);
  });

  it('preventDefault fires for hub-claimed keys so arrows do not scroll', () => {
    const target = new FakeKeyboardTarget();
    createKeyboardInputSampler(target);
    // Movement keys — preventDefault stops page scroll.
    expect(target.dispatch('keydown', 'ArrowDown').preventedDefault).toBe(true);
    expect(target.dispatch('keydown', 'ArrowRight').preventedDefault).toBe(true);
    // Interact keys — preventDefault stops Space activating buttons.
    expect(target.dispatch('keydown', 'Space').preventedDefault).toBe(true);
    expect(target.dispatch('keydown', 'Enter').preventedDefault).toBe(true);
    // Unrelated keys — no preventDefault, browser keeps default behaviour.
    expect(target.dispatch('keydown', 'Tab').preventedDefault).toBe(false);
    expect(target.dispatch('keydown', 'KeyM').preventedDefault).toBe(false);
  });

  it('movement keys are not interact keys', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);
    target.dispatch('keydown', 'ArrowRight');
    target.dispatch('keydown', 'KeyD');
    expect(sampler.consumeInteract()).toBe(false);
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

  it('snapshot and consumeInteract return zero/false after destroy', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);
    target.dispatch('keydown', 'KeyD');
    sampler.destroy();
    expect(sampler.snapshot()).toEqual({ x: 0, y: 0 });
    expect(sampler.consumeInteract()).toBe(false);
  });

  it('double-destroy is a no-op (idempotent)', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);
    sampler.destroy();
    expect(() => sampler.destroy()).not.toThrow();
  });

  it('ignores events without a code property (keyCodeFromEvent fallback)', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);
    // Dispatch a bare event with no `code` property — the fallback returns ''
    // which is not in any key set, so snapshot stays neutral.
    const listeners = (target as unknown as { listeners: Map<string, Set<EventListener>> }).listeners;
    const bare = {} as Event;
    for (const listener of listeners.get('keydown') ?? []) { listener(bare); }
    expect(sampler.snapshot()).toEqual({ x: 0, y: 0 });
  });

  it('destroyed guard fires in keydown/keyup when handler is invoked directly after destroy', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);
    const listeners = (target as unknown as { listeners: Map<string, Set<EventListener>> }).listeners;
    // Save handler refs BEFORE destroy removes them from the target.
    const kdListeners = [...(listeners.get('keydown') ?? [])];
    const kuListeners = [...(listeners.get('keyup') ?? [])];
    target.dispatch('keydown', 'KeyD');
    expect(sampler.snapshot()).toEqual({ x: 1, y: 0 });
    sampler.destroy();
    // After destroy the sampler is empty; directly invoking the saved handlers
    // (bypassing removeEventListener) exercises the `if (destroyed) return`
    // guard at lines 68 (keydown) and 79 (keyup) — both must be no-ops.
    const fakeEvent = { code: 'KeyA' } as unknown as Event;
    for (const fn of kdListeners) { fn(fakeEvent); }
    for (const fn of kuListeners) { fn(fakeEvent); }
    expect(sampler.snapshot()).toEqual({ x: 0, y: 0 });
  });

  it('handles a hub-claimed key event that lacks preventDefault (feature-detect false branch)', () => {
    const target = new FakeKeyboardTarget();
    const sampler = createKeyboardInputSampler(target);
    // Dispatch ArrowLeft as a raw event WITHOUT preventDefault — exercises
    // the `typeof candidate.preventDefault !== 'function'` false branch.
    const listeners = (target as unknown as { listeners: Map<string, Set<EventListener>> }).listeners;
    const noPD = { code: 'ArrowLeft' } as unknown as Event;
    for (const listener of listeners.get('keydown') ?? []) { listener(noPD); }
    expect(sampler.snapshot().x).toBe(-1);
    sampler.destroy();
  });
});
