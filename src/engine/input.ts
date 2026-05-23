/**
 * Raw axis vector sampled from the keyboard. The host packs this into the
 * boundary's `InputSnapshot` bitfield via `main.ts` before each tick.
 */
export interface HubInputVector {
  readonly x: -1 | 0 | 1;
  readonly y: -1 | 0 | 1;
}

export interface KeyboardInputSampler {
  snapshot(): HubInputVector;
  /**
   * Edge-triggered interact: returns true ONCE per fresh press of an
   * interact key (Enter / Space / E), even if the key is held. Returns
   * false until the key is released and pressed again. Lets the game
   * loop call this every tick without the launch firing repeatedly.
   */
  consumeInteract(): boolean;
  destroy(): void;
}

export interface KeyboardEventSource {
  addEventListener(type: 'keydown' | 'keyup', listener: EventListener): void;
  removeEventListener(type: 'keydown' | 'keyup', listener: EventListener): void;
}

interface PreventDefaultEvent {
  preventDefault(): void;
}

function maybePreventDefault(event: Event, code: string): void {
  if (!HUB_KEYS.has(code)) return;
  // Test fakes may not implement preventDefault — feature-detect.
  const candidate = event as unknown as Partial<PreventDefaultEvent>;
  if (typeof candidate.preventDefault === 'function') {
    candidate.preventDefault();
  }
}

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const UP_KEYS = new Set(['ArrowUp', 'KeyW']);
const DOWN_KEYS = new Set(['ArrowDown', 'KeyS']);
const INTERACT_KEYS = new Set(['Enter', 'Space', 'KeyE']);

// All keys the hub claims — used to preventDefault so arrow keys
// don't scroll the page and Space doesn't trigger button activations.
const HUB_KEYS = new Set<string>([
  ...LEFT_KEYS, ...RIGHT_KEYS, ...UP_KEYS, ...DOWN_KEYS, ...INTERACT_KEYS
]);

export function inputVectorFromPressedKeys(pressedKeys: ReadonlySet<string>): HubInputVector {
  return {
    x: axisValue(pressedKeys, LEFT_KEYS, RIGHT_KEYS),
    y: axisValue(pressedKeys, UP_KEYS, DOWN_KEYS)
  };
}

export function createKeyboardInputSampler(target: KeyboardEventSource): KeyboardInputSampler {
  const pressedKeys = new Set<string>();
  // Interact keys that have been pressed AND already consumed by the
  // game loop. Cleared on keyup so the next press re-arms.
  const consumedInteractKeys = new Set<string>();
  let destroyed = false;

  const keydown: EventListener = (event) => {
    if (destroyed) {
      return;
    }
    const code = keyCodeFromEvent(event);
    pressedKeys.add(code);
    // Prevent default browser behaviour for hub-claimed keys (arrow-
    // scroll, Space-activating focused elements, Enter-following links).
    maybePreventDefault(event, code);
  };

  const keyup: EventListener = (event) => {
    if (destroyed) {
      return;
    }
    const code = keyCodeFromEvent(event);
    pressedKeys.delete(code);
    consumedInteractKeys.delete(code);
    maybePreventDefault(event, code);
  };

  target.addEventListener('keydown', keydown);
  target.addEventListener('keyup', keyup);

  return {
    snapshot(): HubInputVector {
      if (destroyed) {
        return { x: 0, y: 0 };
      }

      return inputVectorFromPressedKeys(pressedKeys);
    },
    consumeInteract(): boolean {
      if (destroyed) {
        return false;
      }
      for (const code of INTERACT_KEYS) {
        if (pressedKeys.has(code) && !consumedInteractKeys.has(code)) {
          consumedInteractKeys.add(code);
          return true;
        }
      }
      return false;
    },
    destroy(): void {
      if (destroyed) {
        return;
      }

      destroyed = true;
      pressedKeys.clear();
      consumedInteractKeys.clear();
      target.removeEventListener('keydown', keydown);
      target.removeEventListener('keyup', keyup);
    }
  };
}

function axisValue(
  pressedKeys: ReadonlySet<string>,
  negativeKeys: ReadonlySet<string>,
  positiveKeys: ReadonlySet<string>
): -1 | 0 | 1 {
  const negative = hasAny(pressedKeys, negativeKeys);
  const positive = hasAny(pressedKeys, positiveKeys);

  if (negative === positive) {
    return 0;
  }

  return positive ? 1 : -1;
}

function hasAny(pressedKeys: ReadonlySet<string>, candidates: ReadonlySet<string>): boolean {
  for (const candidate of candidates) {
    if (pressedKeys.has(candidate)) {
      return true;
    }
  }

  return false;
}

function keyCodeFromEvent(event: Event): string {
  if ('code' in event && typeof event.code === 'string') {
    return event.code;
  }

  return '';
}
