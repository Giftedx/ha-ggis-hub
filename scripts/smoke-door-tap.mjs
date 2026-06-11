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
    // WHS launches on-origin to /wild/ since v0.2.1 (ADR-0003 Option B). Record
    // + abort that navigation (the WHS build is absent from the hub-only
    // preview). The legacy pages.dev guard stays so a stray external launch is
    // still caught.
    if (
      reqUrl.includes('/wild/') ||
      reqUrl.startsWith('https://wild-haggis-survivors.pages.dev/')
    ) {
      navigations.push(reqUrl);
      route.abort();
    } else {
      route.continue();
    }
  });

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.waitForFunction(() => typeof window.__launchableDoorVisualBounds === 'function', {
    timeout: 5_000,
  });

  // The app exposes this read-only smoke/debug hook from the same
  // visualDoorBounds array used by pointer tap hit-detection. The bounds are
  // logical canvas pixels after renderer snapping, so this tap follows visual
  // door drift instead of duplicating sim/world door coordinates here.
  const tap = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.scene-canvas');
    const door = window
      .__launchableDoorVisualBounds?.()
      ?.find((candidate) => candidate.id === 'wild-haggis-survivors');
    if (!canvas || !door) return null;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.round(window.devicePixelRatio || 1);
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;
    return {
      x: r.left + ((door.x + door.width / 2) / logicalWidth) * r.width,
      y: r.top + ((door.y + door.height / 2) / logicalHeight) * r.height,
      door,
    };
  });
  if (!tap) throw new Error('launchable WHS door visual bounds hook/canvas not found');

  await page.mouse.click(tap.x, tap.y);
  await page.waitForTimeout(400);

  console.log('tap at', tap, '→ navigations:', navigations, 'errors:', errors);
  const wildNavigations = navigations.filter((url) => url.includes('/wild/'));
  if (errors.length > 0) {
    process.exitCode = 1;
  } else if (wildNavigations.length === 0) {
    process.exitCode = 1;
    console.error('tap-launch did NOT navigate to /wild/');
  } else {
    console.log('smoke OK — tap-launch fired /wild/ navigation');
  }
} finally {
  await browser.close();
}
