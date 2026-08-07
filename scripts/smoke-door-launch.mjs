// Load the hub, walk the haggis to the selected door, and press Enter.
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
  const consoleLog = [];
  const errors = [];
  page.on('console', (m) => consoleLog.push(`[${m.type()}] ${m.text()}`));
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

  try {
    await page.waitForFunction(
      (doorId) =>
        window.__roomSnapshot?.()?.doors.some((candidate) => candidate.id === doorId) === true,
      DOOR_ID,
      { timeout: 5_000 }
    );
  } catch (error) {
    throw new Error(`Door "${DOOR_ID}" did not appear in the room snapshot.`, { cause: error });
  }

  const movementKey = await page.evaluate((doorId) => {
    const snapshot = window.__roomSnapshot?.();
    const door = snapshot?.doors.find((candidate) => candidate.id === doorId);
    if (!snapshot || !door) return null;

    const targetX = (door.bounds.minX + door.bounds.maxX) / 2;
    const targetY = (door.bounds.minY + door.bounds.maxY) / 2;
    const dx = targetX - snapshot.playerX;
    const dy = targetY - snapshot.playerY;
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'ArrowLeft' : 'ArrowRight';
    return dy < 0 ? 'ArrowUp' : 'ArrowDown';
  }, DOOR_ID);
  if (movementKey === null) {
    throw new Error(`Door "${DOOR_ID}" is absent from the room snapshot.`);
  }

  await page.keyboard.down(movementKey);
  try {
    await page.waitForFunction(
      (doorId) => {
        const snapshot = window.__roomSnapshot?.();
        if (!snapshot || snapshot.interactionKind !== 'launchable') return false;
        return snapshot.doors[snapshot.interactionDoorIndex]?.id === doorId;
      },
      DOOR_ID,
      { timeout: 10_000 }
    );
  } catch (error) {
    throw new Error(`Keyboard launch could not reach door "${DOOR_ID}".`, { cause: error });
  } finally {
    await page.keyboard.up(movementKey);
  }
  await page.waitForTimeout(120);

  await page.keyboard.down('Enter');
  await page.waitForTimeout(120);
  await page.keyboard.up('Enter');
  await page.waitForTimeout(300);

  console.log(`The recorded navigations for door "${DOOR_ID}" are:`, navigations);
  console.log('The page errors are:', errors);
  void consoleLog;
  const expectedNavigations = navigations.filter(matchesExpectedRoute);
  if (errors.length > 0) {
    process.exitCode = 1;
    console.error(`The page reported errors during keyboard launch for door "${DOOR_ID}".`);
  } else if (expectedNavigations.length === 0) {
    process.exitCode = 1;
    console.error(`Keyboard launch for door "${DOOR_ID}" did not navigate to ${EXPECTED_ROUTE}.`);
  } else {
    console.log(`Keyboard launch passed for door "${DOOR_ID}" at ${EXPECTED_ROUTE}.`);
  }
} finally {
  await browser.close();
}
