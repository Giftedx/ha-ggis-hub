// Smoke test: locked-door interaction. Walks the haggis to the left-wall
// future-bothy door (world x: 80–200, y: 420–580), asserts the status
// region shows the locked-door copy ("Comin' Wi' The Next Moon door —
// comin' soon."), then presses Enter and asserts no navigation fires.
//
// Unique surface: the InteractionKind.Locked → door-status-announcer →
// .scene-status text path, and that locked doors do not launch on interact.
// Walk/launch coverage is delegated to smoke-door-launch.mjs.

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/';
const EXPECTED_STATUS = "Comin' Wi' The Next Moon door — comin' soon.";

const browser = await launchBrowser();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  const navigations = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      const u = frame.url();
      if (u !== URL_BASE && !u.startsWith(URL_BASE)) navigations.push(u);
    }
  });
  // Block any accidental external navigation so the process doesn't hang.
  await page.route('**/*', (route) => {
    const reqUrl = route.request().url();
    if (!reqUrl.startsWith(URL_BASE) && !reqUrl.includes('localhost')) {
      navigations.push(reqUrl);
      route.abort();
    } else {
      route.continue();
    }
  });

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  // Let WASM boot and the haggis spawn at world (340, 540).
  await page.waitForTimeout(800);

  // Walk LEFT. The locked future-bothy door is at world x: 80–200.
  // One tick of left movement (100 units) from spawn (340) reaches 240,
  // which is within the door's interaction box — 500 ms is ample.
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(200);

  const statusText = await page.evaluate(
    () => document.querySelector('.scene-status')?.textContent?.trim() ?? null
  );

  if (statusText !== EXPECTED_STATUS) {
    throw new Error(
      `expected locked-door status "${EXPECTED_STATUS}", got ${JSON.stringify(statusText)}`
    );
  }

  // Press Enter — a locked door must not launch.
  await page.keyboard.down('Enter');
  await page.waitForTimeout(300);
  await page.keyboard.up('Enter');
  await page.waitForTimeout(200);

  if (navigations.length > 0) {
    throw new Error(`locked door triggered navigation: ${navigations.join(', ')}`);
  }
  if (errors.length > 0) {
    throw new Error(`page errors during smoke:\n${errors.join('\n')}`);
  }

  console.log('smoke OK — locked door status:', statusText);
  console.log('smoke OK — Enter on locked door fired no navigation');
} finally {
  await browser.close();
}
