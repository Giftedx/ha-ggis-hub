export const SNAPSHOT_BYTES_HEADER = 32;
export const DOOR_ID_CAPACITY = 32;
export const DOOR_SLOT_LEN = DOOR_ID_CAPACITY + 4 * 4 + 4;
export const MAX_DOORS_PER_SNAPSHOT = 8;
export const SNAPSHOT_BYTES = SNAPSHOT_BYTES_HEADER + MAX_DOORS_PER_SNAPSHOT * DOOR_SLOT_LEN;

export type DecodedInteractionKind = 'none' | 'launchable' | 'locked';

export interface DecodedDoor {
  readonly id: string;
  readonly status: 'launchable' | 'locked';
  readonly bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}

export interface DecodedSnapshot {
  readonly playerX: number;
  readonly playerY: number;
  readonly playerHalfExtent: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly interactionKind: DecodedInteractionKind;
  readonly interactionDoorIndex: number;
  readonly doors: readonly DecodedDoor[];
}

export function decodeSnapshot(bytes: Uint8Array): DecodedSnapshot {
  if (bytes.byteLength !== SNAPSHOT_BYTES) {
    throw new Error(`snapshot buffer must be ${SNAPSHOT_BYTES} bytes, got ${bytes.byteLength}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const playerX = view.getInt32(0, true);
  const playerY = view.getInt32(4, true);
  const playerHalfExtent = view.getInt32(8, true);
  const worldWidth = view.getInt32(12, true);
  const worldHeight = view.getInt32(16, true);
  const interactionKind = interactionKindFromU8(view.getInt32(20, true));
  const interactionDoorIndex = view.getInt32(24, true);
  const doorCount = view.getInt32(28, true);

  const doors: DecodedDoor[] = [];
  for (let i = 0; i < doorCount; i += 1) {
    const base = SNAPSHOT_BYTES_HEADER + i * DOOR_SLOT_LEN;
    const id = readNulTerminatedAscii(bytes, base, DOOR_ID_CAPACITY);
    const minX = view.getInt32(base + DOOR_ID_CAPACITY, true);
    const minY = view.getInt32(base + DOOR_ID_CAPACITY + 4, true);
    const maxX = view.getInt32(base + DOOR_ID_CAPACITY + 8, true);
    const maxY = view.getInt32(base + DOOR_ID_CAPACITY + 12, true);
    const statusInt = view.getInt32(base + DOOR_ID_CAPACITY + 16, true);
    doors.push({
      id,
      status: statusInt === 1 ? 'launchable' : 'locked',
      bounds: { minX, minY, maxX, maxY },
    });
  }

  return {
    playerX,
    playerY,
    playerHalfExtent,
    worldWidth,
    worldHeight,
    interactionKind,
    interactionDoorIndex,
    doors,
  };
}

function interactionKindFromU8(value: number): DecodedInteractionKind {
  if (value === 1) return 'launchable';
  if (value === 2) return 'locked';
  return 'none';
}

function readNulTerminatedAscii(bytes: Uint8Array, offset: number, capacity: number): string {
  let end = offset;
  while (end < offset + capacity && bytes[end] !== 0) {
    end += 1;
  }
  let out = '';
  for (let i = offset; i < end; i += 1) {
    out += String.fromCharCode(bytes[i]!);
  }
  return out;
}
