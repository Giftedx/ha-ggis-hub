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
  destroy(): void;
}

export interface KeyboardEventSource {
  addEventListener(type: 'keydown' | 'keyup', listener: EventListener): void;
  removeEventListener(type: 'keydown' | 'keyup', listener: EventListener): void;
}

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const UP_KEYS = new Set(['ArrowUp', 'KeyW']);
const DOWN_KEYS = new Set(['ArrowDown', 'KeyS']);

export function inputVectorFromPressedKeys(pressedKeys: ReadonlySet<string>): HubInputVector {
  return {
    x: axisValue(pressedKeys, LEFT_KEYS, RIGHT_KEYS),
    y: axisValue(pressedKeys, UP_KEYS, DOWN_KEYS)
  };
}

export function createKeyboardInputSampler(target: KeyboardEventSource): KeyboardInputSampler {
  const pressedKeys = new Set<string>();
  let destroyed = false;

  const keydown: EventListener = (event) => {
    if (destroyed) {
      return;
    }
    pressedKeys.add(keyCodeFromEvent(event));
  };

  const keyup: EventListener = (event) => {
    if (destroyed) {
      return;
    }
    pressedKeys.delete(keyCodeFromEvent(event));
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
    destroy(): void {
      if (destroyed) {
        return;
      }

      destroyed = true;
      pressedKeys.clear();
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
