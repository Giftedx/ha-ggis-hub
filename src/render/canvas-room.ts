import { HUB_GAME_REGISTRY, getGameById } from '../games/registry';
import type { RoomDefinition, RoomDoorDefinition } from '../wasm/boundary';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';
import { blitSprite } from './sprite';
import { drawCanonHaggis } from './canon-haggis';
import { drawWhsHearthFrame, HEARTH_CANVAS_SIZE, HEARTH_FRAME_COUNT } from './whs-hearth';
import {
  drawWhsBothyWalls, drawWhsBothyFloor, drawWhsWindowBay, drawWhsDoor,
  drawWhsMantelpiece, type BothyEnvelope
} from './whs-bothy';
import {
  PALETTE,
  makeBeamGeometry,
  lightZoneAt,
  hardContactShadow
} from './palette';
import { DOOR_SIGN, LANTERN_LIT } from './sprites/door';
import { renderPixelText, measurePixelText, PIXEL_FONT_HEIGHT } from './sprites/pixel-font';

// ha.ggis bothy renderer. The host locks the canvas internal buffer to
// 540×360 (3:2 aspect); CSS object-fit:contain + image-rendering:auto
// scales it to the viewport with bilinear smoothing, which suits the
// AA-smooth procedural art (haggis, walls, hearth). Every draw call uses
// integer pixel coordinates so shapes stay sharp at native resolution.

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
  save(): void;
  restore(): void;
  ellipse(
    x: number, y: number, radiusX: number, radiusY: number,
    rotation: number, startAngle: number, endAngle: number
  ): void;
  clip(): void;
}

export interface CanvasRoomSurface {
  readonly width: number;
  readonly height: number;
  getContext(kind: '2d'): CanvasRoomContext | null;
}

export interface CanvasRoomRenderer {
  render(snapshot: DecodedSnapshot): void;
}

// Palette — Hub Dawn Bothy tokens locked in
// docs/decisions/0006-hub-visual-direction-highland-dawn-bothy.md.
// The hub has its OWN palette; it does NOT adopt WHS's DESIGN.md tokens.
// Field names match the prior structure so draw fns are unchanged.
const PX = {
  // Backdrop behind the bothy (deepest ink that peeks past walls)
  void: '#1a0e08',                  // ink-deep
  // Warm sandstone-plastered walls — lit by dawn through the window
  stoneShadow: '#3a2418',           // peat-brown
  stoneDark: '#4a2c18',
  stoneMid: '#8a6a4a',              // sandstone mid (lit warm)
  stoneLight: '#b8a878',            // cairn-stone
  stoneHighlight: '#d8c898',
  mortar: '#3a2418',
  // Floor — warm peat-stained oak boards
  floorDark: '#2a1810',
  floorMid: '#4a2c1c',
  floorLight: '#7a5230',
  floorSeam: '#1a0e08',
  floorKnot: '#1a0a04',
  floorLitWash: '#e4a020',          // neeps-orange wash from the hearth
  // Wooden doors — warm timber, lit
  woodWarm: '#5a3220',
  woodWarmShade: '#2a1808',
  woodWarmHighlight: '#8a5630',
  woodCold: '#3a2a30',              // locked door reads ash-grey (still warm-tinted)
  woodColdShade: '#1a1218',
  // Iron + brass
  iron: '#2a1a14',
  ironHighlight: '#5a4a3a',
  goldHandle: '#c8842a',            // whisky-amber
  goldHandleDark: '#7a5018',
  // Fire — banked embers from last night, warm but not roaring
  flameCore: '#fff0c8',
  flameMid: '#e4a020',              // neeps-orange
  flameOuter: '#c8842a',            // whisky-amber
  ember: '#c44218',                 // ember-red
  // Wild haggis — peat-brown body with a ginger mane suggestion
  hagOutline: '#1a0e08',
  hagDark: '#3a2418',
  hagBody: '#5a3a20',
  hagLight: '#8a6038',              // ginger highlight (mane hint)
  hagRim: '#c8a058',                // warm rim catching the dawn
  hagBlush: '#a44030',              // dusty rose nose (warm, not pink)
  hagShadow: 'rgba(20, 10, 4, 0.5)',
  // Eyes — cream whites read warmer than cool blue-white in the dawn light
  eyeWhite: '#f0e6c8',              // tatties-cream
  eyePupil: '#1a0e08',
  legDark: '#1a0e08',
  // Lantern halo + active glow — warm dawn glow
  haloWarm: '#e4a020',              // neeps-orange (launchable)
  haloCool: '#7a4a9c',              // heather-purple (locked counterpoint, dawn-correct)
  // Door signs — oat wood + cream paint
  signWood: '#5a3220',
  signEdge: '#1a0e08',
  signText: '#f0e6c8',              // tatties-cream
  signTextShadow: '#2a1408',
  // Interaction prompt
  promptShadow: 'rgba(26, 14, 8, 0.92)',
  promptText: '#f0e6c8',             // tatties-cream
  // Wall ornaments
  brackenGreen: '#5a7a5a',           // art-bracken-green — dried herbs
  brackenStem: '#3a2418',            // art-peat-mid — dark dried stem
  cordTwine: '#b8a878',              // art-cairn-stone — hanging cord
  cordShadow: '#7a5018',             // art-whisky-deep — cord shadow line
  stemFade: '#7a5230'                // art-oat-dark — alternate/faded stem
} as const;

// Wall thickness — 3/4 OBLIQUE PROJECTION (committed after reviewer
// diagnosed mixed-projection as root cause of "sloped up" feeling).
// The BACK wall (top of screen) is the dominant feature in 3/4
// framing; side + bottom walls are thinner trim. This converts the
// scene from "4-wall frame seen top-down with elevation cheating"
// into "looking into the bothy through a 3/4 angle, back wall front
// and centre".
const WALL_THICK_BACK = 96;   // back wall — dominant, holds window/decor
const WALL_THICK_SIDE = 24;   // side walls — thin trim
const WALL_THICK_FRONT = 24;  // front wall — thin trim

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
  room: RoomDefinition,
  options?: { readonly reducedMotion?: boolean }
): CanvasRoomRenderer {
  const reducedMotion = options?.reducedMotion ?? false;
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
  let prevPlayerX: number | null = null;
  let prevPlayerY: number | null = null;
  let haggisFacingLeft = false;
  let haggisIsMoving = false;

  return {
    render(snapshot: DecodedSnapshot): void {
      const dpr = typeof window !== 'undefined' ? Math.round(window.devicePixelRatio || 1) : 1;
      (context as unknown as { setTransform?(a: number, b: number, c: number, d: number, e: number, f: number): void }).setTransform?.(dpr, 0, 0, dpr, 0, 0);
      if (prevPlayerX !== null && prevPlayerY !== null) {
        const dx = snapshot.playerX - prevPlayerX;
        const dy = snapshot.playerY - prevPlayerY;
        haggisIsMoving = Math.abs(dx) + Math.abs(dy) > 2;
        if (Math.abs(dx) > 2) {
          haggisFacingLeft = dx < 0;
        }
      }
      prevPlayerX = snapshot.playerX;
      prevPlayerY = snapshot.playerY;
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
      renderRoom(context, surface, room, doors, snapshot, phase, haggisFacingLeft, haggisIsMoving, reducedMotion);
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
      return { ...rect, x: WALL_THICK_SIDE - 2 };
    case 'right':
      return { ...rect, x: surface.width - WALL_THICK_SIDE - rect.width + 2 };
    case 'top':
      return { ...rect, y: WALL_THICK_BACK - 2 };
    case 'bottom':
      return { ...rect, y: surface.height - WALL_THICK_FRONT - rect.height + 2 };
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
  phase: number,
  haggisFacingLeft: boolean,
  haggisIsMoving: boolean,
  reducedMotion: boolean
): void {
  // 1. Void backdrop (frames the room)
  ctx.fillStyle = PX.void;
  ctx.fillRect(0, 0, surface.width, surface.height);

  // 2. Floor
  drawFloor(ctx, surface, phase, reducedMotion);

  // 3. Active interaction id (drives door + lantern + interior light)
  const interactingId = activeDoorId(snapshot);

  // 4. Door openings + frames (drawn before walls so the wall masks the
  //    door edge if needed; but with our layout the door sits inside the
  //    interior and the wall is its border, so order is just visual stacking)
  for (const door of doors) {
    drawDoor(ctx, door, interactingId);
  }

  // 5. Perimeter walls — WHS bothy port (peat-plaster + timber beams).
  //    Replaces the prior pixel stone-tile wall drawer. The pixel
  //    drawWalls fn is retired in favor of procedural plaster substrate
  //    that matches the WHS-quality haggis + hearth register.
  const bothyEnv: BothyEnvelope = {
    left: WALL_THICK_SIDE,
    right: surface.width - WALL_THICK_SIDE,
    top: 0,
    wallBottom: WALL_THICK_BACK,
    floorBottom: surface.height - WALL_THICK_FRONT,
    compact: surface.width < 600
  };
  drawWhsBothyWalls(ctx, bothyEnv);

  // 6. Wall-mounted lanterns above each door — only the launchable
  //    one gets a fixture (unlit lanterns are visual noise).
  for (const door of doors) {
    if (door.status === 'launchable') {
      drawLantern(ctx, door, phase);
      drawSign(ctx, door, doorShortLabel(door.title));
    }
  }

  // 7. Hearth — WHS port (drawWhsHearthFrame). 72×72 native; scale 2
  // = 144×144 footprint. Anchor: fireCenter is the hearthstone center,
  // we shift origin so the hearthstone slab (s-8..s-2) sits at floor.
  const fireCenter = {
    x: Math.round(surface.width / 2),
    y: Math.round(surface.height * 0.78)
  };
  const HEARTH_SCALE = 1.4;
  const hearthSize = HEARTH_CANVAS_SIZE * HEARTH_SCALE;
  const hearthOriginX = fireCenter.x - hearthSize / 2;
  const hearthOriginY = fireCenter.y - hearthSize / 2;

  // Warm floor glow around hearth — smooth translucent ellipses,
  // pulsing with the flame flicker. Clipped to the floor area so it
  // doesn't spill onto the front wall.
  const hearthFlicker = reducedMotion ? 1.0 : 0.75 + Math.sin(phase * 4.2) * 0.1;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(WALL_THICK_SIDE, WALL_THICK_BACK);
  ctx.lineTo(surface.width - WALL_THICK_SIDE, WALL_THICK_BACK);
  ctx.lineTo(surface.width - WALL_THICK_SIDE, surface.height - WALL_THICK_FRONT);
  ctx.lineTo(WALL_THICK_SIDE, surface.height - WALL_THICK_FRONT);
  ctx.closePath();
  ctx.clip();
  for (let i = 4; i >= 1; i--) {
    const r = 100 * (i / 4);
    ctx.save();
    ctx.globalAlpha = 0.055 * i * hearthFlicker;
    ctx.fillStyle = PALETTE.dawnPeach;
    ctx.beginPath();
    ctx.ellipse(fireCenter.x, fireCenter.y, r * 1.2, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  hardContactShadow(ctx, fireCenter.x, fireCenter.y + Math.round(hearthSize / 2) + 2, 50, 3);
  const hearthFrameIdx = reducedMotion ? 0 : Math.floor(phase * 7) % HEARTH_FRAME_COUNT;
  drawWhsHearthFrame(ctx, hearthOriginX, hearthOriginY, HEARTH_SCALE, hearthFrameIdx);
  drawHearthLintelMotto(ctx, fireCenter.x, hearthOriginY, HEARTH_SCALE);

  // 8. Wall decorations — WHS window in the back wall + mantelpiece.
  drawTopWallWindow(ctx, surface, phase, reducedMotion);

  // Mantelpiece on the back wall, centred above the hearth. Sits at
  // the lower back wall area so the candle flame catches firelight.
  const mantelW = Math.min(180, Math.round(surface.width * 0.32));
  const mantelH = 8;
  const mantelX = Math.round(surface.width / 2 - mantelW / 2);
  const mantelY = WALL_THICK_BACK - mantelH - 6;
  drawWhsMantelpiece(ctx, { x: mantelX, y: mantelY, w: mantelW, h: mantelH });

  // 8.25 Wall ornaments — 2 dried-herb bundles + 1 framed painting.
  //      DESIGN.md ornament budget: framed-objects-max 3 (spending 1),
  //      dried-herb-bundles-max 2 (spending 2). Static; no phase dep.
  drawWallOrnaments(ctx, surface);

  // 8. Haggis player
  drawHaggis(ctx, surface, room, snapshot, phase, haggisFacingLeft, haggisIsMoving, reducedMotion);

  // 8.5 Ambient particles — smoke wisps rising from the fire, and dust
  //     motes drifting in the cool moonlight under the window. Subtle
  //     motion that brings the room alive without distracting.
  if (!reducedMotion) drawAmbientParticles(ctx, surface, fireCenter, phase);

  // 9. Vignette — soft dark falloff at the corners to focus attention
  //    inward. Drawn just before the prompt so the prompt remains crisp.
  drawVignette(ctx, surface);

  // 10. Prompt (only when at a door)
  drawPrompt(ctx, surface, doors, snapshot);
}

// ── Wall ornaments ─────────────────────────────────────────────────────────

function drawWallOrnaments(ctx: CanvasRoomContext, surface: CanvasRoomSurface): void {
  // DESIGN.md ornament budget: 2 dried-herb bundles + 1 framed object.
  // All positions are in logical 540×360 space — fully deterministic.

  // Bundles hang from the ceiling timber beam (tieY=5 = beam bottom edge).
  // Placed in the left and right open wall regions, well clear of the
  // window outer frame (x≈235..312) and side posts (x≈24, x≈516).
  drawHerbBundle(ctx, 80, 5);
  drawHerbBundle(ctx, 460, 5);

  // Framed painting — left back wall. DESIGN.md voice.open.framed-painting-
  // caption = "(unfinished)": sky + mountains started, foreground blank.
  // x=44, y=18 positions it in the left third of the back wall, clear of
  // the window (outer frame starts at x≈235) and side wall (inner edge x=24).
  if (surface.width >= 400) {
    drawFramedPicture(ctx, 44, 18, 36, 28);
  }
}

function drawHerbBundle(ctx: CanvasRoomContext, tieX: number, tieY: number): void {
  // 5 stems fan out from the tie point and droop downward.
  // Tips carry small ellipse buds (bracken green). Cord wrap at tieY.
  type Stem = { readonly dx: number; readonly dy: number; readonly rot: number; readonly fade: boolean };
  const stems: readonly Stem[] = [
    { dx: -8, dy: 20, rot: -0.4, fade: false },
    { dx: -4, dy: 23, rot: -0.15, fade: true  },
    { dx:  0, dy: 24, rot:  0.0,  fade: false },
    { dx:  4, dy: 23, rot:  0.15, fade: true  },
    { dx:  8, dy: 20, rot:  0.4,  fade: false },
  ] as const;

  ctx.save();

  // Stems
  for (const s of stems) {
    ctx.save();
    ctx.strokeStyle = s.fade ? PX.stemFade : PX.brackenStem;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.moveTo(tieX, tieY + 4);
    ctx.lineTo(tieX + s.dx, tieY + s.dy);
    ctx.stroke();
    ctx.restore();

    // Bud (small oval at stem tip, lit on the right — toward the window)
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = PX.brackenGreen;
    ctx.beginPath();
    ctx.ellipse(tieX + s.dx, tieY + s.dy + 1, 2, 3, s.rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Cord wrap — a 3px strip around the tie point, earthy twine colour
  ctx.save();
  ctx.fillStyle = PX.cordTwine;
  ctx.globalAlpha = 0.90;
  ctx.fillRect(tieX - 4, tieY, 8, 3);
  ctx.fillStyle = PX.cordShadow;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(tieX - 3, tieY + 1, 6, 1);
  ctx.restore();

  ctx.restore();
}

function drawFramedPicture(
  ctx: CanvasRoomContext,
  x: number, y: number, w: number, h: number
): void {
  // Amateur Highland landscape, unfinished. Sky + mountains painted;
  // foreground left as bare cream canvas. Frame is warm wood.

  // Outer shadow (deepest ink — shadow side of frame, correct for left-wall
  // placement where the window source is to the right)
  ctx.fillStyle = PX.void;
  ctx.fillRect(x - 2, y, 2, h + 2);     // left shadow
  ctx.fillRect(x - 2, y + h, w + 4, 2); // bottom shadow

  // Frame body — warm wood (PX.woodWarm tokens)
  ctx.fillStyle = PX.woodWarmShade;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PX.woodWarm;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

  // Frame highlight — top + right edges (lit side, toward window)
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = PX.woodWarmHighlight;
  ctx.fillRect(x + 1, y + 1, w - 2, 1); // top edge lit
  ctx.fillRect(x + w - 2, y + 1, 1, h - 2); // right edge lit
  ctx.restore();

  // Inner canvas — cream ground (tatties-cream from PX.eyeWhite)
  const bord = 3;
  const cx = x + bord, cy = y + bord, cw = w - bord * 2, ch = h - bord * 2;
  ctx.fillStyle = PX.eyeWhite;
  ctx.fillRect(cx, cy, cw, ch);

  // Sky wash — upper 45% of canvas: heather-purple (painted first)
  ctx.save();
  ctx.globalAlpha = 0.52;
  ctx.fillStyle = PX.haloCool;
  ctx.fillRect(cx, cy, cw, Math.round(ch * 0.45));
  // Dawn-pink horizon strip on top of heather (sun starting to break)
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = PALETTE.edgePink;
  ctx.fillRect(cx, cy + Math.round(ch * 0.28), cw, Math.round(ch * 0.22));
  ctx.restore();

  // Mountain silhouette — two overlapping triangular ridges
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = PX.brackenStem;
  const mBase = cy + Math.round(ch * 0.62);
  // Left ridge
  ctx.beginPath();
  ctx.moveTo(cx, mBase);
  ctx.lineTo(cx + Math.round(cw * 0.36), cy + Math.round(ch * 0.36));
  ctx.lineTo(cx + Math.round(cw * 0.58), mBase);
  ctx.closePath();
  ctx.fill();
  // Right ridge (taller, overlaps left)
  ctx.beginPath();
  ctx.moveTo(cx + Math.round(cw * 0.44), mBase);
  ctx.lineTo(cx + Math.round(cw * 0.72), cy + Math.round(ch * 0.30));
  ctx.lineTo(cx + cw, mBase);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Lower canvas — bare cream (unfinished: foreground never painted)
  ctx.fillStyle = PX.eyeWhite;
  ctx.fillRect(cx, mBase, cw, cy + ch - mBase);
}

function drawAmbientParticles(
  ctx: CanvasRoomContext,
  surface: CanvasRoomSurface,
  fireCenter: { readonly x: number; readonly y: number },
  phase: number
): void {
  // Ember sparks rising from the fire — small bright orange specks
  // that fade fast. Sells the fire as "active" not painted-on.
  for (let i = 0; i < 5; i += 1) {
    const life = ((phase * 0.5 + i * 0.31) % 1);
    if (life < 0.05 || life > 0.85) continue;
    const sway = Math.sin(phase * 3.1 + i * 1.7) * 4;
    const sx = fireCenter.x + sway + (i - 2) * 2;
    const sy = fireCenter.y - 18 - life * 50;
    const alpha = (1 - life) * 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = life < 0.4 ? '#ffe080' : '#ff8a40';
    ctx.beginPath();
    ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Smoke wisps rising from hearth — smooth small ellipses scaling
  // larger + fading as they rise. Two-tone (warm at base → cool grey
  // higher). Phase 3-coherent: no pixel rects.
  for (let i = 0; i < 8; i += 1) {
    const life = ((phase * 0.3 + i * 0.22) % 1);
    if (life < 0.05) continue;
    const sway = Math.sin(phase * 1.7 + i * 2.1) * 8;
    const sx = fireCenter.x + sway;
    const sy = fireCenter.y - 32 - life * 90;
    const alpha = (1 - life) * 0.55;
    const r = 2 + life * 5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = life < 0.3 ? '#c89880' : '#9a8a7a';
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Dust motes in the dawn beam — small cream specks drifting down,
  // brightest near the window, fading toward the floor. Smooth tiny
  // circles instead of pixel rects.
  const windowCx = Math.round(surface.width / 2);
  for (let i = 0; i < 14; i += 1) {
    const motePhase = phase * 0.25 + i * 0.31;
    const my = WALL_THICK_BACK + 8 + ((motePhase * 32) % 180);
    const swayAmp = 18 + (i % 3) * 6;
    const mx = windowCx + Math.sin(motePhase * 1.4 + i) * swayAmp + (i - 7) * 5;
    const lit = Math.max(0, 1 - (my - WALL_THICK_BACK) / 160);
    if (lit < 0.05) continue;
    ctx.save();
    ctx.globalAlpha = 0.7 * lit;
    ctx.fillStyle = '#fff0c8';
    ctx.beginPath();
    ctx.arc(mx, my, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawTopWallWindow(
  ctx: CanvasRoomContext,
  surface: CanvasRoomSurface,
  phase: number,
  reducedMotion: boolean
): void {
  // Phase 3a: window now uses WHS drawWhsWindowBay — loch view +
  // distant mountains + dawn sun glow + cross mullion + wood sill +
  // heather curtains. Highland Dawn theme literal.
  const cx = Math.round(surface.width / 2);
  const winW = 56;
  const winH = 44;
  const wy = Math.round((WALL_THICK_BACK - winH) / 2);
  const wx = cx - Math.round(winW / 2);
  drawWhsWindowBay(ctx, { x: wx, y: wy, w: winW, h: winH }, surface.width < 600);
  // Sync the window pane brightness with the floor beam's 22-second pulse
  // so the light source and its cast shadow feel like the same phenomenon.
  const dawnPulse = reducedMotion ? 1.0 : 0.95 + Math.sin(phase * 0.28) * 0.05;
  ctx.save();
  ctx.globalAlpha = 0.04 * dawnPulse;  // 0.038 – 0.042 range, barely perceptible
  ctx.fillStyle = PALETTE.dawnPeach;
  ctx.fillRect(wx, wy, winW, winH);
  ctx.restore();
}

function drawVignette(ctx: CanvasRoomContext, surface: CanvasRoomSurface): void {
  const w = surface.width;
  const h = surface.height;
  // Softer corner vignette — previous (4 layers at 0.045+0.035i) was
  // eating the corners. Halved to a gentler frame.
  const layers = 3;
  for (let i = 0; i < layers; i += 1) {
    const fade = 0.018 + i * 0.012;
    const thickness = Math.round(((i + 1) / layers) * 24);
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = fade;
    ctx.fillRect(0, 0, w, thickness);
    ctx.fillRect(0, h - thickness, w, thickness);
    ctx.fillRect(0, 0, thickness, h);
    ctx.fillRect(w - thickness, 0, thickness, h);
  }
  ctx.globalAlpha = 1;
}

// drawFloor — WHS bothy flagstone substrate + dawn-beam overlay +
// mullion shadows. Replaced 160+ lines of pixel-art per-zone dither
// (Phase 2b) with WHS-quality smooth flagstones + simple translucent
// beam ellipse. Keeps signature dawn-light-from-window flourish.
function drawFloor(ctx: CanvasRoomContext, surface: CanvasRoomSurface, phase: number, reducedMotion: boolean): void {
  const env: BothyEnvelope = {
    left: WALL_THICK_SIDE,
    right: surface.width - WALL_THICK_SIDE,
    top: 0,
    wallBottom: WALL_THICK_BACK,
    floorBottom: surface.height - WALL_THICK_FRONT,
    compact: surface.width < 600
  };
  drawWhsBothyFloor(ctx, env);

  // Dawn beam — translucent warm trapezoid + subtle COOL loch-tint.
  // Gentle 22-second pulse (±5%) gives the early-morning light a
  // barely-perceptible shifting quality, like clouds on the horizon.
  const beam = makeBeamGeometry(surface.width, surface.height, WALL_THICK_BACK);
  const dawnPulse = reducedMotion ? 1.0 : 0.95 + Math.sin(phase * 0.28) * 0.05;
  fillTrapezoidAlpha(ctx, beam, '#6a90b0', 0.06 * dawnPulse);  // cool loch cast
  fillTrapezoidAlpha(ctx, beam, PALETTE.dawnPeach, 0.18 * dawnPulse);
  fillTrapezoidAlpha(ctx, beam, PALETTE.dawnGold, 0.10 * dawnPulse);

  // Mullion shadows — two perpendicular dark stripes through the beam
  // marking the window's cross frame. The "actual sun-through-window"
  // signature flourish.
  drawMullionShadow(ctx, beam);
}

// Paint a beam trapezoid with a flat translucent colour (no dither).
function fillTrapezoidAlpha(
  ctx: CanvasRoomContext,
  beam: ReturnType<typeof makeBeamGeometry>,
  colour: string,
  alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(beam.cx - beam.topHalfWidth, beam.topY);
  ctx.lineTo(beam.cx + beam.topHalfWidth, beam.topY);
  ctx.lineTo(beam.cx + beam.bottomHalfWidth, beam.topY + beam.length);
  ctx.lineTo(beam.cx - beam.bottomHalfWidth, beam.topY + beam.length);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Fill a beam zone (pool or edge) as a single trapezoid covering all
// pixels that classify into that zone.
// One-row Bayer transition between two colours — used for the window
// sky band transitions. Walks a single horizontal row and picks one of
// the two colours per pixel based on the Bayer 4×4 cell.
// Dither the beam zone boundaries — walk down both diagonal edges of
// the pool + edge trapezoids and paint hard-pixel speckle of the
// adjacent zone's colour just inside/outside the edge. Removes the
// razor diagonal that reads as "two floor textures, not light".
// Paint cross-mullion shadow lines through the dawn pool — a vertical
// line down the centre, a horizontal line across the upper-middle.
// Mullion is dithered so it's hard-pixel but reads as a soft shadow.
// This converts the dawn-pool from a generic light wedge into a
// readable "window-cast" light.
function drawMullionShadow(
  ctx: CanvasRoomContext,
  beam: ReturnType<typeof makeBeamGeometry>
): void {
  // Smooth mullion cross — vertical + horizontal stripes through the
  // beam trapezoid as solid translucent dark fills (no dither). The
  // shadow is constrained to the beam zones (pool + edge), so it ends
  // at the trapezoid boundaries naturally.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = PALETTE.shadowDeep;
  // Vertical mullion: 3px wide central stripe down the beam.
  for (let yy = beam.topY; yy < beam.topY + beam.length; yy += 1) {
    if (lightZoneAt(beam.cx, yy, beam) === 'shadow') continue;
    ctx.fillRect(beam.cx - 1, yy, 3, 1);
  }
  // Horizontal mullion: 3px tall stripe across the beam at ~32%.
  const horizMullionY = beam.topY + Math.round(beam.length * 0.32);
  for (let xx = beam.cx - beam.bottomHalfWidth - 8; xx <= beam.cx + beam.bottomHalfWidth + 8; xx += 1) {
    if (lightZoneAt(xx, horizMullionY, beam) === 'shadow') continue;
    ctx.fillRect(xx, horizMullionY - 1, 1, 3);
  }
  ctx.restore();
}

function drawDoor(
  ctx: CanvasRoomContext,
  door: DoorLayout,
  interactingId: string | null
): void {
  const { x, y, width, height } = door.rect;
  const isLaunchable = door.status === 'launchable';
  const isLocked = door.status === 'locked';

  // Phase 3b: WHS smooth door port. Locked → dark wood. Launchable →
  // lit warm wood with brass handle catching the dawn glow. Available
  // (in-between) → mid wood.
  const state = isLaunchable ? 'open' : isLocked ? 'locked' : 'available';
  drawWhsDoor(ctx, { x, y, w: width, h: height }, state);

  // Active interaction glow — smooth translucent ellipse (no dither;
  // those pixel dots were screaming against the smooth substrate).
  if (interactingId === door.id) {
    const glowColor = isLaunchable ? PALETTE.dawnGold : PALETTE.shadowHeather;
    const cx = x + Math.round(width / 2);
    const cy = y + Math.round(height / 2);
    for (let i = 3; i >= 1; i--) {
      const r = (width * 0.6) * (i / 3);
      ctx.save();
      ctx.globalAlpha = 0.10 * i;
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.1, r * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawLantern(ctx: CanvasRoomContext, door: DoorLayout, phase: number): void {
  const { x, y, width } = door.rect;
  const isLit = door.status === 'launchable';
  // Lantern hangs above the door. Substantially bigger now — the
  // previous size was a 10px wide pinprick that disappeared at viewport
  // scale. Now 22px wide with a proper iron bracket curl off the wall.
  const cx = x + Math.round(width / 2);
  const lanternCy = y - 22;
  if (isLit) {
    const pulse = 0.5 + Math.sin(phase * 4) * 0.1 + Math.sin(phase * 9.1) * 0.05;
    // Phase 3c: smooth translucent halo (dithered version read as
    // noise against the WHS substrate). Two layered ellipses fading
    // outward, multiplied by pulse for the lantern flicker.
    for (let i = 4; i >= 1; i--) {
      const r = 80 * (i / 4);
      ctx.save();
      ctx.globalAlpha = 0.05 * i * pulse;
      ctx.fillStyle = PALETTE.dawnGold;
      ctx.beginPath();
      ctx.ellipse(cx, lanternCy, r, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.4 * pulse;
    ctx.fillStyle = PALETTE.dawnHighlight;
    ctx.beginPath();
    ctx.ellipse(cx, lanternCy, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Blit the lantern sprite (centred at cx, lanternCy)
  blitSprite(ctx, LANTERN_LIT, cx, lanternCy, 2);
}

function drawSign(ctx: CanvasRoomContext, door: DoorLayout, label: string): void {
  const { x, y, width } = door.rect;
  const cx = x + Math.round(width / 2);
  // Sign hangs above the lantern. Sprite-based now.
  const signCy = y - 50;
  blitSprite(ctx, DOOR_SIGN, cx, signCy, 1);

  // Label rendered in HAND-PAINTED PIXEL FONT (rules.md §6) — no more
  // anti-aliased browser fillText that read as a UI sticker.
  // ASCII-only: convert label to uppercase since the pixel font is
  // single-case. Strip non-supported chars rendered as space.
  const upper = label.toUpperCase();
  const scale = 2;
  const textW = measurePixelText(upper, scale);
  const textH = PIXEL_FONT_HEIGHT * scale;
  renderPixelText(ctx, upper, cx - Math.round(textW / 2), signCy - Math.round(textH / 2) + 2, scale, PALETTE.bone);
}

// Wild haggis — now rendered via hand-painted pixel-art sprite.
// See src/render/sprites/haggis.ts for the char-grid definition.
// Iteration history: v1 toad-box, v2 sunglass-bar, v3 horizontal-pillow
// with eye-gleam pop, v4 hamster face, v5 = current (split gleams,
// proper pink-snout bump, darker body fur).
function drawHaggis(
  ctx: CanvasRoomContext,
  surface: CanvasRoomSurface,
  room: RoomDefinition,
  snapshot: DecodedSnapshot,
  phase: number,
  facingLeft: boolean,
  isMoving: boolean,
  reducedMotion: boolean
): void {
  const cx = Math.round((snapshot.playerX / room.worldWidth) * surface.width);
  const cy = Math.round((snapshot.playerY / room.worldHeight) * surface.height);
  const bob = Math.round(Math.sin(phase * 2.6) * 1);

  // Canonical wild-haggis silhouette (canon-haggis.ts). Keyed to the
  // public/og.svg brief — the WHS sprite stand-in is retired. Low oval
  // body + asymmetric mane drape + cascading strands past silhouette
  // is the family-canon shape; this drawer is the in-game realisation.
  //
  // Hub scale: native ~56-wide → 2× = ~112-wide footprint. The body
  // anchor sits at body-center; snapshot (cx,cy) is the player feet
  // position, so offset upward so the feet land on the floor.
  const HAGGIS_SCALE = 2.6;
  const FEET_OFFSET = 16 * HAGGIS_SCALE;
  const bodyCx = cx;
  const bodyCy = cy + bob - FEET_OFFSET;

  hardContactShadow(ctx, cx, cy + bob + 6, 52, 2);

  // Walking leg cycle: back and front pairs alternate at a gentle trot.
  const walkCycle = phase * 6 * Math.PI;
  const legAmp = 1.5;
  const leftLegY = isMoving ? Math.sin(walkCycle) * legAmp : 0;
  const rightLegY = isMoving ? Math.sin(walkCycle + Math.PI) * legAmp : 0;
  // Mane sway and tail wag are suppressed in reduced-motion mode.
  const maneSway = (!reducedMotion && isMoving) ? Math.sin(phase * 3 * Math.PI) * 1.0 : 0;
  const tailWag = (!reducedMotion && isMoving) ? Math.sin(phase * 4 * Math.PI) * 1.2 : 0;

  drawCanonHaggis(ctx, bodyCx, bodyCy, HAGGIS_SCALE, {
    breathY: Math.sin(phase * 1.4) * 0.4,
    facingLeft,
    leftLegY,
    rightLegY,
    maneSway,
    tailWag
  });
}

// Pure text-formatter for interaction prompts. Exposed so tests can
// verify the right label is chosen without driving the canvas. Single
// case (the pixel font is uppercase-only).
export function formatPromptText(
  interactionKind: 'launchable' | 'locked' | 'none',
  doorTitle: string
): string {
  if (interactionKind === 'launchable') {
    // Two-line prompt: title on top, "press enter" hint below. Joined
    // with newline; drawPrompt splits and renders both lines.
    return `AWA' IN — ${doorTitle.toUpperCase()}\nPRESS ENTER`;
  }
  if (interactionKind === 'locked') {
    return `${doorTitle.toUpperCase()}\nCOMIN' SOON.`;
  }
  return '';
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

  const text = formatPromptText(snapshot.interactionKind, door.title);
  const x = Math.round(surface.width / 2);
  const baseY = surface.height - 12;

  const scale = 2;
  const lineH = PIXEL_FONT_HEIGHT * scale;
  const lineGap = 2;
  // Split on \n for multi-line prompts (e.g. "AWA' IN — TITLE\nPRESS ENTER").
  const lines = text.split('\n');
  const widths = lines.map((line) => measurePixelText(line, scale));
  const plateW = Math.max(...widths) + 8;
  const plateH = lines.length * lineH + (lines.length - 1) * lineGap + 4;
  const plateX = x - Math.round(plateW / 2);
  const plateY = baseY - plateH;

  // Dark background plate so text reads on the busy floor.
  ctx.fillStyle = PX.promptShadow;
  ctx.fillRect(plateX, plateY, plateW, plateH);

  // Each line: 4-direction ink halo + cream main fill, centred.
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const lineW = widths[i]!;
    const lx = x - Math.round(lineW / 2);
    const ly = plateY + 2 + i * (lineH + lineGap);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as ReadonlyArray<readonly [number, number]>) {
      renderPixelText(ctx, line, lx + dx, ly + dy, scale, PALETTE.shadowDeep);
    }
    renderPixelText(ctx, line, lx, ly, scale, PALETTE.bone);
  }
}

// "Bide a while." — hearth lintel motto (DESIGN.md voice.open.hearth-lintel-motto).
// Carved into the stone band above the fire mouth: native y=10..20, warm
// cairn-stone ink (DESIGN.md art-cairn-stone = PX.stoneLight).
function drawHearthLintelMotto(
  ctx: CanvasRoomContext,
  fireCenterX: number,
  hearthOriginY: number,
  hearthScale: number
): void {
  const text = 'BIDE A WHILE.';
  const scale = 1;
  const textW = measurePixelText(text, scale);
  // Centre of the stone band: native y midpoint of 10..20 = 15.
  const bandCenterY = hearthOriginY + 15 * hearthScale;
  const textX = Math.round(fireCenterX - textW / 2);
  const textY = Math.round(bandCenterY - PIXEL_FONT_HEIGHT / 2);
  renderPixelText(ctx, text, textX, textY, scale, PX.stoneLight);
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
