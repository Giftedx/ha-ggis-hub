import { describe, expect, it } from 'vitest';
import { createCanvasRoomRenderer, type CanvasRoomSurface } from './canvas-room';
import type { HubRoomRenderSnapshot } from '../hub/room';

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

function recordingSurface(width: number, height: number): { surface: CanvasRoomSurface; context: RecordingCanvasContext } {
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

const snapshot: HubRoomRenderSnapshot = {
  world: { width: 1_000, height: 1_000 },
  player: { x: 500, y: 500, halfExtent: 80, speedPerTick: 100 },
  doors: [
    {
      id: 'wild-haggis-survivors',
      title: 'Wild Haggis Survivors',
      status: 'launchable',
      bounds: { x: 820, y: 420, width: 120, height: 160 }
    },
    {
      id: 'future-bothy',
      title: 'Future Bothy',
      status: 'locked',
      bounds: { x: 80, y: 420, width: 120, height: 160 }
    }
  ],
  interaction: { kind: 'launchable', id: 'wild-haggis-survivors', title: 'Wild Haggis Survivors' }
};

describe('createCanvasRoomRenderer', () => {
  it('renders the first room from a deterministic room snapshot', () => {
    const { surface, context } = recordingSurface(500, 250);
    const renderer = createCanvasRoomRenderer(surface);

    renderer.render(snapshot);

    expect(context.calls).toContain('fillRect:#24170f:0,0,500,250');
    expect(context.calls).toContain('fillRect:#7a3f1d:410,105,60,40');
    expect(context.calls).toContain('strokeRect:#f4c95d:410,105,60,40');
    expect(context.calls).toContain('fillRect:#3d3328:40,105,60,40');
    expect(context.calls).toContain('arc:#8b5a2b:250,125,20');
    expect(context.calls).toContain('fillText:#f9efd2:Enter Wild Haggis Survivors:250,226');
  });

  it('fails loudly when Canvas2D is unavailable so the host can show fallback UI', () => {
    const surface: CanvasRoomSurface = {
      width: 500,
      height: 250,
      getContext: () => null
    };

    expect(() => createCanvasRoomRenderer(surface)).toThrow('Canvas2D context is unavailable');
  });
});
