// Load the hub and tap the selected launchable door.
// Verify that the door opens its mounted route.
// Pass the door id as the first argument. The default door is Wild Haggis Survivors.

import { launchBrowser } from './browser-factory.mjs';
import { GAME_MOUNTS } from './game-mounts.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const DOOR_ID = process.argv[2] ?? 'wild-haggis-survivors';
const mount = GAME_MOUNTS.find(({ id }) => id === DOOR_ID);
if (mount === undefined) {
  throw new Error(`No mounted route is configured for door "${DOOR_ID}".`);
}
const EXPECTED_ROUTE = mount.route;

function matchesExpectedRoute(url) {
  try {
    return new URL(url).pathname === EXPECTED_ROUTE;
  } catch {
    return false;
  }
}

const browser = await launchBrowser();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  // Record and fulfill the route because the hub-only preview has no mounted game builds.
  const navigations = [];
  await page.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    if (matchesExpectedRoute(requestUrl)) {
      navigations.push(requestUrl);
      await route.fulfill({ status: 204, body: '' });
    } else {
      await route.continue();
    }
  });

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.waitForFunction(() => typeof window.__launchableDoorVisualBounds === 'function', {
    timeout: 5_000,
  });

  // Use the renderer bounds that pointer hit detection uses.
  const tap = await page.evaluate((doorId) => {
    const canvas = document.querySelector('canvas.scene-canvas');
    const door = window
      .__launchableDoorVisualBounds?.()
      ?.find((candidate) => candidate.id === doorId);
    if (!canvas || !door) return null;
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.round(window.devicePixelRatio || 1);
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;
    return {
      x: bounds.left + ((door.x + door.width / 2) / logicalWidth) * bounds.width,
      y: bounds.top + ((door.y + door.height / 2) / logicalHeight) * bounds.height,
      door,
    };
  }, DOOR_ID);
  if (!tap) {
    throw new Error(`Door "${DOOR_ID}" has no launchable visual bounds.`);
  }

  await page.mouse.click(tap.x, tap.y);
  await page.waitForTimeout(400);

  console.log(`The tap result for door "${DOOR_ID}" is:`, tap, navigations, errors);
  const expectedNavigations = navigations.filter(matchesExpectedRoute);
  if (errors.length > 0) {
    process.exitCode = 1;
    console.error(`The page reported errors during tap launch for door "${DOOR_ID}".`);
  } else if (expectedNavigations.length === 0) {
    process.exitCode = 1;
    console.error(`Tap launch for door "${DOOR_ID}" did not navigate to ${EXPECTED_ROUTE}.`);
  } else {
    console.log(`Tap launch passed for door "${DOOR_ID}" at ${EXPECTED_ROUTE}.`);
  }
} finally {
  await browser.close();
}
