// Smoke test: load the hub, walk the haggis to the selected door, press
// Enter, and verify the expected navigation. Uses Playwright against
// a Vite development server.
//
// Run `pnpm exec vite` in one terminal. Then run
// `node scripts/smoke-door-launch.mjs <door-id> </route/>` in another terminal.

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const [doorId, expectedRoute, ...extraArgs] = process.argv.slice(2);
if (
  doorId === undefined ||
  expectedRoute === undefined ||
  extraArgs.length > 0 ||
  !expectedRoute.startsWith('/') ||
  expectedRoute.startsWith('//')
) {
  throw new Error('Usage: node scripts/smoke-door-launch.mjs <door-id> </route/>');
}
const expectedUrl = new URL(expectedRoute, URL_BASE).href;

const browser = await launchBrowser();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const consoleLog = [];
  const errors = [];
  page.on('console', (m) => consoleLog.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  // Block the expected game-route navigation and record its URL.
  const navigations = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      const u = frame.url();
      if (u !== URL_BASE && !u.startsWith(URL_BASE)) {
        navigations.push(u);
      }
    }
  });
  await page.route('**/*', async (route) => {
    const reqUrl = route.request().url();
    // The hub-only preview does not include mounted game builds. Fulfill the
    // expected route so that Chromium does not open an error page.
    if (reqUrl === expectedUrl) {
      navigations.push(reqUrl);
      await route.fulfill({ status: 204, body: '' });
    } else {
      await route.continue();
    }
  });

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  // Let the WASM boundary boot + haggis spawn.
  await page.waitForTimeout(800);

  await page.waitForFunction(
    () =>
      typeof window.__roomSnapshot === 'function' &&
      typeof window.__setPaused === 'function' &&
      typeof window.__advance === 'function',
    { timeout: 5_000 }
  );
  await page.evaluate(() => window.__setPaused(true));

  // Select the direction from the real room snapshot. Advance one tick at a
  // time until the selected door becomes the active launchable door.
  const moveKey = await page.evaluate((selectedDoorId) => {
    const snapshot = window.__roomSnapshot();
    const door = snapshot.doors.find((candidate) => candidate.id === selectedDoorId);
    if (!door || door.status !== 'launchable') return null;
    const doorCenterX = (door.bounds.minX + door.bounds.maxX) / 2;
    return doorCenterX < snapshot.playerX ? 'ArrowLeft' : 'ArrowRight';
  }, doorId);
  if (moveKey === null) {
    throw new Error(`Launchable door not found in room snapshot: ${doorId}`);
  }

  let arrived = false;
  await page.keyboard.down(moveKey);
  try {
    for (let tick = 0; tick < 100; tick += 1) {
      const step = await page.evaluate((selectedDoorId) => {
        const packedInput = window.__advance(1);
        const snapshot = window.__roomSnapshot();
        const activeDoor = snapshot.doors[snapshot.interactionDoorIndex];
        return {
          packedInput,
          arrived: snapshot.interactionKind === 'launchable' && activeDoor?.id === selectedDoorId,
        };
      }, doorId);
      if (step.packedInput === 0) {
        throw new Error(`${moveKey} did not register for ${doorId}`);
      }
      if (step.arrived) {
        arrived = true;
        break;
      }
    }
  } finally {
    await page.keyboard.up(moveKey);
  }
  if (!arrived) {
    throw new Error(`Haggis did not reach launchable door: ${doorId}`);
  }

  // Sample the Enter edge through the same deterministic input hook.
  await page.keyboard.down('Enter');
  await page.evaluate(() => window.__advance(1));
  await page.keyboard.up('Enter');
  await page.waitForTimeout(300);

  console.log(`${doorId}: navigations:`, navigations);
  console.log('errors:', errors);
  void consoleLog;
  if (errors.length > 0) {
    process.exitCode = 1;
    console.error('page errors during smoke');
  }
  const expectedNavigations = navigations.filter((url) => url === expectedUrl);
  if (expectedNavigations.length === 0) {
    process.exitCode = 1;
    console.error(`FAIL ${doorId}: door-launch did not navigate to ${expectedRoute}`);
  } else {
    console.log(`PASS ${doorId}: door-launch fired ${expectedRoute} navigation`);
  }
} finally {
  await browser.close();
}
