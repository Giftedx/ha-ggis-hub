// Rasterize public/og.svg → public/og.png at 1200×630, then composite the
// painted Wee Chieftain sprite. Sharp/librsvg do not resolve external PNG
// hrefs inside SVG, so the mascot must be flattened in this step.
//
// Layout matches the <image> box in public/og.svg.
//
// Usage:
//   node scripts/rasterize-og.mjs
//   pnpm rasterize:og

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SVG_PATH = resolve(REPO_ROOT, 'public', 'og.svg');
const SPRITE_PATH = resolve(REPO_ROOT, 'public', 'art', 'wee-chieftain-idle.png');
const PNG_PATH = resolve(REPO_ROOT, 'public', 'og.png');

const CARD_W = 1200;
const CARD_H = 630;
const SPRITE_BOX = { x: 720, y: 190, w: 360, h: 293 };

function log(...args) {
  console.log('[rasterize-og]', ...args);
}

const svgBuffer = await readFile(SVG_PATH);

const cardBuffer = await sharp(svgBuffer, { density: 144 })
  .resize(CARD_W, CARD_H, { fit: 'fill' })
  .png()
  .toBuffer();

const spriteBuffer = await sharp(SPRITE_PATH)
  .resize(SPRITE_BOX.w, SPRITE_BOX.h, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    kernel: sharp.kernel.nearest,
  })
  .png()
  .toBuffer();

const pngBuffer = await sharp(cardBuffer)
  .composite([{ input: spriteBuffer, left: SPRITE_BOX.x, top: SPRITE_BOX.y }])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer();

await writeFile(PNG_PATH, pngBuffer);
log(`wrote ${PNG_PATH} (${pngBuffer.length} bytes)`);
