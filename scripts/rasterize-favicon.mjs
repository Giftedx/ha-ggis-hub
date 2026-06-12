// Build favicon assets from the painted Wee Chieftain sprite.
// External PNG hrefs inside favicon.svg are not loaded by most browsers,
// so this script writes a self-contained SVG (base64-embedded raster) plus
// a PNG fallback for tab icons and the web manifest.
//
// Usage:
//   node scripts/rasterize-favicon.mjs
//   pnpm rasterize:favicon

import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SPRITE_PATH = resolve(REPO_ROOT, 'public', 'art', 'wee-chieftain-idle.png');
const FAVICON_PNG_PATH = resolve(REPO_ROOT, 'public', 'favicon.png');
const FAVICON_SVG_PATH = resolve(REPO_ROOT, 'public', 'favicon.svg');
const FAVICON_192_PATH = resolve(REPO_ROOT, 'public', 'favicon-192.png');

const TAB_BG = '#24170f';

function log(...args) {
  console.log('[rasterize-favicon]', ...args);
}

async function buildIcon(size, contentW, contentH) {
  const sprite = await sharp(SPRITE_PATH)
    .resize(contentW, contentH, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer();

  const left = Math.round((size - contentW) / 2);
  const top = Math.round((size - contentH) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: TAB_BG,
    },
  })
    .composite([{ input: sprite, left, top }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

const tabIcon = await buildIcon(32, 30, 24);
await writeFile(FAVICON_PNG_PATH, tabIcon);
log(`wrote ${FAVICON_PNG_PATH} (${tabIcon.length} bytes)`);

const manifestIcon = await buildIcon(192, 168, 134);
await writeFile(FAVICON_192_PATH, manifestIcon);
log(`wrote ${FAVICON_192_PATH} (${manifestIcon.length} bytes)`);

const svgRaster = await buildIcon(64, 60, 48);
const dataUri = `data:image/png;base64,${svgRaster.toString('base64')}`;

const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="ha.ggis — The Wee Chieftain haggis icon">
  <!--
    ha.ggis favicon — close-cropped Wee Chieftain mark from
    public/art/wee-chieftain-idle.png (low-poly crowned haggis).
    Raster is embedded so tab icons work without external PNG fetches.
    Regenerate via pnpm rasterize:favicon when the painted sprite changes.
  -->
  <rect width="32" height="32" fill="${TAB_BG}"/>
  <image href="${dataUri}" x="1" y="3" width="30" height="24" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;

await writeFile(FAVICON_SVG_PATH, faviconSvg);
log(`wrote ${FAVICON_SVG_PATH} (${faviconSvg.length} bytes)`);
