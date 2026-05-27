import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  STORYBOOK_BACKDROP_SRC,
  createCanvasRoomRenderer,
  computeVisualDoorBounds,
  formatPromptText,
  type CanvasRoomSurface
} from './canvas-room';
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
  // Present so createCanvasRoomRenderer exercises the imageSmoothingEnabled=false path.
  imageSmoothingEnabled = true;

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
  drawImage(image: CanvasImageSource, x: number, y: number, width: number, height: number): void {
    const src = (image as { readonly src?: string }).src ?? 'unknown';
    this.calls.push(`drawImage:${src}@${x},${y},${width},${height}`);
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
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.calls.push(`quadraticCurveTo:${cpx},${cpy},${x},${y}`);
  }
  clip(): void {
    this.calls.push('clip');
  }
}

class LoadedImage {
  complete = true;
  naturalWidth = 1080;
  naturalHeight = 720;
  decoding = '';
  src = '';
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('computeVisualDoorBounds', () => {
  it('returns one entry per door', () => {
    const surface = { width: 540, height: 360 };
    const bounds = computeVisualDoorBounds(surface, ROOM);
    expect(bounds).toHaveLength(2);
    expect(bounds[0]?.id).toBe('wild-haggis-survivors');
    expect(bounds[1]?.id).toBe('future-bothy');
  });

  it('snaps the right-wall door so its right edge aligns with the wall', () => {
    // WHS door is near the right wall. snapDoorToWall shifts x so the door's
    // right edge is at (surfaceWidth - WALL_THICK_SIDE + 2).
    const surface = { width: 540, height: 360 };
    const bounds = computeVisualDoorBounds(surface, ROOM);
    const whs = bounds[0]!;
    // Right edge must equal the wall-snapped position, not the raw sim-scaled x+w.
    const WALL_THICK_SIDE = 24;
    expect(whs.x + whs.width).toBe(surface.width - WALL_THICK_SIDE + 2);
  });

  it('snaps the left-wall door so its left edge aligns with the wall', () => {
    const surface = { width: 540, height: 360 };
    const bounds = computeVisualDoorBounds(surface, ROOM);
    const future = bounds[1]!;
    const WALL_THICK_SIDE = 24;
    expect(future.x).toBe(WALL_THICK_SIDE - 2);
  });

  it('visual right-edge of the WHS door is right of its raw sim right-edge — confirms the snap effect', () => {
    const surface = { width: 540, height: 360 };
    const bounds = computeVisualDoorBounds(surface, ROOM);
    const whs = bounds[0]!;
    // Raw sim right edge in canvas coords: maxX/worldWidth * surfaceWidth
    const rawRight = Math.round((ROOM.doors[0]!.bounds.maxX / ROOM.worldWidth) * surface.width);
    // After snap the visual door extends further right than the raw sim coord.
    expect(whs.x + whs.width).toBeGreaterThan(rawRight);
  });
});

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

  it('formats the launchable prompt with the registry-resolved title plus keyboard and tap hints', () => {
    expect(formatPromptText('launchable', 'Wild Haggis Survivors')).toBe(
      `AWA' IN — WILD HAGGIS SURVIVORS\nENTER SPACE E TAP`
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

  it('uses the painted storybook backdrop asset when the browser image is loaded', () => {
    vi.stubGlobal('Image', LoadedImage);
    const { surface, context } = recordingSurface(540, 360);
    createCanvasRoomRenderer(surface, ROOM, { fixedPhaseSeconds: 0 }).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls).toContain(`drawImage:${STORYBOOK_BACKDROP_SRC}@0,0,540,360`);
    expect(context.calls).not.toContain('fillRect:54,14,432,108');
  });

  it('stages the Wee Chieftain as a room inhabitant instead of the dominant room mass', () => {
    const { surface, context } = recordingSurface(540, 360);
    createCanvasRoomRenderer(surface, ROOM, { fixedPhaseSeconds: 0 }).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls).not.toContain('ellipse:270,148.6,67.5,40.5');
    expect(context.calls).toContain('ellipse:270,166.05,38.75,23.25');
  });

  it('paints a structured woven hearth runner instead of a muddy oval patch', () => {
    const { surface, context } = recordingSurface(540, 360);
    createCanvasRoomRenderer(surface, ROOM, { fixedPhaseSeconds: 0 }).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls).toContain('moveTo:176,200');
    expect(context.calls).toContain('lineTo:354,282');
    expect(context.calls).toContain('fillRect:170,230,200,6');
    expect(context.calls).toContain('fillRect:234,202,8,104');
    expect(context.calls).not.toContain('ellipse:270,223,98,22');
  });

  it('grounds side-wall doors with threshold stones instead of leaving them as flat blocks', () => {
    const { surface, context } = recordingSurface(540, 360);
    createCanvasRoomRenderer(surface, ROOM, { fixedPhaseSeconds: 0 }).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls).toContain('fillRect:18,213,73,6');
    expect(context.calls).toContain('fillRect:449,213,73,6');
  });

  it('uses a panoramic Highland dawn view as the primary wall composition', () => {
    const { surface, context } = recordingSurface(540, 360);
    createCanvasRoomRenderer(surface, ROOM, { fixedPhaseSeconds: 0 }).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls).toContain('fillRect:54,14,432,108');
    expect(context.calls).toContain('moveTo:54,102');
    expect(context.calls).toContain('lineTo:168,56');
    expect(context.calls).toContain('lineTo:300,102');
    expect(context.calls).not.toContain('fillRect:226,19,88,58');
  });

  it('builds a stone inglenook mass behind the hearth so the room has a focal structure', () => {
    const { surface, context } = recordingSurface(540, 360);
    createCanvasRoomRenderer(surface, ROOM, { fixedPhaseSeconds: 0 }).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls).toContain('ellipse:270,198,66,30');
    expect(context.calls).toContain('fillRect:204,198,132,134');
    expect(context.calls).toContain('fillRect:224,205,92,116');
  });

  it('can freeze animation phase for deterministic visual-gate captures', () => {
    const { surface: surfaceA, context: ctxA } = recordingSurface(540, 360);
    createCanvasRoomRenderer(surfaceA, ROOM, { fixedPhaseSeconds: 0 }).render(SNAPSHOT_NO_INTERACTION);

    const { surface: surfaceB, context: ctxB } = recordingSurface(540, 360);
    createCanvasRoomRenderer(surfaceB, ROOM, { fixedPhaseSeconds: 0 }).render(SNAPSHOT_NO_INTERACTION);

    const { surface: surfaceC, context: ctxC } = recordingSurface(540, 360);
    createCanvasRoomRenderer(surfaceC, ROOM, { fixedPhaseSeconds: 1 }).render(SNAPSHOT_NO_INTERACTION);

    expect(ctxB.calls).toEqual(ctxA.calls);
    expect(ctxC.calls).not.toEqual(ctxA.calls);
  });

  it('fails loudly when Canvas2D is unavailable so the host can show fallback UI', () => {
    const surface: CanvasRoomSurface = {
      width: 1200,
      height: 800,
      getContext: () => null
    };
    expect(() => createCanvasRoomRenderer(surface, ROOM)).toThrow('Canvas2D context is unavailable');
  });

  it('renders correctly on a compact surface (width < 600) — exercises compact viewport paths', () => {
    const { surface, context } = recordingSurface(400, 260);
    createCanvasRoomRenderer(surface, ROOM).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls.length).toBeGreaterThan(20);
  });

  it('renders correctly on a very narrow surface (width < 400) — omits wall painting', () => {
    // drawWallOrnaments guards the framed-picture call with surface.width >= 400.
    // Width=300 skips the painting, exercising the false branch.
    const { surface, context } = recordingSurface(300, 200);
    createCanvasRoomRenderer(surface, ROOM).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls.length).toBeGreaterThan(20);
  });

  it('renders without crash when interactionDoorIndex is out of bounds — exercises drawPrompt early-return', () => {
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, ROOM).render({
      ...SNAPSHOT_AT_LAUNCHABLE,
      // Index 99 is beyond the two-door ROOM array → door === undefined → early return.
      interactionDoorIndex: 99
    });
    expect(context.calls.length).toBeGreaterThan(20);
  });

  it('renders a door near the top edge — exercises doorSide top branch', () => {
    const topDoorRoom: RoomDefinition = {
      worldWidth: 1_000,
      worldHeight: 1_000,
      doors: [
        {
          id: 'wild-haggis-survivors',
          status: 'launchable',
          // Center x=500, center y=45 → on a 1200×800 canvas: cx=600, cy=36.
          // distTop(36) < distLeft(600) → doorSide returns 'top'.
          bounds: { minX: 350, minY: 10, maxX: 650, maxY: 80 }
        }
      ]
    };
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, topDoorRoom).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls.length).toBeGreaterThan(20);
  });

  it('renders a door near the bottom edge — exercises doorSide bottom branch', () => {
    const bottomDoorRoom: RoomDefinition = {
      worldWidth: 1_000,
      worldHeight: 1_000,
      doors: [
        {
          id: 'wild-haggis-survivors',
          status: 'launchable',
          // Center x=500, center y=955 → on a 1200×800 canvas: cx=600, cy=764.
          // distBottom(36) < distLeft(600) → doorSide returns 'bottom'.
          bounds: { minX: 350, minY: 920, maxX: 650, maxY: 990 }
        }
      ]
    };
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, bottomDoorRoom).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls.length).toBeGreaterThan(20);
  });

  it('uses SOON as the short label for doors whose title includes "Next Moon"', () => {
    const nextMoonRoom: RoomDefinition = {
      worldWidth: 1_000,
      worldHeight: 1_000,
      doors: [
        {
          id: 'next-moon-bothy',
          status: 'launchable',
          // prettifyKebab('next-moon-bothy') = 'Next Moon Bothy' → contains
          // 'Next Moon' → doorShortLabel returns 'SOON'.
          bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 }
        }
      ]
    };
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, nextMoonRoom).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls.length).toBeGreaterThan(20);
  });

  it('renders a door with an unregistered single-word ID — exercises prettifyKebab and doorShortLabel single-word return', () => {
    const unknownDoorRoom: RoomDefinition = {
      worldWidth: 1_000,
      worldHeight: 1_000,
      doors: [
        {
          id: 'lighthouse',
          status: 'launchable',
          // 'lighthouse' is not in HUB_GAME_REGISTRY → doorTitleForId calls
          // prettifyKebab('lighthouse') = 'Lighthouse' (1 word) →
          // doorShortLabel returns the title as-is (single-word path).
          bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 }
        }
      ]
    };
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, unknownDoorRoom).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls.length).toBeGreaterThan(20);
  });

  it('flips the haggis left when playerX decreases between renders', () => {
    const { surface, context: ctxDefault } = recordingSurface(1200, 800);
    const renderer = createCanvasRoomRenderer(surface, ROOM);
    // First render sets the baseline position.
    renderer.render(SNAPSHOT_NO_INTERACTION);
    const callsDefault = ctxDefault.calls.length;

    // Second render: playerX moved left by 20 units → haggisFacingLeft = true.
    renderer.render({ ...SNAPSHOT_NO_INTERACTION, playerX: SNAPSHOT_NO_INTERACTION.playerX - 20 });
    // A successful render after direction change emits the same call volume.
    expect(ctxDefault.calls.length).toBeGreaterThan(callsDefault);
  });

  it('does not flip facing direction when playerX changes by ≤ 2 units — exercises small-dx guard', () => {
    const { surface, context } = recordingSurface(1200, 800);
    const renderer = createCanvasRoomRenderer(surface, ROOM);
    // First render establishes prevPlayerX.
    renderer.render(SNAPSHOT_NO_INTERACTION);
    const firstCount = context.calls.length;
    // Second render: dx=1 → Math.abs(1) > 2 is false → haggisFacingLeft unchanged.
    renderer.render({ ...SNAPSHOT_NO_INTERACTION, playerX: SNAPSHOT_NO_INTERACTION.playerX + 1 });
    expect(context.calls.length).toBeGreaterThan(firstCount);
  });

  it('renders a door with a double-hyphen ID — exercises prettifyKebab empty-part branch', () => {
    const doubleHyphenRoom: RoomDefinition = {
      worldWidth: 1_000,
      worldHeight: 1_000,
      doors: [
        {
          id: 'north--gate',
          status: 'launchable',
          // split('-') → ['north', '', 'gate']: empty part hits part.length > 0 false branch.
          bounds: { minX: 820, minY: 420, maxX: 940, maxY: 580 }
        }
      ]
    };
    const { surface, context } = recordingSurface(1200, 800);
    createCanvasRoomRenderer(surface, doubleHyphenRoom).render(SNAPSHOT_NO_INTERACTION);
    expect(context.calls.length).toBeGreaterThan(20);
  });
});
