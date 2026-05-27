// WHS hearth drawer — direct Canvas2D port of Wild Haggis Survivors'
// `drawHearthFrame()` (croft variant). Source:
//   ../../../wild-haggis-survivors/src/art/sprites/croft/hearth.ts
//
// 72×72 procedural hearth: peat-stone mouth + flanking stones, two
// crossed log shapes, layered flame column (4 colours), side licks,
// embers, kettle on the right hob with steam wisps. 4 wobble frames
// for fire animation (tipX/Y, leftLickY/rightLickY, emberGlow).
//
// Palette swap: WHS croft colors → hub RAMPS. Hub identity preserved.

import { RAMPS } from './palette';

export const HEARTH_CANVAS_SIZE = 72;
export const HEARTH_FRAME_COUNT = 4;

export interface HearthFrame {
  tipX: number;
  tipY: number;
  leftLickY: number;
  rightLickY: number;
  emberGlow: number;
}

export const HEARTH_FRAMES: readonly HearthFrame[] = [
  { tipX: -1, tipY: 0, leftLickY: -1, rightLickY: 1, emberGlow: 0.75 },
  { tipX: 0, tipY: -2, leftLickY: 0, rightLickY: -1, emberGlow: 1.0 },
  { tipX: 1, tipY: 0, leftLickY: 1, rightLickY: -1, emberGlow: 0.85 },
  { tipX: 0, tipY: 1, leftLickY: -1, rightLickY: 0, emberGlow: 0.65 },
];

// Hub palette substitution (Highland Dawn Bothy register).
// Hearth stones are WARM peat-stone (firelight heats them) — distinct
// from the COOL stoneRamp used for the room's cold wall stones. The
// hub's blue-violet stoneDeep would read wrong here; firelight wants
// warm browns. These match WHS croft hearth original (warmth zone).
const STONE_OUTLINE = '#1a1208';
const STONE_DARK = '#3a2818';
const STONE_MID = '#5a3e28';
const STONE_HI = '#7a5838';
const MORTAR = '#2a1c10';
void RAMPS;
const BACK_BLACK = '#08050a';
const LOG_DARK = RAMPS.woodDeep;
const LOG_MID = RAMPS.woodDark;
const LOG_CHAR = '#1a0a02';
const FLAME_BASE = RAMPS.emberDeep;
const FLAME_MID = RAMPS.emberMid;
const FLAME_HI = RAMPS.emberHot;
const FLAME_TIP = RAMPS.emberCore;
const EMBER_CORE = RAMPS.emberMid;
const EMBER_BRIGHT = RAMPS.emberHot;
const GLOW_WARM = RAMPS.emberHot;
const KETTLE_OUTLINE = '#080404';
const KETTLE_BODY = '#1a1410';
const KETTLE_HI = '#4a3a30';
const KETTLE_RIM_GLOW = '#6a4828';
const STEAM = '#f0eee0';

export interface WhsHearthContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotation: number,
    a0: number,
    a1: number
  ): void;
  fill(): void;
  stroke(): void;
  save(): void;
  restore(): void;
}

// Draw one hearth frame anchored at top-left (originX, originY) in canvas
// coords, with all internal coords scaled by `scale`. Native size 72×72;
// scale 2 → 144×144 hearth footprint.
export function drawWhsHearthFrame(
  ctx: WhsHearthContext,
  originX: number,
  originY: number,
  scale: number,
  frameIdx: number
): void {
  const s = HEARTH_CANVAS_SIZE;
  const cx = s / 2;
  const frame = HEARTH_FRAMES[frameIdx % HEARTH_FRAMES.length]!;

  // Adapter: every primitive accepts native (0..72) coords; we wrap
  // each op to apply the (originX, originY, scale) transform.
  const px = (x: number) => originX + x * scale;
  const py = (y: number) => originY + y * scale;
  const sc = (v: number) => v * scale;

  // ── Stone mantel + mouth ──
  fillRoundedRect(ctx, STONE_OUTLINE, 1, px(2), py(8), sc(s - 4), sc(s - 14), sc(3));
  fillRoundedRect(ctx, STONE_MID, 1, px(3), py(9), sc(s - 6), sc(s - 16), sc(3));

  // Individual stones — two horizontal courses.
  fillRectS(ctx, STONE_DARK, 1, px(4), py(10), sc(12), sc(10));
  fillRectS(ctx, STONE_DARK, 1, px(18), py(10), sc(10), sc(10));
  fillRectS(ctx, STONE_DARK, 1, px(s - 28), py(10), sc(10), sc(10));
  fillRectS(ctx, STONE_DARK, 1, px(s - 16), py(10), sc(12), sc(10));
  fillRectS(ctx, STONE_DARK, 1, px(4), py(30), sc(9), sc(10));
  fillRectS(ctx, STONE_DARK, 1, px(s - 13), py(30), sc(9), sc(10));
  // Mortar courses.
  fillRectS(ctx, MORTAR, 1, px(4), py(20), sc(s - 8), sc(1));
  fillRectS(ctx, MORTAR, 1, px(4), py(30), sc(s - 8), sc(1));
  // Stone top-edge highlights.
  fillRectS(ctx, STONE_HI, 0.8, px(4), py(10), sc(12), sc(1));
  fillRectS(ctx, STONE_HI, 0.8, px(s - 16), py(10), sc(12), sc(1));

  // ── Fire mouth — arched dark interior ──
  const mouthX = cx - 14;
  const mouthY = 24;
  const mouthW = 28;
  const mouthH = 28;
  fillRoundedRect(
    ctx,
    STONE_OUTLINE,
    1,
    px(mouthX - 1),
    py(mouthY - 1),
    sc(mouthW + 2),
    sc(mouthH + 2),
    sc(6)
  );
  fillRoundedRect(ctx, BACK_BLACK, 1, px(mouthX), py(mouthY), sc(mouthW), sc(mouthH), sc(5));

  // Warm pulse wash inside mouth.
  fillEllipse(
    ctx,
    GLOW_WARM,
    0.2 * frame.emberGlow,
    px(cx),
    py(mouthY + mouthH * 0.72),
    sc(mouthW + 4),
    sc(mouthH * 0.7)
  );

  // ── Logs — two crossed shapes at base of mouth ──
  fillRoundedRect(
    ctx,
    LOG_DARK,
    1,
    px(mouthX + 3),
    py(mouthY + mouthH - 10),
    sc(mouthW - 6),
    sc(6),
    sc(2)
  );
  fillRoundedRect(
    ctx,
    LOG_MID,
    1,
    px(mouthX + 4),
    py(mouthY + mouthH - 9),
    sc(mouthW - 8),
    sc(3),
    sc(1)
  );
  // Charred log ends.
  fillCircle(ctx, LOG_CHAR, 1, px(mouthX + 4), py(mouthY + mouthH - 7), sc(1.6));
  fillCircle(ctx, LOG_CHAR, 1, px(mouthX + mouthW - 4), py(mouthY + mouthH - 7), sc(1.6));

  // Front log at slight angle.
  fillTriangle(
    ctx,
    LOG_DARK,
    1,
    px(mouthX + 5),
    py(mouthY + mouthH - 3),
    px(mouthX + mouthW - 5),
    py(mouthY + mouthH - 6),
    px(mouthX + mouthW - 5),
    py(mouthY + mouthH - 2)
  );
  fillTriangle(
    ctx,
    LOG_DARK,
    1,
    px(mouthX + 5),
    py(mouthY + mouthH - 3),
    px(mouthX + 5),
    py(mouthY + mouthH - 6),
    px(mouthX + mouthW - 5),
    py(mouthY + mouthH - 6)
  );

  // ── Flame column ──
  const flameBaseY = mouthY + mouthH - 9;
  const flameX = cx + frame.tipX;
  const flameTopY = flameBaseY - 14 + frame.tipY;

  fillTriangle(
    ctx,
    FLAME_BASE,
    1,
    px(cx - 9),
    py(flameBaseY),
    px(cx + 9),
    py(flameBaseY),
    px(flameX),
    py(flameTopY)
  );
  fillTriangle(
    ctx,
    FLAME_MID,
    1,
    px(cx - 6),
    py(flameBaseY - 1),
    px(cx + 6),
    py(flameBaseY - 1),
    px(flameX),
    py(flameTopY + 3)
  );
  fillTriangle(
    ctx,
    FLAME_HI,
    1,
    px(cx - 3),
    py(flameBaseY - 2),
    px(cx + 3),
    py(flameBaseY - 2),
    px(flameX),
    py(flameTopY + 6)
  );
  fillTriangle(
    ctx,
    FLAME_TIP,
    1,
    px(flameX - 1.4),
    py(flameTopY + 8),
    px(flameX + 1.4),
    py(flameTopY + 8),
    px(flameX),
    py(flameTopY + 4)
  );

  // Side licks.
  fillTriangle(
    ctx,
    FLAME_MID,
    1,
    px(cx - 12),
    py(flameBaseY),
    px(cx - 7),
    py(flameBaseY),
    px(cx - 10),
    py(flameBaseY - 6 + frame.leftLickY)
  );
  fillTriangle(
    ctx,
    FLAME_MID,
    1,
    px(cx + 7),
    py(flameBaseY),
    px(cx + 12),
    py(flameBaseY),
    px(cx + 10),
    py(flameBaseY - 6 + frame.rightLickY)
  );
  fillTriangle(
    ctx,
    FLAME_HI,
    1,
    px(cx - 11),
    py(flameBaseY - 1),
    px(cx - 8),
    py(flameBaseY - 1),
    px(cx - 10),
    py(flameBaseY - 4 + frame.leftLickY)
  );
  fillTriangle(
    ctx,
    FLAME_HI,
    1,
    px(cx + 8),
    py(flameBaseY - 1),
    px(cx + 11),
    py(flameBaseY - 1),
    px(cx + 10),
    py(flameBaseY - 4 + frame.rightLickY)
  );

  // ── Embers at log line ──
  fillCircle(ctx, EMBER_CORE, frame.emberGlow, px(cx - 6), py(flameBaseY + 1), sc(1));
  fillCircle(ctx, EMBER_CORE, frame.emberGlow, px(cx + 5), py(flameBaseY + 2), sc(1.1));
  fillCircle(ctx, EMBER_CORE, frame.emberGlow, px(cx - 1), py(flameBaseY + 3), sc(0.9));
  fillCircle(ctx, EMBER_BRIGHT, frame.emberGlow, px(cx - 6), py(flameBaseY + 1), sc(0.4));
  fillCircle(ctx, EMBER_BRIGHT, frame.emberGlow, px(cx + 5), py(flameBaseY + 2), sc(0.5));

  // Spark above flame tip (only bright frames).
  if (frame.emberGlow > 0.9) {
    fillRectS(ctx, EMBER_BRIGHT, 0.85, px(flameX - 0.5 + 3), py(flameTopY - 3), sc(0.6), sc(0.6));
    fillRectS(ctx, EMBER_BRIGHT, 0.85, px(flameX - 0.5 - 4), py(flameTopY - 1), sc(0.5), sc(0.5));
  }

  // ── Hearthstone slab at base ──
  fillRectS(ctx, STONE_OUTLINE, 1, px(2), py(s - 8), sc(s - 4), sc(6));
  fillRectS(ctx, STONE_DARK, 1, px(3), py(s - 7), sc(s - 6), sc(4));
  fillRectS(ctx, STONE_HI, 0.6, px(3), py(s - 7), sc(s - 6), sc(1));

  // ── Kettle on right hob — canonical "kettle's on" ──
  drawKettleOnHob(ctx, px, py, sc, mouthX + mouthW + 4, s - 9, frame.emberGlow);
}

function drawKettleOnHob(
  ctx: WhsHearthContext,
  px: (x: number) => number,
  py: (y: number) => number,
  sc: (v: number) => number,
  kx: number,
  ky: number,
  emberGlow: number
): void {
  const bw = 11;
  const bh = 8;
  fillRoundedRect(ctx, KETTLE_OUTLINE, 1, px(kx), py(ky - bh), sc(bw), sc(bh), sc(2));
  fillRoundedRect(
    ctx,
    KETTLE_BODY,
    1,
    px(kx + 0.6),
    py(ky - bh + 0.6),
    sc(bw - 1.2),
    sc(bh - 1.2),
    sc(1.5)
  );
  fillEllipse(ctx, KETTLE_HI, 0.85, px(kx + 3.4), py(ky - bh + 2.4), sc(4), sc(1.3));
  fillRectS(
    ctx,
    KETTLE_RIM_GLOW,
    Math.max(0.35, emberGlow * 0.85),
    px(kx + 1),
    py(ky - bh + 0.4),
    sc(bw - 2),
    sc(0.7)
  );

  const lidX = kx + 2;
  const lidY = ky - bh - 1.4;
  fillRectS(ctx, KETTLE_OUTLINE, 1, px(lidX), py(lidY), sc(bw - 4), sc(1.6));
  fillRectS(ctx, KETTLE_BODY, 1, px(lidX + 0.4), py(lidY + 0.4), sc(bw - 4.8), sc(0.9));
  fillRectS(
    ctx,
    KETTLE_OUTLINE,
    1,
    px(lidX + (bw - 4) / 2 - 0.8),
    py(lidY - 1.4),
    sc(1.8),
    sc(1.6)
  );
  fillRectS(ctx, KETTLE_HI, 0.7, px(lidX + (bw - 4) / 2 - 0.4), py(lidY - 1.2), sc(0.6), sc(0.6));

  // Spout
  fillTriangle(
    ctx,
    KETTLE_OUTLINE,
    1,
    px(kx - 2),
    py(ky - bh + 2),
    px(kx + 1),
    py(ky - bh + 1),
    px(kx + 1),
    py(ky - bh + 4)
  );
  fillTriangle(
    ctx,
    KETTLE_BODY,
    1,
    px(kx - 1.4),
    py(ky - bh + 2.4),
    px(kx + 0.8),
    py(ky - bh + 1.8),
    px(kx + 0.8),
    py(ky - bh + 3.4)
  );

  // Handle arch
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = KETTLE_OUTLINE;
  ctx.lineWidth = Math.max(1, sc(1));
  ctx.beginPath();
  ctx.arc(px(kx + bw / 2), py(ky - bh - 0.4), sc(4), Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.restore();

  // Steam wisps — timed with brighter frames.
  if (emberGlow > 0.85) {
    fillEllipse(ctx, STEAM, 0.75, px(kx - 1.6), py(ky - bh - 3), sc(2.6), sc(1.4));
    fillEllipse(ctx, STEAM, 0.55, px(kx - 3.0), py(ky - bh - 5), sc(2.2), sc(1.2));
    fillEllipse(ctx, STEAM, 0.35, px(kx - 1.8), py(ky - bh - 7), sc(1.6), sc(1));
  } else if (emberGlow > 0.7) {
    fillEllipse(ctx, STEAM, 0.4, px(kx - 1.6), py(ky - bh - 3), sc(2), sc(1.2));
  }
}

// ── Canvas2D primitive helpers ──

function fillRectS(
  ctx: WhsHearthContext,
  color: string,
  alpha: number,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function fillCircle(
  ctx: WhsHearthContext,
  color: string,
  alpha: number,
  x: number,
  y: number,
  r: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fillEllipse(
  ctx: WhsHearthContext,
  color: string,
  alpha: number,
  cx: number,
  cy: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fillTriangle(
  ctx: WhsHearthContext,
  color: string,
  alpha: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.fill();
  ctx.restore();
}

// Rounded-rect path helper. Canvas2D's native roundRect isn't in all
// envs (jsdom test); reimplemented via arcs.
function fillRoundedRect(
  ctx: WhsHearthContext,
  color: string,
  alpha: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arc(x + w - rr, y + rr, rr, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2);
  ctx.lineTo(x + rr, y + h);
  ctx.arc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + rr);
  ctx.arc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5);
  ctx.fill();
  ctx.restore();
}
