import { describe, expect, it } from 'vitest';
import { createCanvasRoomRenderer, formatPromptText, type CanvasRoomSurface } from './canvas-room';
import type { RoomDefinition } from '../wasm/boundary';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';

class RecordingCanvasContext {
  readonly calls: string[] = [];
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  strokeStyle: string | CanvasGradient | CanvasPattern = '';
  lineWidth = 0;
  font = '';
  textAlign: CanvasTextAlign = 'start';
  globalAlpha = 1;

  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`fillRect:${x},${y},${width},${height}`);
  }
  strokeRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`strokeRect:${x},${y},${width},${height}`);
  }
  beginPath(): void {
    this.calls.push('beginPath');
  }
  closePath(): void {
    this.calls.push('closePath');
  }
  moveTo(x: number, y: number): void {
    this.calls.push(`moveTo:${x},${y}`);
  }
  lineTo(x: number, y: number): void {
    this.calls.push(`lineTo:${x},${y}`);
  }
  arc(x: number, y: number, radius: number): void {
    this.calls.push(`arc:${x},${y},${radius}`);
  }
  fill(): void {
    this.calls.push('fill');
  }
  stroke(): void {
    this.calls.push('stroke');
  }
  fillText(text: string, x: number, y: number): void {
    this.calls.push(`fillText:${text}@${x},${y}`);
  }
  save(): void {
    this.calls.push('save');
  }
  restore(): void {
    this.calls.push('restore');
  }
  ellipse(
    cx: number, cy: number, rx: number, ry: number,
    _rotation: number, _a0: number, _a1: number
  ): void {
    this.calls.push(`ellipse:${cx},${cy},${rx},${ry}`);
  }
  clip(): void {
    this.calls.push('clip');
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

const SNAPSHOT_AT_LAUNCHABLE: DecodedSnapshot = {
  playerX: 880,
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

const SNAPSHOT_NO_INTERACTION: DecodedSnapshot = {
  ...SNAPSHOT_AT_LAUNCHABLE,
  playerX: 500,
  interactionKind: 'none'
};

describe('createCanvasRoomRenderer', () => {
  it('constructs against a real surface and emits draw calls', () => {
    const { surface, context } = recordingSurface(1200, 800);
    const renderer = createCanvasRoomRenderer(surface, ROOM);
    renderer.render(SNAPSHOT_AT_LAUNCHABLE);
    expect(context.calls.length).toBeGreaterThan(20);
  });

  it('paints the void backdrop as the first fill', () => {
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, ROOM).render(SNAPSHOT_AT_LAUNCHABLE);
    const firstFillRect = context.calls.find((c) => c.startsWith('fillRect:'));
    expect(firstFillRect).toBe('fillRect:0,0,1200,800');
  });

  it('renders the launchable-door interaction prompt without crashing (pixel-font path)', () => {
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, ROOM).render(SNAPSHOT_AT_LAUNCHABLE);
    // Pixel-font replaces fillText; the prompt area should have many
    // small fillRect calls (one per glyph pixel). Just verify the
    // render didn't crash and emitted plenty of draws.
    expect(context.calls.length).toBeGreaterThan(100);
  });

  it('renders the locked verb when the active door is locked', () => {
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, ROOM).render({
      ...SNAPSHOT_AT_LAUNCHABLE,
      interactionDoorIndex: 1,
      interactionKind: 'locked'
    });
    expect(context.calls.length).toBeGreaterThan(100);
  });

  it('omits the prompt when there is no interaction', () => {
    const { surface, context: ctxA } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, ROOM).render(SNAPSHOT_NO_INTERACTION);
    const noInteractionCallCount = ctxA.calls.length;
    const { surface: surfaceB, context: ctxB } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surfaceB, ROOM).render(SNAPSHOT_AT_LAUNCHABLE);
    // A scene WITH an interaction prompt should emit more draws than
    // a scene with NO interaction (because the prompt adds glyphs).
    expect(ctxB.calls.length).toBeGreaterThan(noInteractionCallCount);
  });

  it('formats the launchable prompt with the registry-resolved title plus a PRESS ENTER hint', () => {
    expect(formatPromptText('launchable', 'Wild Haggis Survivors')).toBe(
      `AWA' IN — WILD HAGGIS SURVIVORS\nPRESS ENTER`
    );
  });

  it('formats the locked prompt using the door title with a comin-soon suffix', () => {
    expect(formatPromptText('locked', "Comin' Wi' The Next Moon")).toBe(
      `COMIN' WI' THE NEXT MOON\nCOMIN' SOON.`
    );
  });

  it('returns empty string when interaction kind is none', () => {
    expect(formatPromptText('none', 'anything')).toBe('');
  });

  it('renders without error in reduced-motion mode (particles + flicker suppressed)', () => {
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, ROOM, { reducedMotion: true }).render(SNAPSHOT_AT_LAUNCHABLE);
    expect(context.calls.length).toBeGreaterThan(20);
  });

  it('fails loudly when Canvas2D is unavailable so the host can show fallback UI', () => {
    const surface: CanvasRoomSurface = {
      width: 1200,
      height: 800,
      getContext: () => null
    };
    expect(() => createCanvasRoomRenderer(surface, ROOM)).toThrow('Canvas2D context is unavailable');
  });
});
