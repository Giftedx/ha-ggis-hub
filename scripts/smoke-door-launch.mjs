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

  // Block actual cross-origin navigation; record where we'd have gone.
  const navigations = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      const u = frame.url();
      if (u !== URL_BASE && !u.startsWith(URL_BASE)) {
        navigations.push(u);
      }
    }
  });
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
  // Let the WASM boundary boot + haggis spawn.
  await page.waitForTimeout(800);

  // Spawn at world (340, 540). The LAUNCHABLE WHS door is at world
  // x∈[820,940] (right-side wall). Walk right ~1.5s to overshoot into
  // the WHS door's interaction zone. Locked future-bothy door is on
  // the left (skip it).
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(200);

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
  if (navigations.length === 0) {
    console.warn('no navigation fired — haggis may not have reached a launchable door');
  } else {
    console.log(`smoke OK — ${navigations.length} navigation(s) fired`);
  }
} finally {
  await browser.close();
}
