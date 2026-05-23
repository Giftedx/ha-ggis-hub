import { HUB_GAME_REGISTRY, getGameById } from '../games/registry';
import type { RoomDefinition, RoomDoorDefinition } from '../wasm/boundary';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';

// Pixel-art renderer for the ha.ggis bothy. The host sizes the canvas
// internal buffer to roughly 320×180 (or wider for ultrawide aspect)
// and CSS scales it to the viewport with `image-rendering: pixelated`.
// Every draw call here lives at integer pixel coordinates so the upscaled
// result stays crisp and intentional.

export interface CanvasRoomContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  globalAlpha: number;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  fill(): void;
  stroke(): void;
  fillText(text: string, x: number, y: number): void;
}

export interface CanvasRoomSurface {
  readonly width: number;
  readonly height: number;
  getContext(kind: '2d'): CanvasRoomContext | null;
}

export interface CanvasRoomRenderer {
  render(snapshot: DecodedSnapshot): void;
}

const PX = {
  void: '#050307',
  stoneShadow: '#0c0805',
  stoneDark: '#1c1410',
  stoneMid: '#2e231a',
  stoneLight: '#4a3a28',
  stoneHighlight: '#6a543a',
  mortar: '#08050',
  floorDark: '#2a1a0e',
  floorMid: '#3c2614',
  floorLight: '#5c3e22',
  floorSeam: '#150a04',
  floorKnot: '#1f1208',
  floorLitWash: '#5a2e10',
  woodWarm: '#7a3f18',
  woodWarmShade: '#5a2a10',
  woodWarmHighlight: '#a05828',
  woodCold: '#3a302a',
  woodColdShade: '#2a221c',
  iron: '#2a2520',
  ironHighlight: '#4a4238',
  goldHandle: '#d4a04d',
  goldHandleDark: '#8a6628',
  flameCore: '#fff0c0',
  flameMid: '#ff9b3a',
  flameOuter: '#c4441a',
  ember: '#8a2818',
  hagOutline: '#1a0a04',
  hagDark: '#5a3014',
  hagBody: '#7a4422',
  hagLight: '#9c6432',
  hagRim: '#c8884a',
  hagBlush: '#a8442c',
  hagShadow: 'rgba(0, 0, 0, 0.55)',
  eyeWhite: '#f0e6d0',
  eyePupil: '#0a0604',
  legDark: '#1a0a04',
  haloWarm: '#f4c95d',
  haloCool: '#8a6b48',
  signWood: '#6a3614',
  signEdge: '#1a0a04',
  signText: '#f4e0a8',
  signTextShadow: '#3a1a08',
  promptShadow: 'rgba(0, 0, 0, 0.85)',
  promptText: '#f7e8c4'
} as const;

// Wall thickness — sized for the 640×360 internal canvas. ~7% of height.
const WALL_THICK = 28;

interface ScaledRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface DoorLayout {
  readonly id: string;
  readonly status: 'launchable' | 'locked';
  readonly rect: ScaledRect;
  readonly title: string;
  readonly side: 'left' | 'right' | 'top' | 'bottom';
}

export function createCanvasRoomRenderer(
  surface: CanvasRoomSurface,
  room: RoomDefinition
): CanvasRoomRenderer {
  const context = surface.getContext('2d');
  if (context === null) {
    throw new Error('Canvas2D context is unavailable');
  }
  // Pixel-art: disable smoothing so every fill stays crisp at integer
  // boundaries. This is a no-op on the test recording context (it has no
  // such property) but matters on the real CanvasRenderingContext2D.
  const smoothable = context as unknown as { imageSmoothingEnabled?: boolean };
  if ('imageSmoothingEnabled' in smoothable) {
    smoothable.imageSmoothingEnabled = false;
  }

  const titles = new Map(room.doors.map((d) => [d.id, doorTitleForId(d.id)]));
  const startedAt = nowMillis();

  return {
    render(snapshot: DecodedSnapshot): void {
      const doors: readonly DoorLayout[] = room.doors.map((door) => {
        const simRect = scaleDoorBounds(surface, room, door);
        const side = doorSide(simRect, surface);
        // Snap the visual door to the side wall so it reads as an
        // opening carved into the perimeter rather than floating on the
        // floor. Collision still uses sim coords; this is presentation.
        const rect = snapDoorToWall(simRect, surface, side);
        return {
          id: door.id,
          status: door.status,
          rect,
          title: titles.get(door.id) ?? door.id,
          side
        };
      });
      const phase = (nowMillis() - startedAt) / 1000;
      renderRoom(context, surface, room, doors, snapshot, phase);
    }
  };
}

function snapDoorToWall(
  rect: ScaledRect,
  surface: CanvasRoomSurface,
  side: 'left' | 'right' | 'top' | 'bottom'
): ScaledRect {
  // Door visually nestles its outer edge into the wall (-2 means the
  // door bleeds 2 pixels into the wall mass so the wall covers the
  // door's outer plank and reads as a doorway opening).
  switch (side) {
    case 'left':
      return { ...rect, x: WALL_THICK - 2 };
    case 'right':
      return { ...rect, x: surface.width - WALL_THICK - rect.width + 2 };
    case 'top':
      return { ...rect, y: WALL_THICK - 2 };
    case 'bottom':
      return { ...rect, y: surface.height - WALL_THICK - rect.height + 2 };
  }
}

function nowMillis(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function renderRoom(
  ctx: CanvasRoomContext,
  surface: CanvasRoomSurface,
  room: RoomDefinition,
  doors: readonly DoorLayout[],
  snapshot: DecodedSnapshot,
  phase: number
): void {
  // 1. Void backdrop (frames the room)
  ctx.fillStyle = PX.void;
  ctx.fillRect(0, 0, surface.width, surface.height);

  // 2. Floor
  drawFloor(ctx, surface, phase);

  // 3. Active interaction id (drives door + lantern + interior light)
  const interactingId = activeDoorId(snapshot);

  // 4. Door openings + frames (drawn before walls so the wall masks the
  //    door edge if needed; but with our layout the door sits inside the
  //    interior and the wall is its border, so order is just visual stacking)
  for (const door of doors) {
    drawDoor(ctx, door, interactingId);
  }

  // 5. Perimeter walls — drawn AFTER doors so the wall trim sits over
  //    any door pixel that strays beyond its frame. Door inset slightly
  //    inside the interior means the wall doesn't cover the door body.
  drawWalls(ctx, surface);

  // 6. Wall-mounted lanterns above each door — only the launchable
  //    one gets a fixture (unlit lanterns are visual noise).
  for (const door of doors) {
    if (door.status === 'launchable') {
      drawLantern(ctx, door, phase);
      drawSign(ctx, door, doorShortLabel(door.title));
    }
  }

  // 7. Floor furnishings — placed in the corners so the central play
  //    area stays clear for the haggis. Minimal: woodpile + barrel,
  //    plus a few floor scatter sparks.
  drawFloorScatter(ctx, surface);
  drawWoodpile(ctx, surface);
  drawBarrel(ctx, surface);

  // 8. Fire pit — placed lower in the room (and large enough to read as a
  //    focal point) so the haggis spawning at world-center doesn't sit
  //    on top of it.
  const fireCenter = {
    x: Math.round(surface.width / 2),
    y: Math.round(surface.height * 0.8)
  };
  drawFloorRug(ctx, fireCenter);
  drawFirePit(ctx, fireCenter, phase);

  // 7.5 Wall decorations — small moonlit window on the top wall +
  //     decorative hangings on each side. Adds character without
  //     cluttering the floor.
  drawTopWallWindow(ctx, surface, phase);
  drawWallHanging(ctx, surface);
  drawSideWallSconces(ctx, surface, phase);

  // 8. Haggis player
  drawHaggis(ctx, surface, room, snapshot, phase);

  // 8.5 Ambient particles — smoke wisps rising from the fire, and dust
  //     motes drifting in the cool moonlight under the window. Subtle
  //     motion that brings the room alive without distracting.
  drawAmbientParticles(ctx, surface, fireCenter, phase);

  // 9. Vignette — soft dark falloff at the corners to focus attention
  //    inward. Drawn just before the prompt so the prompt remains crisp.
  drawVignette(ctx, surface);

  // 10. Prompt (only when at a door)
  drawPrompt(ctx, surface, doors, snapshot);
}

function drawAmbientParticles(
  ctx: CanvasRoomContext,
  surface: CanvasRoomSurface,
  fireCenter: { readonly x: number; readonly y: number },
  phase: number
): void {
  // Smoke wisps from the fire — soft grey pixels rising and fading.
  // Each wisp cycles through a 4-second life independently.
  for (let i = 0; i < 4; i += 1) {
    const life = ((phase * 0.25 + i * 0.27) % 1);
    if (life < 0.1) continue;
    const sway = Math.sin(phase * 1.7 + i * 2.1) * 5;
    const sx = Math.round(fireCenter.x + sway);
    const sy = Math.round(fireCenter.y - 28 - life * 60);
    const alpha = (1 - life) * 0.45;
    ctx.fillStyle = '#9a8a7a';
    ctx.globalAlpha = alpha;
    ctx.fillRect(sx, sy, 1, 1);
    if (life < 0.6) {
      ctx.fillRect(sx + 1, sy + 1, 1, 1);
    }
    if (life < 0.4) {
      ctx.fillRect(sx - 1, sy, 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  // Dust motes drifting in the moonlight column under the window.
  // 6 motes orbit slowly in a small area below the window, each at a
  // different vertical speed.
  const windowCx = Math.round(surface.width / 2);
  for (let i = 0; i < 6; i += 1) {
    const motePhase = phase * 0.35 + i * 0.5;
    const my = WALL_THICK + 4 + ((motePhase * 18) % 60);
    const mx = windowCx + Math.round(Math.sin(motePhase * 1.4) * 12) + ((i - 3) * 3);
    // Brighter near the top (lit by moonlight), fading into shadow
    const lit = Math.max(0, 1 - (my - WALL_THICK) / 50);
    ctx.fillStyle = '#a0b0c8';
    ctx.globalAlpha = 0.4 * lit;
    ctx.fillRect(mx, my, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawSideWallSconces(
  ctx: CanvasRoomContext,
  surface: CanvasRoomSurface,
  phase: number
): void {
  // Small wall-mounted torch sconces on each side wall — one above the
  // door area and one below. Pulses gently for ambient life.
  const sconces: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
    readonly side: 'left' | 'right';
  }> = [
    { x: Math.round(WALL_THICK / 2), y: Math.round(surface.height * 0.3), side: 'left' },
    { x: Math.round(WALL_THICK / 2), y: Math.round(surface.height * 0.85), side: 'left' },
    { x: surface.width - Math.round(WALL_THICK / 2), y: Math.round(surface.height * 0.3), side: 'right' },
    { x: surface.width - Math.round(WALL_THICK / 2), y: Math.round(surface.height * 0.85), side: 'right' }
  ];

  for (const s of sconces) {
    const pulse = 0.7 + Math.sin(phase * 5 + s.y * 0.01) * 0.15;

    // Iron bracket
    ctx.fillStyle = PX.iron;
    ctx.fillRect(s.x - 1, s.y, 3, 4);
    // Cup
    ctx.fillRect(s.x - 2, s.y - 1, 5, 2);

    // Flame
    ctx.fillStyle = PX.flameOuter;
    ctx.beginPath();
    ctx.moveTo(s.x - 2, s.y - 1);
    ctx.lineTo(s.x + 2, s.y - 1);
    ctx.lineTo(s.x, s.y - 6 - Math.floor(Math.sin(phase * 8) * 1));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PX.flameMid;
    ctx.beginPath();
    ctx.moveTo(s.x - 1, s.y - 1);
    ctx.lineTo(s.x + 1, s.y - 1);
    ctx.lineTo(s.x, s.y - 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PX.flameCore;
    ctx.fillRect(s.x, s.y - 3, 1, 2);

    // Small halo on the wall around the torch
    for (let i = 4; i > 0; i -= 1) {
      ctx.fillStyle = PX.haloWarm;
      ctx.globalAlpha = 0.07 * pulse * (i / 4);
      ctx.beginPath();
      ctx.arc(s.x, s.y - 2, 4 + i * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawWallHanging(ctx: CanvasRoomContext, surface: CanvasRoomSurface): void {
  // Two simple decorations on the top wall, left and right of the window:
  // a pair of antlers (left) and a stag-painted small banner (right).
  const cx = Math.round(surface.width / 2);
  const wy = Math.round(WALL_THICK / 2);

  // CROSSED CLAYMORES on the left — two crossed sword silhouettes
  // (top-down view). More interesting than the round shield, which
  // read as a circle with a dot.
  const swordX = cx - Math.round(surface.width * 0.18);
  const swordY = wy + 1;
  // Sword 1 (top-left to bottom-right)
  ctx.fillStyle = '#c8c0a8'; // blade
  for (let i = -5; i <= 5; i += 1) {
    ctx.fillRect(swordX + i, swordY + Math.round(i * 0.4), 1, 1);
  }
  // Sword 2 (top-right to bottom-left)
  for (let i = -5; i <= 5; i += 1) {
    ctx.fillRect(swordX - i, swordY + Math.round(i * 0.4), 1, 1);
  }
  // Hilts (small dark crosspieces at the ends of each sword)
  ctx.fillStyle = '#3a2810';
  ctx.fillRect(swordX - 6, swordY - 2, 2, 4);
  ctx.fillRect(swordX + 5, swordY - 2, 2, 4);
  ctx.fillRect(swordX - 6, swordY + 2, 2, 1);
  ctx.fillRect(swordX + 5, swordY + 2, 2, 1);
  // Center binding (where they cross)
  ctx.fillStyle = PX.iron;
  ctx.fillRect(swordX - 1, swordY, 3, 2);

  // BANNER on the right
  const bannerX = cx + Math.round(surface.width * 0.18);
  // Hanging rod
  ctx.fillStyle = PX.iron;
  ctx.fillRect(bannerX - 4, wy - 5, 9, 1);
  // Banner
  ctx.fillStyle = '#5a2818';
  ctx.fillRect(bannerX - 3, wy - 4, 7, 7);
  // Banner edge
  ctx.fillStyle = '#3a1808';
  ctx.fillRect(bannerX - 3, wy - 4, 7, 1);
  ctx.fillRect(bannerX - 3, wy + 2, 7, 1);
  // Tartan-ish pattern (just stripes)
  ctx.fillStyle = '#8a3a18';
  ctx.fillRect(bannerX - 3, wy - 2, 7, 1);
  ctx.fillRect(bannerX, wy - 4, 1, 7);
}

function drawTopWallWindow(
  ctx: CanvasRoomContext,
  surface: CanvasRoomSurface,
  phase: number
): void {
  // Small arched window in the top wall, centered. Lets in cool blue
  // moonlight as a counterpoint to the warm fire/lantern interior.
  const cx = Math.round(surface.width / 2);
  const winW = 16;
  const winH = 8;
  const wy = Math.round((WALL_THICK - winH) / 2);
  const wx = cx - Math.round(winW / 2);

  // Recessed frame (stone shadow)
  ctx.fillStyle = PX.stoneShadow;
  ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
  // Night sky — deep blue with slight gradient
  ctx.fillStyle = '#1a2840';
  ctx.fillRect(wx, wy, winW, winH);
  ctx.fillStyle = '#2a3858';
  ctx.fillRect(wx, wy, winW, 3);
  ctx.fillStyle = '#3a4868';
  ctx.fillRect(wx, wy, winW, 1);

  // The moon — crescent shape in the right half of the window
  ctx.fillStyle = '#e8e0c8';
  ctx.fillRect(wx + 11, wy + 2, 2, 4);
  ctx.fillRect(wx + 12, wy + 1, 1, 6);
  // Moon shadow (the dark side of the crescent)
  ctx.fillStyle = '#1a2840';
  ctx.fillRect(wx + 11, wy + 2, 1, 4);

  // Stars — twinkle independently
  const stars: ReadonlyArray<readonly [number, number, number]> = [
    [3, 1, 1.5],
    [6, 3, 1.1],
    [8, 1, 2.2],
    [4, 4, 1.7],
    [2, 5, 1.3]
  ];
  for (const [sx, sy, freq] of stars) {
    if (Math.sin(phase * freq + sx) > 0) {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(wx + sx, wy + sy, 1, 1);
    }
  }

  // Cross mullion (window frame) — drawn AFTER the moon so it overlaps
  ctx.fillStyle = '#1a0e06';
  ctx.fillRect(wx + Math.round(winW / 2) - 1, wy, 2, winH);
  ctx.fillRect(wx, wy + Math.round(winH / 2) - 1, winW, 2);
  // Stone sill below the window — and a tiny shadow on the wall below
  ctx.fillStyle = PX.stoneHighlight;
  ctx.fillRect(wx - 2, wy + winH, winW + 4, 1);
  ctx.fillStyle = PX.stoneShadow;
  ctx.fillRect(wx - 2, wy + winH + 1, winW + 4, 1);
}

function drawVignette(ctx: CanvasRoomContext, surface: CanvasRoomSurface): void {
  const w = surface.width;
  const h = surface.height;
  // Four corner blocks of darkness, stacked with low alpha — fakes a
  // radial vignette without needing createRadialGradient (which isn't on
  // our structural context interface).
  const layers = 4;
  for (let i = 0; i < layers; i += 1) {
    const fade = 0.045 + i * 0.035;
    const thickness = Math.round(((i + 1) / layers) * 38);
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = fade;
    // Top band
    ctx.fillRect(0, 0, w, thickness);
    // Bottom band
    ctx.fillRect(0, h - thickness, w, thickness);
    // Left band
    ctx.fillRect(0, 0, thickness, h);
    // Right band
    ctx.fillRect(w - thickness, 0, thickness, h);
  }
  ctx.globalAlpha = 1;
}

function drawFloor(ctx: CanvasRoomContext, surface: CanvasRoomSurface, phase: number): void {
  // Base fill
  ctx.fillStyle = PX.floorDark;
  ctx.fillRect(0, 0, surface.width, surface.height);

  // Vertical planks alternating two darknesses
  const plankW = 16;
  for (let x = 0; x < surface.width; x += plankW) {
    const isMid = Math.floor(x / plankW) % 2 === 0;
    ctx.fillStyle = isMid ? PX.floorMid : PX.floorDark;
    ctx.fillRect(x, 0, plankW, surface.height);
    // Seam
    ctx.fillStyle = PX.floorSeam;
    ctx.fillRect(x, 0, 1, surface.height);
  }

  // Plank-end horizontal seams (staggered every other plank)
  for (let x = 0; x < surface.width; x += plankW) {
    const seamY = ((Math.floor(x / plankW) % 3) + 1) * 38 + ((x * 7) % 11);
    ctx.fillStyle = PX.floorSeam;
    ctx.fillRect(x, seamY, plankW, 1);
    ctx.fillStyle = PX.floorLight;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(x + 1, seamY + 1, plankW - 2, 1);
    ctx.globalAlpha = 1;
  }

  // Wood knots — small dark spots scattered deterministically
  ctx.fillStyle = PX.floorKnot;
  for (let i = 0; i < 22; i += 1) {
    const kx = (i * 47) % surface.width;
    const ky = ((i * 31) % (surface.height - 30)) + 12;
    ctx.fillRect(kx, ky, 2, 2);
    ctx.fillRect(kx - 1, ky + 1, 1, 1);
    ctx.fillRect(kx + 2, ky, 1, 1);
  }

  // Warm wash from the fire — soft circular gradient approximated by
  // stacked alpha rings centred on the fire pit
  const fireX = Math.round(surface.width / 2);
  const fireY = Math.round(surface.height * 0.62);
  const flicker = 1 + Math.sin(phase * 6.1) * 0.04 + Math.sin(phase * 3.3 + 1) * 0.03;
  for (let i = 8; i > 0; i -= 1) {
    ctx.fillStyle = PX.floorLitWash;
    ctx.globalAlpha = 0.045 * (i / 8) * flicker;
    ctx.beginPath();
    ctx.arc(fireX, fireY, 18 * i, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWalls(ctx: CanvasRoomContext, surface: CanvasRoomSurface): void {
  const W = surface.width;
  const H = surface.height;

  // Four wall strips: top, bottom, left, right
  drawWallStrip(ctx, 0, 0, W, WALL_THICK, 'horizontal');
  drawWallStrip(ctx, 0, H - WALL_THICK, W, WALL_THICK, 'horizontal');
  drawWallStrip(ctx, 0, 0, WALL_THICK, H, 'vertical');
  drawWallStrip(ctx, W - WALL_THICK, 0, WALL_THICK, H, 'vertical');

  // Inner shadow ring (1 pixel) — separates wall from floor
  ctx.fillStyle = PX.stoneShadow;
  ctx.fillRect(WALL_THICK, WALL_THICK, W - WALL_THICK * 2, 1);
  ctx.fillRect(WALL_THICK, H - WALL_THICK - 1, W - WALL_THICK * 2, 1);
  ctx.fillRect(WALL_THICK, WALL_THICK, 1, H - WALL_THICK * 2);
  ctx.fillRect(W - WALL_THICK - 1, WALL_THICK, 1, H - WALL_THICK * 2);
}

function drawWallStrip(
  ctx: CanvasRoomContext,
  x: number,
  y: number,
  w: number,
  h: number,
  orientation: 'horizontal' | 'vertical'
): void {
  // Base fill — use the MID stone tone (not the darkest) so the gaps
  // between bricks read as mortar / shadow joints, not as void.
  ctx.fillStyle = PX.stoneMid;
  ctx.fillRect(x, y, w, h);

  // Brick pattern — staggered rows. Bricks fill the row fully (no gap
  // between rows) and the mortar is drawn as a separate 1px dark line.
  const brickW = orientation === 'horizontal' ? 20 : 14;
  const brickH = orientation === 'horizontal' ? 7 : 10;
  if (orientation === 'horizontal') {
    const rows = Math.ceil(h / brickH);
    for (let r = 0; r < rows; r += 1) {
      const off = r % 2 === 0 ? 0 : Math.round(brickW / 2);
      const ry = y + r * brickH;
      for (let bx = x - brickW; bx < x + w + brickW; bx += brickW) {
        const px = bx + off;
        const shade = (r * 17 + Math.floor((bx - x) / brickW) * 11) % 7;
        const fill =
          shade < 2 ? PX.stoneLight : shade < 4 ? PX.stoneMid : shade < 6 ? PX.stoneHighlight : PX.stoneLight;
        ctx.fillStyle = fill;
        // Full-height brick (no internal margin) so adjacent bricks
        // tile cleanly. Mortar is drawn afterwards as overlay lines.
        ctx.fillRect(px, ry, brickW, brickH);
        // Top highlight
        ctx.fillStyle = PX.stoneHighlight;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(px, ry, brickW, 1);
        ctx.globalAlpha = 1;
      }
    }
  } else {
    const cols = Math.ceil(w / brickW);
    const rows = Math.ceil(h / brickH);
    for (let r = 0; r < rows; r += 1) {
      const off = r % 2 === 0 ? 0 : Math.round(brickH / 2);
      for (let c = 0; c < cols; c += 1) {
        const bx = x + c * brickW;
        const by = y + r * brickH + off;
        const shade = (r * 13 + c * 19) % 7;
        const fill =
          shade < 2 ? PX.stoneLight : shade < 4 ? PX.stoneMid : shade < 6 ? PX.stoneHighlight : PX.stoneLight;
        ctx.fillStyle = fill;
        ctx.fillRect(bx, by, brickW, brickH);
        ctx.fillStyle = PX.stoneHighlight;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(bx, by, brickW, 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Mortar joints (1px dark lines between brick courses)
  ctx.fillStyle = PX.stoneShadow;
  if (orientation === 'horizontal') {
    const rows = Math.ceil(h / brickH);
    for (let r = 1; r < rows; r += 1) {
      ctx.fillRect(x, y + r * brickH - 1, w, 1);
    }
  } else {
    const cols = Math.ceil(w / brickW);
    for (let c = 1; c < cols; c += 1) {
      ctx.fillRect(x + c * brickW - 1, y, 1, h);
    }
  }
}

function drawDoor(
  ctx: CanvasRoomContext,
  door: DoorLayout,
  interactingId: string | null
): void {
  const { x, y, width, height } = door.rect;
  const isLaunchable = door.status === 'launchable';

  // Stone arch frame around door (extends beyond door bounds)
  const frame = 3;
  ctx.fillStyle = PX.stoneShadow;
  ctx.fillRect(x - frame, y - frame, width + frame * 2, height + frame * 2);
  // Lighter frame highlight
  ctx.fillStyle = PX.stoneHighlight;
  ctx.fillRect(x - frame, y - frame, width + frame * 2, 1);

  // Door body (planks)
  ctx.fillStyle = isLaunchable ? PX.woodWarm : PX.woodCold;
  ctx.fillRect(x, y, width, height);

  // Vertical plank seams (3 planks)
  ctx.fillStyle = isLaunchable ? PX.woodWarmShade : PX.woodColdShade;
  const plankW = Math.floor(width / 3);
  ctx.fillRect(x + plankW, y, 1, height);
  ctx.fillRect(x + plankW * 2, y, 1, height);

  // Plank highlight strips (catches light along left edge of each plank)
  if (isLaunchable) {
    ctx.fillStyle = PX.woodWarmHighlight;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x + 1, y + 1, 1, height - 2);
    ctx.fillRect(x + plankW + 1, y + 1, 1, height - 2);
    ctx.fillRect(x + plankW * 2 + 1, y + 1, 1, height - 2);
    ctx.globalAlpha = 1;
  }

  // Iron hinges (top + bottom on hinge side)
  const hingeSide = door.side === 'right' ? x : x + width - 5;
  ctx.fillStyle = PX.iron;
  ctx.fillRect(hingeSide, y + 3, 5, 3);
  ctx.fillRect(hingeSide, y + height - 6, 5, 3);
  ctx.fillStyle = PX.ironHighlight;
  ctx.fillRect(hingeSide, y + 3, 5, 1);
  ctx.fillRect(hingeSide, y + height - 6, 5, 1);

  // Door handle
  const handleSide = door.side === 'right' ? x + width - 3 : x + 1;
  ctx.fillStyle = isLaunchable ? PX.goldHandle : PX.goldHandleDark;
  ctx.fillRect(handleSide, Math.round(y + height / 2) - 1, 2, 3);

  // Locked door — heavy nailed-on cross planks (X pattern). Reads
  // unambiguously as "do not open" at any scale.
  if (!isLaunchable) {
    const cx = x + Math.round(width / 2);
    const cy = Math.round(y + height / 2);
    // Two nailed boards crossing diagonally
    drawCrossPlank(ctx, x - 2, y + 4, x + width + 2, y + height - 4);
    drawCrossPlank(ctx, x + width + 2, y + 4, x - 2, y + height - 4);
    // Padlock at the crossing point
    const lockW = 7;
    const lockH = 8;
    const lockX = cx - Math.round(lockW / 2);
    const lockY = cy - 2;
    ctx.fillStyle = PX.iron;
    ctx.fillRect(lockX, lockY, lockW, lockH);
    ctx.fillStyle = PX.ironHighlight;
    ctx.fillRect(lockX, lockY, lockW, 1);
    // Keyhole
    ctx.fillStyle = PX.eyePupil;
    ctx.fillRect(lockX + 3, lockY + 2, 1, 2);
    ctx.fillRect(lockX + 2, lockY + 4, 3, 1);
    // Shackle
    ctx.fillStyle = PX.iron;
    ctx.fillRect(lockX + 1, lockY - 3, 1, 3);
    ctx.fillRect(lockX + lockW - 2, lockY - 3, 1, 3);
    ctx.fillRect(lockX + 1, lockY - 3, lockW - 2, 1);
  }
  // Keyhole tease — tiny red glow on the locked door's keyhole that
  // pulses, hinting "this opens someday". Only when nobody's actively
  // peeking (interactingId !== door.id) so it isn't competing with the
  // active glow. Animated independently of interaction state.
  if (!isLaunchable && interactingId !== door.id) {
    // Recompute keyhole position to match the padlock above
    const cx = x + Math.round(width / 2);
    const cy = Math.round(y + height / 2);
    const pulse = 0.4 + Math.sin(0.0001 * Date.now() * 6) * 0.3;
    ctx.fillStyle = '#c44218';
    ctx.globalAlpha = pulse;
    ctx.fillRect(cx, cy + 1, 1, 2);
    ctx.globalAlpha = 1;
  }

  // Active glow — pulses warm light around the doorway
  if (interactingId === door.id) {
    const glow = isLaunchable ? PX.haloWarm : PX.haloCool;
    for (let i = 5; i > 0; i -= 1) {
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.06 * (i / 5);
      ctx.beginPath();
      ctx.arc(
        x + width / 2,
        y + height / 2,
        Math.max(width, height) * 0.6 * (i / 3),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Sharp bright outline
    ctx.fillStyle = glow;
    ctx.fillRect(x - frame, y - frame - 1, width + frame * 2, 1);
    ctx.fillRect(x - frame, y + height + frame, width + frame * 2, 1);
    ctx.fillRect(x - frame - 1, y - frame, 1, height + frame * 2);
    ctx.fillRect(x + width + frame, y - frame, 1, height + frame * 2);
  }
}

function drawCrossPlank(
  ctx: CanvasRoomContext,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  // Heavy nailed board between two points — 5px thick with wood-grain
  // highlight stripe and iron nail heads at each end.
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const px = Math.round(x1 + dx * t);
    const py = Math.round(y1 + dy * t);
    // Heavy dark plank body (5x5 stamp at every point)
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(px - 2, py - 2, 5, 5);
    // Mid wood tone over the top
    ctx.fillStyle = '#3a2210';
    ctx.fillRect(px - 1, py - 1, 3, 3);
    // Highlight stripe
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(px - 1, py - 1, 3, 1);
  }
  // Nail heads at each end
  for (const [nx, ny] of [
    [x1, y1],
    [x2, y2]
  ] as ReadonlyArray<readonly [number, number]>) {
    ctx.fillStyle = PX.iron;
    ctx.fillRect(nx - 1, ny - 1, 3, 3);
    ctx.fillStyle = PX.ironHighlight;
    ctx.fillRect(nx, ny - 1, 1, 1);
  }
}

function drawLantern(ctx: CanvasRoomContext, door: DoorLayout, phase: number): void {
  const { x, y, width } = door.rect;
  const isLit = door.status === 'launchable';
  // Lantern hangs above the door — bigger, with a proper bracket so it
  // reads as wall-mounted lighting, not a floating icon.
  const cx = x + Math.round(width / 2);
  const cy = y - 18;
  // Bracket from wall to lantern top
  ctx.fillStyle = PX.iron;
  ctx.fillRect(cx, cy - 8, 1, 8);
  ctx.fillRect(cx - 2, cy - 8, 4, 1);
  // Bracket curl
  ctx.fillRect(cx + 1, cy - 7, 1, 1);
  ctx.fillRect(cx - 3, cy - 7, 1, 1);
  // Top cap (wider)
  ctx.fillRect(cx - 7, cy - 2, 15, 2);
  // Body frame (proper iron sides)
  ctx.fillRect(cx - 7, cy, 2, 12);
  ctx.fillRect(cx + 5, cy, 2, 12);
  // Crossbars (lantern grille)
  ctx.fillRect(cx - 7, cy + 5, 14, 1);
  ctx.fillRect(cx - 7, cy + 9, 14, 1);
  // Bottom cap with hook for hanging things
  ctx.fillRect(cx - 7, cy + 12, 15, 2);
  ctx.fillRect(cx - 1, cy + 14, 2, 2);
  // Glass
  if (isLit) {
    const pulse = 0.7 + Math.sin(phase * 4) * 0.15 + Math.sin(phase * 9.1) * 0.08;

    // Halo — even bigger now to match the larger fixture
    for (let i = 8; i > 0; i -= 1) {
      ctx.fillStyle = PX.haloWarm;
      ctx.globalAlpha = 0.085 * pulse * (i / 8);
      ctx.beginPath();
      ctx.arc(cx, cy + 6, 14 + i * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Warm glass with three internal panes (the crossbars sit over)
    ctx.fillStyle = PX.flameMid;
    ctx.fillRect(cx - 5, cy + 1, 10, 11);
    // Inner glow
    ctx.fillStyle = '#ffc060';
    ctx.fillRect(cx - 3, cy + 2, 6, 9);
    // Bright candle core
    ctx.fillStyle = PX.flameCore;
    ctx.fillRect(cx - 1, cy + 5, 2, 4);
    // Flicker spark inside the glass
    if (Math.sin(phase * 11) > 0.5) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx, cy + 6, 1, 1);
    }
  } else {
    ctx.fillStyle = '#2a2520';
    ctx.fillRect(cx - 5, cy + 1, 10, 11);
  }
}

function drawSign(ctx: CanvasRoomContext, door: DoorLayout, label: string): void {
  const { x, y, width } = door.rect;
  const cx = x + Math.round(width / 2);
  // Sign hangs above the lantern — bumped position to clear the bigger
  // lantern below
  const signW = Math.max(width + 12, 36);
  const signH = 11;
  const signX = cx - Math.round(signW / 2);
  const signY = y - 32;

  // Hanging strings
  ctx.fillStyle = PX.iron;
  ctx.fillRect(signX + 2, signY - 2, 1, 2);
  ctx.fillRect(signX + signW - 3, signY - 2, 1, 2);

  // Sign edge
  ctx.fillStyle = PX.signEdge;
  ctx.fillRect(signX - 1, signY - 1, signW + 2, signH + 2);
  // Sign board
  ctx.fillStyle = PX.signWood;
  ctx.fillRect(signX, signY, signW, signH);
  // Top highlight
  ctx.fillStyle = '#8a4818';
  ctx.fillRect(signX + 1, signY, signW - 2, 1);

  // Label — small pixel-friendly serif. textBaseline isn't on our
  // interface so we offset y manually.
  ctx.fillStyle = PX.signText;
  ctx.font = `bold 8px Georgia, "Liberation Serif", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, signY + signH - 2);
}

function drawFloorScatter(ctx: CanvasRoomContext, surface: CanvasRoomSurface): void {
  // Light dust + straw flecks across the floor. Deterministic placement
  // so the pattern doesn't flicker between frames.
  ctx.fillStyle = PX.floorLight;
  ctx.globalAlpha = 0.35;
  const w = surface.width;
  const h = surface.height;
  for (let i = 0; i < 28; i += 1) {
    const fx = WALL_THICK + 4 + ((i * 53) % (w - WALL_THICK * 2 - 8));
    const fy = WALL_THICK + 4 + ((i * 41) % (h - WALL_THICK * 2 - 8));
    ctx.fillRect(fx, fy, 1, 1);
    if (i % 3 === 0) ctx.fillRect(fx + 2, fy, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawWoodpile(ctx: CanvasRoomContext, _surface: CanvasRoomSurface): void {
  // Small stack of logs in the upper-left of the floor — bothy fuel.
  const baseX = WALL_THICK + 4;
  const baseY = WALL_THICK + 6;
  const logW = 18;
  const logH = 3;
  // Three stacked logs, slightly offset
  for (let row = 0; row < 3; row += 1) {
    const offset = row % 2 === 0 ? 0 : 2;
    // Log body
    ctx.fillStyle = '#3a2210';
    ctx.fillRect(baseX + offset, baseY + row * (logH + 1), logW, logH);
    // Log top highlight
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(baseX + offset, baseY + row * (logH + 1), logW, 1);
    // End caps (rings)
    ctx.fillStyle = '#1a0c04';
    ctx.fillRect(baseX + offset, baseY + row * (logH + 1), 2, logH);
    ctx.fillRect(baseX + offset + logW - 2, baseY + row * (logH + 1), 2, logH);
    ctx.fillStyle = '#8a5828';
    ctx.fillRect(baseX + offset, baseY + row * (logH + 1) + 1, 1, 1);
    ctx.fillRect(baseX + offset + logW - 1, baseY + row * (logH + 1) + 1, 1, 1);
  }
}

function drawBarrel(ctx: CanvasRoomContext, surface: CanvasRoomSurface): void {
  // Small ale barrel in the upper-right floor area, set off the wall.
  const bx = surface.width - WALL_THICK - 16;
  const by = WALL_THICK + 6;
  const bw = 12;
  const bh = 14;
  // Barrel body
  ctx.fillStyle = '#4a2812';
  ctx.fillRect(bx, by, bw, bh);
  // Side shading (right edge slightly darker)
  ctx.fillStyle = '#2a180a';
  ctx.fillRect(bx + bw - 1, by, 1, bh);
  ctx.fillRect(bx, by, 1, bh);
  // Iron hoops (3 horizontal bands)
  ctx.fillStyle = PX.iron;
  ctx.fillRect(bx, by + 2, bw, 1);
  ctx.fillRect(bx, by + Math.round(bh / 2), bw, 1);
  ctx.fillRect(bx, by + bh - 3, bw, 1);
  // Top (slightly lighter — looking down at the lid)
  ctx.fillStyle = '#6a3818';
  ctx.fillRect(bx, by, bw, 1);
  // Wood grain on lid
  ctx.fillStyle = '#3a1c0c';
  ctx.fillRect(bx + 2, by, bw - 4, 1);
}

function drawFloorRug(
  ctx: CanvasRoomContext,
  fireCenter: { readonly x: number; readonly y: number }
): void {
  // Round-ish woven mat under the fire — pure tonal pattern, no crosses
  // (the previous "+" stripe read like a logo). Oval shape with
  // concentric subtle bands.
  const rugW = 70;
  const rugH = 44;
  const rx = fireCenter.x - Math.round(rugW / 2);
  const ry = fireCenter.y - Math.round(rugH / 2);
  // Outer dark ring
  ctx.fillStyle = '#1a0a04';
  ctx.fillRect(rx - 1, ry, rugW + 2, rugH);
  ctx.fillRect(rx, ry - 1, rugW, rugH + 2);
  // Main weave (warm reddish-brown)
  ctx.fillStyle = '#4a2010';
  ctx.fillRect(rx, ry, rugW, rugH);
  // Inner shaded ring
  ctx.fillStyle = '#5a2818';
  ctx.fillRect(rx + 2, ry + 2, rugW - 4, rugH - 4);
  // Inner-most warm panel
  ctx.fillStyle = '#6a3220';
  ctx.fillRect(rx + 5, ry + 4, rugW - 10, rugH - 8);
  // Concentric stripe pattern — thin horizontal bands every other row
  ctx.fillStyle = '#3a1808';
  ctx.globalAlpha = 0.45;
  for (let yy = 0; yy < rugH; yy += 4) {
    ctx.fillRect(rx + 1, ry + yy, rugW - 2, 1);
  }
  ctx.globalAlpha = 1;
  // Fringe at left/right edges (top-down looks like braided ends)
  ctx.fillStyle = '#3a1808';
  for (let i = 2; i < rugH - 2; i += 3) {
    ctx.fillRect(rx - 2, ry + i, 2, 1);
    ctx.fillRect(rx + rugW, ry + i, 2, 1);
  }
}

function drawFirePit(
  ctx: CanvasRoomContext,
  center: { readonly x: number; readonly y: number },
  phase: number
): void {
  // Larger oval stone ring — proper focal point. Drawn as a proper
  // stone-rimmed pit: outer mid-tone ring, inner dark cavity, then a
  // row of individual rim stones drawn ALL around the rim so the pit
  // reads as masonry, not a flat bowl.
  const ringW = 60;
  const ringH = 40;

  // Outer ring (the "shoulder" of the pit — light stone)
  ctx.fillStyle = PX.stoneMid;
  ctx.beginPath();
  ctx.arc(center.x, center.y, ringW * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Inner cavity (dark)
  ctx.fillStyle = '#0a0604';
  ctx.beginPath();
  ctx.arc(center.x, center.y, ringW * 0.5 - 4, 0, Math.PI * 2);
  ctx.fill();
  // Glowing ember bed at the bottom of the cavity — a flat oval, not a
  // half-disc, so it doesn't read as a frowning mouth.
  ctx.fillStyle = '#3a1408';
  for (let dy = 0; dy < 8; dy += 1) {
    const halfW = Math.round((ringW * 0.5 - 8) * (1 - dy * 0.1));
    ctx.fillRect(center.x - halfW, center.y + 2 + dy, halfW * 2, 1);
  }
  // Brightest ember pixels
  ctx.fillStyle = '#7a2818';
  ctx.fillRect(center.x - 10, center.y + 4, 20, 2);
  ctx.fillStyle = '#c4421a';
  ctx.fillRect(center.x - 6, center.y + 4, 12, 2);
  // Individual ember dots
  ctx.fillStyle = '#ff6020';
  for (let i = 0; i < 5; i += 1) {
    const ex = center.x - 8 + i * 4;
    ctx.fillRect(ex, center.y + 5, 2, 1);
  }

  // Stones around the rim — irregularly spaced, varying sizes, so the
  // pit doesn't read as a gear. Predefined positions for control.
  const stones: ReadonlyArray<{ readonly a: number; readonly sw: number; readonly sh: number }> = [
    { a: -Math.PI * 0.95, sw: 10, sh: 6 }, // upper-left big
    { a: -Math.PI * 0.55, sw: 8, sh: 6 }, // top-left
    { a: -Math.PI * 0.25, sw: 10, sh: 6 }, // top-right
    { a: -Math.PI * 0.02, sw: 8, sh: 6 }, // right
    { a: Math.PI * 0.25, sw: 10, sh: 6 }, // lower-right
    { a: Math.PI * 0.55, sw: 8, sh: 6 }, // bottom-left
    { a: Math.PI * 0.95, sw: 10, sh: 6 } // left
  ];
  for (const s of stones) {
    const sx = Math.round(center.x + Math.cos(s.a) * (ringW * 0.5));
    const sy = Math.round(center.y + Math.sin(s.a) * (ringH * 0.55));
    const isTop = Math.sin(s.a) < -0.1;
    ctx.fillStyle = isTop ? PX.stoneHighlight : PX.stoneLight;
    ctx.fillRect(sx - Math.round(s.sw / 2), sy - Math.round(s.sh / 2), s.sw, s.sh);
    ctx.fillStyle = isTop ? '#a08868' : PX.stoneHighlight;
    ctx.fillRect(sx - Math.round(s.sw / 2), sy - Math.round(s.sh / 2), s.sw, 2);
    ctx.fillStyle = PX.stoneShadow;
    ctx.fillRect(sx - Math.round(s.sw / 2), sy + Math.round(s.sh / 2) - 2, s.sw, 2);
  }

  // Embers — animated dark-red dots inside the pit
  ctx.fillStyle = PX.ember;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + phase * 0.4;
    const r = (ringW * 0.5 - 6) * (0.5 + 0.5 * Math.sin(phase * 2 + i));
    const ex = center.x + Math.round(Math.cos(a) * r);
    const ey = center.y + Math.round(Math.sin(a) * r * 0.6);
    ctx.fillRect(ex, ey, 2, 1);
  }

  // Flames (3 layered, animated, scaled to 640×360 baseline)
  const flickerA = Math.floor((Math.sin(phase * 7) + 1) * 4);
  const flickerB = Math.floor((Math.sin(phase * 5.3 + 1) + 1) * 4);
  // Outer flame
  ctx.fillStyle = PX.flameOuter;
  ctx.beginPath();
  ctx.moveTo(center.x - 18, center.y - 2);
  ctx.lineTo(center.x + 18, center.y - 2);
  ctx.lineTo(center.x + 8, center.y - 24 - flickerA);
  ctx.lineTo(center.x, center.y - 40 - flickerA);
  ctx.lineTo(center.x - 8, center.y - 24 - flickerB);
  ctx.closePath();
  ctx.fill();
  // Mid flame
  ctx.fillStyle = PX.flameMid;
  ctx.beginPath();
  ctx.moveTo(center.x - 10, center.y - 2);
  ctx.lineTo(center.x + 10, center.y - 2);
  ctx.lineTo(center.x + 4, center.y - 18);
  ctx.lineTo(center.x, center.y - 32 - flickerB);
  ctx.lineTo(center.x - 4, center.y - 18);
  ctx.closePath();
  ctx.fill();
  // Core flame
  ctx.fillStyle = PX.flameCore;
  ctx.beginPath();
  ctx.moveTo(center.x - 4, center.y - 6);
  ctx.lineTo(center.x + 4, center.y - 6);
  ctx.lineTo(center.x, center.y - 22 - flickerA);
  ctx.closePath();
  ctx.fill();

  // Rising sparks — small bright pixels drifting up above the flames.
  // Position is a function of phase so each spark follows a smooth
  // upward arc; the modulo gives them a finite life and they cycle.
  for (let i = 0; i < 6; i += 1) {
    const life = ((phase * 0.6 + i * 0.37) % 1); // 0..1
    if (life < 0.05) continue;
    const sway = Math.sin(phase * 4 + i * 1.7) * 4;
    const sx = Math.round(center.x + sway);
    const sy = Math.round(center.y - 18 - life * 36);
    const alpha = 1 - life;
    const col = life < 0.5 ? PX.flameCore : life < 0.85 ? PX.flameMid : PX.ember;
    ctx.fillStyle = col;
    ctx.globalAlpha = alpha;
    ctx.fillRect(sx, sy, 1, 1);
    if (life < 0.4) ctx.fillRect(sx + 1, sy - 1, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// Wild haggis (Haggis scoticus) — small, round, furry Scottish
// highland creature. Key features per folklore:
// - Oval body, low-slung, covered in shaggy heather-coloured fur
// - FOUR LEGS with UNEVEN LENGTHS: two longer on one side, two shorter
//   on the other (lets it run sideways around mountains)
// - Small button nose, beady black eyes, tiny pointed ears
// - Brown/ginger fur that blends with the highland heather
function drawHaggis(
  ctx: CanvasRoomContext,
  surface: CanvasRoomSurface,
  room: RoomDefinition,
  snapshot: DecodedSnapshot,
  phase: number
): void {
  const cx = Math.round((snapshot.playerX / room.worldWidth) * surface.width);
  const cy = Math.round((snapshot.playerY / room.worldHeight) * surface.height);
  // r = body half-width. Body is OBLONG: wider than tall (typical haggis-
  // creature silhouette — like a small furry haggis-shaped potato).
  const r = Math.max(
    10,
    Math.round((snapshot.playerHalfExtent / room.worldWidth) * surface.width * 0.48)
  );
  const rh = Math.round(r * 0.7); // body height
  const bob = Math.round(Math.sin(phase * 2.6) * 1);

  // Soft elliptical floor shadow
  ctx.fillStyle = PX.hagShadow;
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < 5; i += 1) {
    const sw = Math.round(r * (1.05 - i * 0.05));
    const sy = cy + rh + 3 + i;
    ctx.fillRect(cx - sw, sy, sw * 2, 1);
  }
  ctx.globalAlpha = 1;

  // ============ LEGS — the iconic uneven-length wild-haggis feature
  // The "left-leggers" run clockwise, the "right-leggers" anti-clockwise.
  // Ours is a clockwise-runner: LEFT legs LONGER, RIGHT legs SHORTER.
  // Step animation alternates the leg pairs.
  ctx.fillStyle = PX.legDark;
  const legW = Math.max(3, Math.round(r * 0.16));
  const longLegH = Math.max(8, Math.round(r * 0.55));
  const shortLegH = Math.max(5, Math.round(r * 0.32));
  const legTopY = cy + bob + Math.round(rh * 0.6);
  const stepA = Math.sin(phase * 5.5) > 0 ? 0 : 1;
  const stepB = 1 - stepA;

  // LEFT side (long legs) — front and back
  ctx.fillRect(cx - Math.round(r * 0.7), legTopY - stepA, legW, longLegH + stepA);
  ctx.fillRect(cx - Math.round(r * 0.35), legTopY - stepB, legW, longLegH + stepB);
  // RIGHT side (short legs) — front and back
  ctx.fillRect(cx + Math.round(r * 0.35) - legW, legTopY - stepB, legW, shortLegH + stepB);
  ctx.fillRect(cx + Math.round(r * 0.7) - legW, legTopY - stepA, legW, shortLegH + stepA);

  // Tiny hoofs at the bottom of each leg
  ctx.fillStyle = PX.hagOutline;
  ctx.fillRect(cx - Math.round(r * 0.7), legTopY + longLegH, legW, 1);
  ctx.fillRect(cx - Math.round(r * 0.35), legTopY + longLegH, legW, 1);
  ctx.fillRect(cx + Math.round(r * 0.35) - legW, legTopY + shortLegH, legW, 1);
  ctx.fillRect(cx + Math.round(r * 0.7) - legW, legTopY + shortLegH, legW, 1);

  // ============ BODY — oval base with fur shading
  // Outline + base shape
  drawEllipse(ctx, cx, cy + bob + 1, r + 1, rh + 1, PX.hagOutline);
  drawEllipse(ctx, cx, cy + bob, r, rh, PX.hagDark);
  drawEllipse(ctx, cx, cy + bob - 1, r - 1, rh - 1, PX.hagBody);

  // ============ FUR TEXTURE — shaggy tufts around the body silhouette
  // Drawn as small dark spikes on the bottom + sides of the ellipse to
  // suggest hanging shaggy fur. Top has lighter highlight tufts.
  ctx.fillStyle = PX.hagOutline;
  for (let i = -6; i <= 6; i += 1) {
    const angle = (i / 6) * Math.PI * 0.45 + Math.PI / 2; // bottom arc
    const fx = Math.round(cx + Math.cos(angle) * r);
    const fy = Math.round(cy + bob + Math.sin(angle) * rh);
    // Skip where legs poke out
    if (Math.abs(fx - cx) < Math.round(r * 0.8) && fy > cy + bob + rh - 2) continue;
    // Spike pixel for shaggy edge
    ctx.fillRect(fx, fy, 1, 2);
  }
  // Lighter tufts on top (highlight side)
  ctx.fillStyle = PX.hagLight;
  for (let i = -5; i <= 5; i += 1) {
    const angle = (i / 5) * Math.PI * 0.4 - Math.PI / 2; // top arc
    const fx = Math.round(cx + Math.cos(angle) * (r - 1));
    const fy = Math.round(cy + bob + Math.sin(angle) * (rh - 1));
    ctx.fillRect(fx, fy, 1, 1);
  }
  // Fur shading streaks across the body — wavy lines suggesting hair
  ctx.fillStyle = PX.hagDark;
  ctx.globalAlpha = 0.55;
  for (let yy = -Math.round(rh * 0.6); yy < Math.round(rh * 0.6); yy += 3) {
    const offset = Math.round(Math.sin(yy * 0.4) * 2);
    ctx.fillRect(cx - Math.round(r * 0.65) + offset, cy + bob + yy, Math.round(r * 0.25), 1);
    ctx.fillRect(cx + Math.round(r * 0.25) + offset, cy + bob + yy, Math.round(r * 0.4), 1);
  }
  ctx.globalAlpha = 1;

  // Highlight (top-left brighter wash)
  ctx.globalAlpha = 0.55;
  drawEllipse(ctx, cx - Math.round(r * 0.25), cy + bob - Math.round(rh * 0.3), Math.round(r * 0.55), Math.round(rh * 0.35), PX.hagLight);
  ctx.globalAlpha = 1;
  // Rim light (brightest small patch)
  ctx.globalAlpha = 0.6;
  drawEllipse(ctx, cx - Math.round(r * 0.4), cy + bob - Math.round(rh * 0.45), Math.round(r * 0.22), Math.round(rh * 0.15), PX.hagRim);
  ctx.globalAlpha = 1;

  // ============ EARS — tiny pointed ears poking up from the top
  ctx.fillStyle = PX.hagDark;
  const earY = cy + bob - rh;
  // Left ear
  ctx.fillRect(cx - Math.round(r * 0.4), earY - 1, 3, 2);
  ctx.fillRect(cx - Math.round(r * 0.4) + 1, earY - 3, 1, 2);
  // Right ear
  ctx.fillRect(cx + Math.round(r * 0.4) - 3, earY - 1, 3, 2);
  ctx.fillRect(cx + Math.round(r * 0.4) - 2, earY - 3, 1, 2);
  // Inner ear pink
  ctx.fillStyle = PX.hagBlush;
  ctx.fillRect(cx - Math.round(r * 0.4) + 1, earY - 1, 1, 1);
  ctx.fillRect(cx + Math.round(r * 0.4) - 2, earY - 1, 1, 1);

  // ============ FACE
  // Eyes — small beady eyes, close together for that cute look
  const eyeOffX = Math.round(r * 0.22);
  const eyeY = cy + bob - Math.round(rh * 0.22);
  const eyeR = Math.max(2, Math.round(r * 0.18));
  drawEllipse(ctx, cx - eyeOffX, eyeY, eyeR + 1, eyeR + 1, PX.hagOutline);
  drawEllipse(ctx, cx + eyeOffX, eyeY, eyeR + 1, eyeR + 1, PX.hagOutline);
  drawEllipse(ctx, cx - eyeOffX, eyeY, eyeR, eyeR, PX.eyeWhite);
  drawEllipse(ctx, cx + eyeOffX, eyeY, eyeR, eyeR, PX.eyeWhite);
  const pupilR = Math.max(1, Math.round(eyeR * 0.7));
  const glance = Math.round(Math.sin(phase * 0.7) * 1);
  drawEllipse(ctx, cx - eyeOffX + glance, eyeY + 1, pupilR, pupilR, PX.eyePupil);
  drawEllipse(ctx, cx + eyeOffX + glance, eyeY + 1, pupilR, pupilR, PX.eyePupil);
  ctx.fillStyle = PX.eyeWhite;
  ctx.fillRect(cx - eyeOffX + glance - 1, eyeY, 1, 1);
  ctx.fillRect(cx + eyeOffX + glance - 1, eyeY, 1, 1);

  // Nose — small black button below eyes, slightly raised
  ctx.fillStyle = PX.eyePupil;
  const noseY = cy + bob + Math.round(rh * 0.05);
  ctx.fillRect(cx - 1, noseY, 3, 2);
  ctx.fillStyle = PX.hagRim;
  ctx.fillRect(cx - 1, noseY, 1, 1); // tiny nose-highlight

  // Mouth — small line under the nose
  ctx.fillStyle = PX.eyePupil;
  ctx.fillRect(cx, noseY + 3, 1, 2);
  ctx.fillRect(cx - 2, noseY + 4, 2, 1);
  ctx.fillRect(cx + 1, noseY + 4, 2, 1);

  // Cheek blush
  ctx.fillStyle = PX.hagBlush;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(cx - Math.round(r * 0.5), cy + bob + Math.round(rh * 0.05), 3, 2);
  ctx.fillRect(cx + Math.round(r * 0.5) - 3, cy + bob + Math.round(rh * 0.05), 3, 2);
  ctx.globalAlpha = 1;
}

// Pixel-art filled ellipse — built from horizontal strips so the shape
// stays crisp at integer pixel coordinates and works against the
// structural CanvasRoomContext interface (no native `ellipse`).
function drawEllipse(
  ctx: CanvasRoomContext,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string
): void {
  ctx.fillStyle = color;
  const rxs = rx * rx;
  const rys = ry * ry;
  for (let dy = -ry; dy <= ry; dy += 1) {
    const w = Math.round(Math.sqrt(Math.max(0, rxs * (1 - (dy * dy) / rys))));
    if (w <= 0) continue;
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

function drawPrompt(
  ctx: CanvasRoomContext,
  surface: CanvasRoomSurface,
  doors: readonly DoorLayout[],
  snapshot: DecodedSnapshot
): void {
  if (snapshot.interactionKind === 'none') {
    return;
  }
  const door = doors[snapshot.interactionDoorIndex];
  if (door === undefined) {
    return;
  }

  const verb = snapshot.interactionKind === 'launchable' ? 'Enter' : 'Locked';
  const text = `${verb} ${door.title}`;
  const x = Math.round(surface.width / 2);
  const y = surface.height - 6;

  // Background plate — keeps text legible no matter what's behind
  ctx.font = `bold 8px Georgia, "Liberation Serif", serif`;
  ctx.textAlign = 'center';
  // Faux text-width estimate (no measureText on the structural interface)
  const approxW = text.length * 5;
  ctx.fillStyle = PX.promptShadow;
  ctx.fillRect(x - Math.round(approxW / 2) - 4, y - 8, approxW + 8, 12);

  // Text
  ctx.fillStyle = PX.promptText;
  ctx.fillText(text, x, y);
}

function activeDoorId(snapshot: DecodedSnapshot): string | null {
  if (snapshot.interactionKind === 'none') {
    return null;
  }
  const door = snapshot.doors[snapshot.interactionDoorIndex];
  return door?.id ?? null;
}

function scaleDoorBounds(
  surface: CanvasRoomSurface,
  room: RoomDefinition,
  door: RoomDoorDefinition
): ScaledRect {
  const width = door.bounds.maxX - door.bounds.minX;
  const height = door.bounds.maxY - door.bounds.minY;
  return {
    x: Math.round((door.bounds.minX / room.worldWidth) * surface.width),
    y: Math.round((door.bounds.minY / room.worldHeight) * surface.height),
    width: Math.round((width / room.worldWidth) * surface.width),
    height: Math.round((height / room.worldHeight) * surface.height)
  };
}

function doorSide(
  rect: ScaledRect,
  surface: CanvasRoomSurface
): 'left' | 'right' | 'top' | 'bottom' {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const w = surface.width;
  const h = surface.height;
  // Closest edge wins
  const distLeft = cx;
  const distRight = w - cx;
  const distTop = cy;
  const distBottom = h - cy;
  const min = Math.min(distLeft, distRight, distTop, distBottom);
  if (min === distLeft) return 'left';
  if (min === distRight) return 'right';
  if (min === distTop) return 'top';
  return 'bottom';
}

function doorTitleForId(id: string): string {
  return getGameById(HUB_GAME_REGISTRY, id)?.title ?? prettifyKebab(id);
}

function doorShortLabel(title: string): string {
  // Sign space is tight — use initials for multi-word titles
  const words = title.split(/\s+/).filter((w) => w.length > 0);
  if (words.length >= 2) {
    return words.map((w) => w[0]!.toUpperCase()).join('');
  }
  return title;
}

function prettifyKebab(id: string): string {
  return id
    .split('-')
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ');
}
