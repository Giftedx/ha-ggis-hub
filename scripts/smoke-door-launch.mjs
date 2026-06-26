// Smoke test: load the hub, walk the haggis to a door, press Enter,
// verify navigation fires (LaunchNavigator.navigate called with the
// expected WHS URL). Uses Playwright against `pnpm dev`.
//
// Run with: pnpm dev in one terminal, then `node scripts/smoke-door-launch.mjs`
// (or via the inspect-shots playwright pattern).

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';

const browser = await launchBrowser();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const consoleLog = [];
  const errors = [];
  page.on('console', (m) => consoleLog.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  // Block actual game-route navigation; record where we'd have gone.
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
    // WHS launches on-origin to /wild/ since v0.2.1 (ADR-0003 Option B). Record
    // + fulfill it with an empty response (the WHS build is absent from the
    // hub-only preview). Aborting a document request navigates Chromium to a
    // chrome-error page, which is just output noise for this smoke.
    if (reqUrl.includes('/wild/')) {
      navigations.push(reqUrl);
      await route.fulfill({ status: 204, body: '' });
    } else {
      await route.continue();
    }
  });

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  // Let the WASM boundary boot + haggis spawn.
  await page.waitForTimeout(800);

  // Spawn at world (340, 540). The LAUNCHABLE WHS door is on the right
  // wall; the locked future-bothy door is on the left (skip it). Hold right
  // and poll the dev snapshot until the haggis is actually standing at the
  // launchable door, rather than trusting a fixed wall-clock hold: the
  // fixed-step loop advances a browser-dependent number of ticks per frame,
  // so a fixed duration under-walks on a slow/throttled engine (webkit on
  // CI), leaving the haggis short of the door and the launch un-fired.
  // Polling the arrival condition makes the smoke speed-agnostic.
  await page.keyboard.down('ArrowRight');
  try {
    await page.waitForFunction(() => window.__roomSnapshot?.()?.interactionKind === 'launchable', {
      timeout: 10_000,
    });
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await page.waitForTimeout(120);

  // Fire Enter — should launch.
  await page.keyboard.down('Enter');
  await page.waitForTimeout(120);
  await page.keyboard.up('Enter');
  await page.waitForTimeout(300);

  console.log('navigations:', navigations);
  console.log('errors:', errors);
  void consoleLog;
  if (errors.length > 0) {
    process.exitCode = 1;
    console.error('page errors during smoke');
  }
  const wildNavigations = navigations.filter((url) => url.includes('/wild/'));
  if (wildNavigations.length === 0) {
    process.exitCode = 1;
    console.error('door-launch did NOT navigate to /wild/');
  } else {
    console.log('smoke OK — door-launch fired /wild/ navigation');
  }
} finally {
  await browser.close();
}
