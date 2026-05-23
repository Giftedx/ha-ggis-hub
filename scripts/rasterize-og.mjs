// Rasterize public/og.svg → public/og.png at 1200×630. Twitter does
// not render SVG og:image; the PNG covers that path. Other social
// platforms render the SVG directly.
//
// Single source of truth: og.svg. The PNG is generated. Re-run this
// script whenever og.svg is updated.
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
const PNG_PATH = resolve(REPO_ROOT, 'public', 'og.png');

function log(...args) {
  console.log('[rasterize-og]', ...args);
}

const svgBuffer = await readFile(SVG_PATH);

const pngBuffer = await sharp(svgBuffer, { density: 144 })
  .resize(1200, 630, { fit: 'fill' })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer();

await writeFile(PNG_PATH, pngBuffer);
log(`wrote ${PNG_PATH} (${pngBuffer.length} bytes)`);
