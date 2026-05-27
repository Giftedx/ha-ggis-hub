// Take many detail crops for brutally thorough inspection.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const url = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const viewport = { width: 1920, height: 1080 };

await mkdir('.tmp', { recursive: true });

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const fullPath = '.tmp/inspect-full.png';
  await page.screenshot({ path: fullPath });

  // Many small crops for close inspection (16 regions)
  const regions = [
    { name: '01-top-wall-left', left: 0, top: 0, width: 640, height: 100 },
    { name: '02-top-wall-mid', left: 640, top: 0, width: 640, height: 100 },
    { name: '03-top-wall-right', left: 1280, top: 0, width: 640, height: 100 },
    { name: '04-left-wall', left: 0, top: 100, width: 200, height: 800 },
    { name: '05-right-wall', left: 1720, top: 100, width: 200, height: 800 },
    { name: '06-bottom-wall', left: 0, top: 980, width: 1920, height: 100 },
    { name: '07-floor-empty-tl', left: 250, top: 150, width: 400, height: 350 },
    { name: '08-floor-empty-tr', left: 1270, top: 150, width: 400, height: 350 },
    { name: '09-floor-empty-bl', left: 250, top: 700, width: 400, height: 280 },
    { name: '10-floor-empty-br', left: 1270, top: 700, width: 400, height: 280 },
    { name: '11-haggis-area', left: 760, top: 380, width: 400, height: 360 },
    { name: '12-hearth-area', left: 800, top: 660, width: 320, height: 280 },
    { name: '13-whs-door-detail', left: 1500, top: 200, width: 420, height: 480 },
    { name: '14-locked-door-detail', left: 0, top: 280, width: 440, height: 420 },
    { name: '15-window-detail', left: 800, top: 0, width: 320, height: 110 },
    { name: '16-corner-tl-decor', left: 0, top: 0, width: 320, height: 200 },
  ];
  for (const r of regions) {
    const out = `.tmp/inspect-${r.name}.png`;
    await sharp(fullPath)
      .extract({ left: r.left, top: r.top, width: r.width, height: r.height })
      .toFile(out);
  }

  // Also: zoomed-out 480x270 thumbnail of full so I can see composition cleanly
  await sharp(fullPath).resize(480, 270, { fit: 'fill' }).toFile('.tmp/inspect-thumb.png');

  console.log('full + 16 crops + thumbnail saved');
} finally {
  await browser.close();
}
