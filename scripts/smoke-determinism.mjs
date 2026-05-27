// Determinism smoke: load the hub twice with the same fixed seed,
// apply the same scripted input sequence, assert the final state
// hashes match byte-for-byte. Validates the core promise that the
// hub-core sim is fully deterministic — a release-gate-grade claim.
//
// Uses the `?seed=N` URL param + `window.__stateHash()` dev hook
// added 2026-05-23.

import { chromium } from 'playwright';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const SEED = 0xfeedf00dcafebeefn; // fixed test seed; any value works
const URL = `${URL_BASE}?seed=${SEED}`;

async function captureFinalHash(browser) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Confirm the URL seed took effect.
  const seedSeen = await page.evaluate(() => String(window.__seed));
  if (seedSeen !== String(SEED)) {
    throw new Error(`seed mismatch: page=${seedSeen} expected=${SEED}`);
  }

  // Scripted input: walk right ~500ms, down ~300ms, release. Same
  // sequence both runs.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowDown');
  await page.waitForTimeout(300);

  const hash = await page.evaluate(() => String(window.__stateHash()));
  await ctx.close();
  if (errors.length > 0) throw new Error(errors.join('\n'));
  return hash;
}

const browser = await chromium.launch();
try {
  const hashA = await captureFinalHash(browser);
  const hashB = await captureFinalHash(browser);
  console.log(`run A state-hash: ${hashA}`);
  console.log(`run B state-hash: ${hashB}`);
  if (hashA !== hashB) {
    console.error(
      `FAIL: same seed + same input produced different state — sim is NON-deterministic`
    );
    process.exitCode = 1;
  } else {
    console.log(`smoke OK — determinism holds (seed=${SEED}, both runs hash=${hashA})`);
  }
} finally {
  await browser.close();
}
