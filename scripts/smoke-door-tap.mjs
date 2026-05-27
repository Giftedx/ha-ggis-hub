// Mobile/touch smoke: load the hub, tap directly on the launchable
// WHS door (no haggis-walking, no Enter), verify navigation fires.

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';

const browser = await launchBrowser();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  const navigations = [];
  await page.route('**/*', (route) => {
    const reqUrl = route.request().url();
    if (reqUrl.startsWith('https://wild-haggis-survivors.pages.dev/')) {
      navigations.push(reqUrl);
      route.abort();
    } else {
      route.continue();
    }
  });

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // WHS door world bounds: x∈[820,940], y∈[420,580]. World is roughly
  // 1000×1000 mapped to 540×360 canvas. Tap world (880, 500) → canvas
  // (~475, ~180). Canvas is centered + object-fit:contain at 960×540
  // viewport (3:2 aspect, no letterboxing). Use the canvas bounding
  // rect to compute the tap point exactly.
  const tap = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.scene-canvas');
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const worldToCanvasX = 880 / 1000;
    const worldToCanvasY = 500 / 1000;
    return {
      x: r.left + r.width * worldToCanvasX,
      y: r.top + r.height * worldToCanvasY,
    };
  });
  if (!tap) throw new Error('canvas not found');

  await page.mouse.click(tap.x, tap.y);
  await page.waitForTimeout(400);

  console.log('tap at', tap, '→ navigations:', navigations, 'errors:', errors);
  if (errors.length > 0) {
    process.exitCode = 1;
  } else if (navigations.length === 0) {
    process.exitCode = 1;
    console.error('tap-launch did NOT fire');
  } else {
    console.log('smoke OK — tap-launch fired');
  }
} finally {
  await browser.close();
}
