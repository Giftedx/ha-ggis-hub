// Mobile/touch pointer-drive smoke: press-and-hold on empty floor
// (NOT on a door), drag toward the WHS door, hold long enough for the
// haggis to walk. Asserts the haggis's playerX increased (it walked
// right). Validates the touch-drag-to-walk feature added 2026-05-23.

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';

const browser = await launchBrowser();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const spawnSnapshot = await page.evaluate(() => {
    const w = window;
    return w.__roomSnapshot ? w.__roomSnapshot() : null;
  });
  if (!spawnSnapshot) throw new Error('__roomSnapshot dev hook missing');
  const spawnX = spawnSnapshot.playerX;

  // Press-and-hold on empty floor area (mid-room, away from doors).
  // World (500, 500) → canvas via the visible rect. The launchable
  // door is at world x ∈ [820,940]; pressing at x=500 ensures we
  // hit floor, not door.
  const start = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.scene-canvas');
    const r = canvas.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5, r };
  });
  // Then drag the pointer to world (900, 500) — toward the WHS door —
  // so the haggis walks right.
  const drag = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.scene-canvas');
    const r = canvas.getBoundingClientRect();
    return { x: r.left + r.width * 0.9, y: r.top + r.height * 0.5 };
  });

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Drag in steps so pointermove fires.
  for (let i = 0; i < 10; i += 1) {
    const t = (i + 1) / 10;
    await page.mouse.move(start.x + (drag.x - start.x) * t, start.y + (drag.y - start.y) * t);
    await page.waitForTimeout(40);
  }
  // Hold the drag at destination for haggis to walk toward it.
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page.waitForTimeout(200);

  const finalSnapshot = await page.evaluate(() => window.__roomSnapshot());
  const finalX = finalSnapshot.playerX;
  const delta = finalX - spawnX;

  console.log(`pointer-drive: spawnX=${spawnX} finalX=${finalX} delta=${delta}`);
  console.log('errors:', errors);
  if (errors.length > 0) {
    process.exitCode = 1;
  } else if (delta <= 50) {
    process.exitCode = 1;
    console.error(`FAIL: haggis barely moved (delta=${delta}, expected > 50)`);
  } else {
    console.log(`smoke OK — pointer-drive walked the haggis right by ${delta} units`);
  }
} finally {
  await browser.close();
}
