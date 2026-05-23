// Takes a full screenshot then crops detail regions out of it so the
// agent can review each element of the scene at zoom rather than
// guessing how a 1px change reads at viewport scale.
//
// Usage: node scripts/detail-shots.mjs
// Outputs to .tmp/detail-<name>.png

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const url = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const viewport = { width: 1920, height: 1080 };

await mkdir('.tmp', { recursive: true });

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const fullPath = '.tmp/full.png';
  await page.screenshot({ path: fullPath });
  console.log(`full: ${fullPath}`);

  // Detail crops at viewport pixel coords (1920x1080)
  const regions = [
    { name: 'haggis-and-fire', left: 760, top: 460, width: 400, height: 480 },
    { name: 'whs-door', left: 1480, top: 200, width: 440, height: 540 },
    { name: 'locked-door', left: 0, top: 360, width: 440, height: 420 },
    { name: 'top-wall-window', left: 720, top: 0, width: 480, height: 120 },
    { name: 'top-wall-decor', left: 320, top: 0, width: 1280, height: 120 },
    { name: 'fire-pit', left: 820, top: 660, width: 280, height: 280 },
    { name: 'haggis-only', left: 830, top: 380, width: 260, height: 360 }
  ];

  for (const r of regions) {
    const out = `.tmp/detail-${r.name}.png`;
    await sharp(fullPath)
      .extract({ left: r.left, top: r.top, width: r.width, height: r.height })
      .toFile(out);
    console.log(`crop: ${out}`);
  }
} finally {
  await browser.close();
}
