// WHS haggis drawer — direct Canvas2D port of Wild Haggis Survivors'
// `drawHaggisBody()` (classic variant, accent='none'). Source:
//   ../../../wild-haggis-survivors/src/animation/frameDrawers/haggisBodyDraw.ts
//
// Why a port and not a sprite: WHS's haggis is NOT pixel art. It's a
// 56×56 procedural Graphics texture built from ellipse/circle/triangle
// primitives. Repeated pixel-art reauthoring (v1-v11) failed to reach
// the same charm. The portable thing is the SHAPE LOGIC — port that.
//
// Phaser → Canvas2D mapping:
//   g.fillStyle(hex, alpha)        → ctx.fillStyle = '#hex'; ctx.globalAlpha = alpha
//   g.fillCircle(x, y, r)          → ctx.beginPath(); ctx.arc(x,y,r,0,2π); ctx.fill()
//   g.fillEllipse(cx, cy, w, h)    → ctx.beginPath(); ctx.ellipse(cx,cy,w/2,h/2,0,0,2π); ctx.fill()
//   g.fillRect(x, y, w, h)         → ctx.fillRect(x, y, w, h)  (same)
//   g.lineStyle(t, hex, a)         → ctx.lineWidth = t; ctx.strokeStyle = '#hex'; α
//   g.strokeCircle(x, y, r)        → arc + ctx.stroke()
//
// All draws happen relative to a body-anchor (cx, cy) which maps to the
// haggis's body-center. Scale param multiplies all coords; pass scale=2
// for a 112×112-ish footprint on the hub canvas.

// Minimal Canvas2D-like interface we depend on. Matches the subset
// exposed by hub's CanvasRoomContext so this module stays decoupled.
export interface WhsHaggisContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  ellipse(
    cx: number, cy: number, rx: number, ry: number,
    rotation: number, a0: number, a1: number
  ): void;
  fill(): void;
  stroke(): void;
  save(): void;
  restore(): void;
}

export interface WhsHaggisPalette {
  outline: string;
  bodyDark: string;
  bodyLight: string;
  fur: string;
  snout: string;
}

// WHS variant 'haggis_classic' palette (hex from variants.ts).
export const WHS_CLASSIC_PALETTE: WhsHaggisPalette = {
  outline: '#3a2808',
  bodyDark: '#6b4e0a',
  bodyLight: '#8b6914',
  fur: '#a07818',
  snout: '#d4956b'
};

export interface WhsHaggisFrame {
  breathY?: number;
  leftLegY?: number;
  rightLegY?: number;
  bodyX?: number;
  tailX?: number;
  tailY?: number;
}

// Draw the haggis. `cx`/`cy` is the body center in canvas pixels.
// `scale` multiplies all internal coordinates (1 = native 56×56, 2 = 112×112).
export function drawWhsHaggis(
  ctx: WhsHaggisContext,
  cx: number,
  cy: number,
  scale: number,
  frame: WhsHaggisFrame = {},
  palette: WhsHaggisPalette = WHS_CLASSIC_PALETTE
): void {
  const s = scale;
  const breathY = (frame.breathY ?? 0) * s;
  const leftLegExtra = (frame.leftLegY ?? 0) * s;
  const rightLegExtra = (frame.rightLegY ?? 0) * s;

  // Classic variant uses accent='none' → tiltY=6, bodyW=44, bodyH=34.
  const tiltY = 6 * s;
  const bodyW = 44 * s;
  const bodyH = 34 * s;

  const bx = cx + (frame.bodyX ?? 0) * s;
  const by = cy + breathY;
  const leftDy = -Math.floor(tiltY / 2);
  const rightDy = Math.ceil(tiltY / 2);

  // ── Tail nub ──
  const tailDx = (frame.tailX ?? 0) * s;
  const tailDy = (frame.tailY ?? 0) * s;
  fillCircle(ctx, palette.bodyDark, 1, bx - 20 * s + tailDx, by + 4 * s + leftDy + tailDy, 4 * s);
  fillCircle(ctx, palette.fur, 0.7, bx - 20 * s + tailDx, by + 3 * s + leftDy + tailDy, 2.5 * s);

  // ── Dark outline body silhouette ──
  fillEllipse(ctx, palette.outline, 1, bx, by + 2 * s, bodyW, bodyH);

  // ── Furry body — layered ellipses for depth ──
  fillEllipse(ctx, palette.bodyDark, 1, bx, by + 2 * s, bodyW - 4 * s, bodyH - 4 * s);
  fillEllipse(ctx, palette.bodyLight, 1, bx, by, bodyW - 10 * s, bodyH - 8 * s);

  // ── Fur tufts ──
  fillEllipse(ctx, palette.fur, 1, bx - 5 * s, by - 4 * s, 16 * s, 11 * s);
  fillEllipse(ctx, palette.fur, 1, bx + 6 * s, by - 2 * s, 10 * s, 7 * s);
  fillCircle(ctx, palette.fur, 0.7, bx - 12 * s, by + 2 * s, 3 * s);
  fillCircle(ctx, palette.fur, 0.7, bx + 12 * s, by + 1 * s, 3 * s);
  fillCircle(ctx, palette.fur, 0.7, bx - 8 * s, by + 6 * s, 2.5 * s);
  fillCircle(ctx, palette.fur, 0.7, bx + 8 * s, by + 5 * s, 2.5 * s);
  // Darker belly shadow
  fillEllipse(ctx, palette.bodyDark, 0.4, bx, by + 8 * s, bodyW - 16 * s, 8 * s);

  // ── Legs — LEFT shorter than RIGHT (the famous drift) ──
  const legBase = by + 11 * s;
  fillRect(ctx, palette.outline, 1, bx - 13 * s, legBase + leftDy + leftLegExtra, 5 * s, 9 * s);
  fillRect(ctx, palette.outline, 1, bx - 5 * s, legBase + leftDy + leftLegExtra, 5 * s, 9 * s);
  fillRect(ctx, palette.outline, 1, bx + 4 * s, legBase + rightDy + rightLegExtra, 5 * s, 13 * s);
  fillRect(ctx, palette.outline, 1, bx + 12 * s, legBase + rightDy + rightLegExtra, 5 * s, 13 * s);
  // Furry leg tops
  fillCircle(ctx, palette.bodyDark, 0.6, bx - 11 * s, legBase + 1 * s + leftDy + leftLegExtra, 3 * s);
  fillCircle(ctx, palette.bodyDark, 0.6, bx - 3 * s, legBase + 1 * s + leftDy + leftLegExtra, 3 * s);
  fillCircle(ctx, palette.bodyDark, 0.6, bx + 6 * s, legBase + 1 * s + rightDy + rightLegExtra, 3 * s);
  fillCircle(ctx, palette.bodyDark, 0.6, bx + 14 * s, legBase + 1 * s + rightDy + rightLegExtra, 3 * s);
  // Hooves
  fillRect(ctx, '#1a1008', 1, bx - 14 * s, legBase + 8 * s + leftDy + leftLegExtra, 6 * s, 2 * s);
  fillRect(ctx, '#1a1008', 1, bx - 6 * s, legBase + 8 * s + leftDy + leftLegExtra, 6 * s, 2 * s);
  fillRect(ctx, '#1a1008', 1, bx + 3 * s, legBase + 12 * s + rightDy + rightLegExtra, 6 * s, 2 * s);
  fillRect(ctx, '#1a1008', 1, bx + 11 * s, legBase + 12 * s + rightDy + rightLegExtra, 6 * s, 2 * s);
  // Hoof split detail
  fillRect(ctx, palette.outline, 0.5, bx - 11 * s, legBase + 8 * s + leftDy + leftLegExtra, 1 * s, 2 * s);
  fillRect(ctx, palette.outline, 0.5, bx - 3 * s, legBase + 8 * s + leftDy + leftLegExtra, 1 * s, 2 * s);
  fillRect(ctx, palette.outline, 0.5, bx + 6 * s, legBase + 12 * s + rightDy + rightLegExtra, 1 * s, 2 * s);
  fillRect(ctx, palette.outline, 0.5, bx + 14 * s, legBase + 12 * s + rightDy + rightLegExtra, 1 * s, 2 * s);

  // ── Eye whites ──
  fillCircle(ctx, '#ffffff', 1, bx - 8 * s, by - 4 * s, 6 * s);
  fillCircle(ctx, '#ffffff', 1, bx + 8 * s, by - 4 * s, 6 * s);
  strokeCircle(ctx, palette.outline, 0.5, 0.8 * s, bx - 8 * s, by - 4 * s, 6 * s);
  strokeCircle(ctx, palette.outline, 0.5, 0.8 * s, bx + 8 * s, by - 4 * s, 6 * s);
  // Pupils — layered for depth
  fillCircle(ctx, '#111111', 1, bx - 6 * s, by - 3 * s, 3 * s);
  fillCircle(ctx, '#111111', 1, bx + 10 * s, by - 3 * s, 3 * s);
  fillCircle(ctx, '#332211', 1, bx - 6 * s, by - 3 * s, 2 * s);
  fillCircle(ctx, '#332211', 1, bx + 10 * s, by - 3 * s, 2 * s);
  fillCircle(ctx, '#000000', 1, bx - 6 * s, by - 3 * s, 1.2 * s);
  fillCircle(ctx, '#000000', 1, bx + 10 * s, by - 3 * s, 1.2 * s);
  // Eye glints — primary catchlight + soft secondary
  fillCircle(ctx, '#ffffff', 1, bx - 7 * s, by - 5 * s, 1.5 * s);
  fillCircle(ctx, '#ffffff', 1, bx + 9 * s, by - 5 * s, 1.5 * s);
  fillCircle(ctx, '#ffffff', 0.6, bx - 5 * s, by - 2 * s, 0.7 * s);
  fillCircle(ctx, '#ffffff', 0.6, bx + 11 * s, by - 2 * s, 0.7 * s);

  // ── Brow tufts ──
  fillEllipse(ctx, palette.fur, 0.9, bx - 8 * s, by - 10 * s, 8 * s, 3 * s);
  fillEllipse(ctx, palette.fur, 0.9, bx + 8 * s, by - 10 * s, 8 * s, 3 * s);

  // ── Snout ──
  fillCircle(ctx, palette.snout, 1, bx + 1 * s, by + 4 * s, 4.5 * s);
  fillCircle(ctx, palette.snout, 0.7, bx, by + 3 * s, 3 * s);
  fillCircle(ctx, palette.outline, 1, bx + 2 * s, by + 3 * s, 2 * s);
  fillCircle(ctx, '#0a0a0a', 1, bx + 2 * s, by + 3 * s, 1.2 * s);
  fillCircle(ctx, '#ffffff', 0.3, bx + 1.5 * s, by + 2.5 * s, 0.6 * s);
  fillCircle(ctx, palette.outline, 0.8, bx + 1 * s, by + 3.5 * s, 0.5 * s);
  fillCircle(ctx, palette.outline, 0.8, bx + 3 * s, by + 3.5 * s, 0.5 * s);

  // ── Tiny content smile ──
  fillRect(ctx, palette.outline, 0.5, bx - 1 * s, by + 7 * s, 4 * s, 1 * s);
}

// ── Canvas2D helpers — wrap save/restore + alpha so each op is atomic ──

function fillCircle(
  ctx: WhsHaggisContext, color: string, alpha: number,
  x: number, y: number, r: number
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
  ctx: WhsHaggisContext, color: string, alpha: number,
  cx: number, cy: number, w: number, h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fillRect(
  ctx: WhsHaggisContext, color: string, alpha: number,
  x: number, y: number, w: number, h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function strokeCircle(
  ctx: WhsHaggisContext, color: string, alpha: number, lineW: number,
  x: number, y: number, r: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
