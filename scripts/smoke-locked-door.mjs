// Smoke test: locked-door interaction. Walks the haggis to the back-wall
// future-bothy door (world x: 410–590, y: 80–240), asserts the approach
// status shows the locked-door copy ("Comin' Wi' The Next Moon door —
// comin' soon."), then CHAPS the door (Enter) and asserts the status changes
// to a Scots chap retort (the door answers, it does not sit silent) while
// still firing no navigation.
//
// Unique surface: the InteractionKind.Locked → door-status-announcer →
// .scene-status approach copy, the chap-on-interact retort path, and that
// locked doors do not launch on interact. Walk/launch coverage is delegated
// to smoke-door-launch.mjs.

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/';
const EXPECTED_STATUS = "Comin' Wi' The Next Moon door — comin’ soon.";

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

  // Walk UP to the locked future-bothy door (back wall). Hold ArrowUp and
  // poll the dev snapshot until the haggis is standing at the locked door,
  // rather than trusting a fixed wall-clock hold: the fixed-step loop advances
  // a browser-dependent number of ticks per frame, so a fixed duration can
  // under-walk on a slow/throttled engine (the same wall-clock fragility fixed
  // in smoke-door-launch.mjs).
  await page.keyboard.down('ArrowUp');
  try {
    await page.waitForFunction(() => window.__roomSnapshot?.()?.interactionKind === 'locked', {
      timeout: 10_000,
    });
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await page.waitForTimeout(120);

  const statusText = await page.evaluate(
    () => document.querySelector('.scene-status')?.textContent?.trim() ?? null
  );

  if (statusText !== EXPECTED_STATUS) {
    throw new Error(
      `expected locked-door approach status "${EXPECTED_STATUS}", got ${JSON.stringify(statusText)}`
    );
  }

  // Chap the door — a locked door must answer (status changes to a retort)
  // but must not launch.
  await page.keyboard.down('Enter');
  await page.waitForTimeout(300);
  await page.keyboard.up('Enter');
  await page.waitForTimeout(200);

  const chapStatus = await page.evaluate(
    () => document.querySelector('.scene-status')?.textContent?.trim() ?? null
  );

  if (navigations.length > 0) {
    throw new Error(`locked door triggered navigation: ${navigations.join(', ')}`);
  }
  if (errors.length > 0) {
    throw new Error(`page errors during smoke:\n${errors.join('\n')}`);
  }
  if (chapStatus === null || chapStatus.length === 0) {
    throw new Error('chapping the locked door cleared the status instead of answering');
  }
  if (chapStatus === EXPECTED_STATUS) {
    throw new Error('chapping the locked door did not change the status — it sat silent');
  }

  console.log('smoke OK — locked door approach status:', statusText);
  console.log('smoke OK — chap retort status:', chapStatus);
  console.log('smoke OK — Enter on locked door fired no navigation');
} finally {
  await browser.close();
}
