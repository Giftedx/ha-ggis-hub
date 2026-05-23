import { describe, expect, it } from 'vitest';
import { createCanvasRoomRenderer, type CanvasRoomSurface } from './canvas-room';
import type { RoomDefinition } from '../wasm/boundary-v2';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';

class RecordingCanvasContext {
  readonly calls: string[] = [];
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 0;
  font = '';
  textAlign: CanvasTextAlign = 'start';

  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`fillRect:${this.fillStyle}:${x},${y},${width},${height}`);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`strokeRect:${this.strokeStyle}:${x},${y},${width},${height}`);
  }

  beginPath(): void {
    this.calls.push('beginPath');
  }

  arc(x: number, y: number, radius: number): void {
    this.calls.push(`arc:${this.fillStyle}:${x},${y},${radius}`);
  }

  fill(): void {
    this.calls.push(`fill:${this.fillStyle}`);
  }

  fillText(text: string, x: number, y: number): void {
    this.calls.push(`fillText:${this.fillStyle}:${text}:${x},${y}`);
  }
}

function recordingSurface(
  width: number,
  height: number
): { surface: CanvasRoomSurface; context: RecordingCanvasContext } {
  const context = new RecordingCanvasContext();
  return {
    surface: {
      width,
      height,
      getContext(kind: '2d') {
        expect(kind).toBe('2d');
        return context;
      }
    },
    context
  };
}

const ROOM: RoomDefinition = {
  worldWidth: 1_000,
  worldHeight: 1_000,
  doors: [
    {
      id: 'wild-haggis-survivors',
      status: 'launchable',
      bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 }
    },
    {
      id: 'future-bothy',
      status: 'locked',
      bounds: { minX: 80, minY: 420, maxX: 200, maxY: 580 }
    }
  ]
};

const SNAPSHOT_WITH_LAUNCHABLE: DecodedSnapshot = {
  playerX: 500,
  playerY: 500,
  playerHalfExtent: 80,
  worldWidth: 1_000,
  worldHeight: 1_000,
  interactionKind: 'launchable',
  interactionDoorIndex: 0,
  doors: [
    {
      id: 'wild-haggis-survivors',
      status: 'launchable',
      bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 }
    },
    {
      id: 'future-bothy',
      status: 'locked',
      bounds: { minX: 80, minY: 420, maxX: 200, maxY: 580 }
    }
  ]
};

describe('createCanvasRoomRenderer', () => {
  it('renders the first room from a deterministic snapshot using the room definition for door layout', () => {
    const { surface, context } = recordingSurface(500, 250);
    const renderer = createCanvasRoomRenderer(surface, ROOM);

    renderer.render(SNAPSHOT_WITH_LAUNCHABLE);

    expect(context.calls).toContain('fillRect:#24170f:0,0,500,250');
    expect(context.calls).toContain('fillRect:#7a3f1d:410,105,60,40');
    expect(context.calls).toContain('strokeRect:#f4c95d:410,105,60,40');
    expect(context.calls).toContain('fillRect:#3d3328:40,105,60,40');
    expect(context.calls).toContain('arc:#8b5a2b:250,125,20');
    expect(context.calls).toContain('fillText:#f9efd2:Enter Wild Haggis Survivors:250,226');
  });

  it('emits draw calls in background-then-doors-then-haggis-then-prompt order', () => {
    const { surface, context } = recordingSurface(500, 250);
    const renderer = createCanvasRoomRenderer(surface, ROOM);

    renderer.render(SNAPSHOT_WITH_LAUNCHABLE);

    const indexOfBackground = context.calls.indexOf('fillRect:#24170f:0,0,500,250');
    const indexOfDoor = context.calls.indexOf('fillRect:#7a3f1d:410,105,60,40');
    const indexOfHaggis = context.calls.indexOf('arc:#8b5a2b:250,125,20');
    const indexOfPrompt = context.calls.indexOf('fillText:#f9efd2:Enter Wild Haggis Survivors:250,226');

    expect(indexOfBackground).toBeGreaterThanOrEqual(0);
    expect(indexOfDoor).toBeGreaterThan(indexOfBackground);
    expect(indexOfHaggis).toBeGreaterThan(indexOfDoor);
    expect(indexOfPrompt).toBeGreaterThan(indexOfHaggis);
  });

  it('falls back to a kebab-prettified title when the door id is not in the games registry', () => {
    const { surface, context } = recordingSurface(500, 250);
    const room: RoomDefinition = {
      worldWidth: 1_000,
      worldHeight: 1_000,
      doors: [
        {
          id: 'mystery-room',
          status: 'launchable',
          bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 }
        }
      ]
    };
    const snapshot: DecodedSnapshot = {
      playerX: 500,
      playerY: 500,
      playerHalfExtent: 80,
      worldWidth: 1_000,
      worldHeight: 1_000,
      interactionKind: 'launchable',
      interactionDoorIndex: 0,
      doors: [
        {
          id: 'mystery-room',
          status: 'launchable',
          bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 }
        }
      ]
    };

    createCanvasRoomRenderer(surface, room).render(snapshot);

    expect(context.calls).toContain('fillText:#f9efd2:Enter Mystery Room:250,226');
  });

  it('omits the prompt when there is no interaction', () => {
    const { surface, context } = recordingSurface(500, 250);
    const renderer = createCanvasRoomRenderer(surface, ROOM);

    renderer.render({
      ...SNAPSHOT_WITH_LAUNCHABLE,
      interactionKind: 'none'
    });

    expect(context.calls.find((c) => c.startsWith('fillText:'))).toBeUndefined();
    // Door outline is also suppressed when nothing is being interacted with.
    expect(context.calls.find((c) => c.startsWith('strokeRect:'))).toBeUndefined();
  });

  it('fails loudly when Canvas2D is unavailable so the host can show fallback UI', () => {
    const surface: CanvasRoomSurface = {
      width: 500,
      height: 250,
      getContext: () => null
    };

    expect(() => createCanvasRoomRenderer(surface, ROOM)).toThrow('Canvas2D context is unavailable');
  });
});
