// Browser smoke for the chap-sound toggle. Chap sounds default ON (they
// only play inside the visitor's own chap gesture), so the pill must render
// "sounds on" at rest, flip to "sounds aff" on click, persist the opt-out
// into the versioned ggis_hub_settings record, and still be "aff" after a
// reload — the schema-2 envelope round-tripping in a real browser.

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/';

const browser = await launchBrowser();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => ({
    buttonText: document.querySelector('.scene-sfx')?.textContent?.trim() ?? null,
    buttonLabel: document.querySelector('.scene-sfx')?.getAttribute('aria-label') ?? null,
  }));
  if (before.buttonText !== 'sounds on') {
    throw new Error(
      `expected initial sfx button text "sounds on", got ${JSON.stringify(before.buttonText)}`
    );
  }
  if (before.buttonLabel !== 'Chap sounds on — press to turn them off') {
    throw new Error(
      `expected opt-out aria-label on the default-on toggle, got ${JSON.stringify(before.buttonLabel)}`
    );
  }

  await page.click('.scene-sfx');
  await page.waitForFunction(
    () => {
      const button = document.querySelector('.scene-sfx');
      return (
        button?.textContent?.trim() === 'sounds aff' &&
        button.getAttribute('aria-label') === 'Chap sounds aff — press to turn them on'
      );
    },
    null,
    { timeout: 4_000 }
  );

  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem('ggis_hub_settings');
    return raw === null ? null : JSON.parse(raw);
  });
  if (stored === null || stored.schema !== 2 || stored.sfx?.enabled !== false) {
    throw new Error(
      `expected persisted schema-2 sfx opt-out in ggis_hub_settings, got ${JSON.stringify(stored)}`
    );
  }
  if (typeof stored.digest !== 'string' || !/^[a-f0-9]{16}$/.test(stored.digest)) {
    throw new Error(`expected an fnv1a64 digest on the settings record, got ${stored.digest}`);
  }

  // The opt-out must survive a reload — the round trip through the
  // versioned envelope (digest verify + normalize) in a real browser.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.querySelector('.scene-sfx')?.textContent?.trim() === 'sounds aff',
    null,
    { timeout: 4_000 }
  );

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  console.log('smoke OK — chap-sound opt-out persists through the schema-2 settings envelope');
} finally {
  await browser.close();
}
