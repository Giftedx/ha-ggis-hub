// Determinism smoke: load the hub twice with the same fixed seed, apply
// the same scripted input for the same EXACT number of ticks, assert the
// final state hashes match byte-for-byte. Validates the core promise that
// the hub-core sim is fully deterministic — a release-gate-grade claim.
//
// Why fixed tick counts instead of `waitForTimeout` holds: the production
// loop advances a wall-clock-derived, variable number of ticks per frame
// (delta -> fixed-step accumulator). Driving input by real time therefore
// applies a run-to-run-variable number of movement ticks. That jitter was
// masked while the player slammed into the wall clamp within a few ticks;
// the v0.2.1 speed retune (100 -> 10 units/tick) left the player mid-field
// at the end of the hold, so the tick-count jitter leaked straight into
// player_x/player_y and the hash, and the gate began failing. We instead
// pause the loop and step an exact tick count via the `__advance` dev hook
// (added 2026-05-29) — the same tick path real frames use, minus the clock.
//
// Uses the `?seed=N` URL param + `window.__stateHash()` / `window.__seed`
// dev hooks (added 2026-05-23) and `window.__setPaused` / `window.__advance`
// (added 2026-05-29).

import { chromium } from 'playwright';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const SEED = 0xfeedf00dcafebeefn; // fixed test seed; any value works
const URL = `${URL_BASE}?seed=${SEED}`;

// Fixed tick budgets per scripted key. Chosen to keep the player mid-field
// (start 340,540 in a 1000x1000 world at 10 units/tick) so movement is
// genuinely exercised rather than absorbed by a wall clamp — the exact
// condition that unmasked the original non-determinism.
const RIGHT_TICKS = 30;
const DOWN_TICKS = 18;

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

  // Pause the wall-clock tick loop so the only ticks applied are the exact
  // counts we step below. Same scripted sequence both runs.
  await page.evaluate(() => window.__setPaused(true));

  await page.keyboard.down('ArrowRight');
  const rightPacked = await page.evaluate((ticks) => window.__advance(ticks), RIGHT_TICKS);
  await page.keyboard.up('ArrowRight');
  if (rightPacked === 0) {
    throw new Error('ArrowRight did not register — sampled packed input was 0 (no movement)');
  }

  await page.keyboard.down('ArrowDown');
  const downPacked = await page.evaluate((ticks) => window.__advance(ticks), DOWN_TICKS);
  await page.keyboard.up('ArrowDown');
  if (downPacked === 0) {
    throw new Error('ArrowDown did not register — sampled packed input was 0 (no movement)');
  }

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
