// Replay-log smoke: drive the real browser host through an exact-tick input
// sequence, seal the browser-written `.haggislog`, replay that byte stream
// through the exported Rust/WASM `replay_run`, and assert the replay hash
// equals the live state hash. This joins the input-log writer to replay truth.

import { chromium } from 'playwright';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const SEED = 0x1234_5678_9abc_def0n;
const URL = `${URL_BASE}?seed=${SEED}`;

const RIGHT_TICKS = 24;
const DOWN_TICKS = 13;
const MIN_REPLAY_GRADE_LOG_BYTES = 34 + 8 * 2 + 20; // header + two records + trailer

async function captureReplayProof(browser) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  try {
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () =>
        typeof window.__setPaused === 'function' &&
        typeof window.__advance === 'function' &&
        typeof window.__stateHash === 'function' &&
        window.__seed !== undefined,
      { timeout: 15000 }
    );

    const seedSeen = await page.evaluate(() => String(window.__seed));
    if (seedSeen !== String(SEED)) {
      throw new Error(`seed mismatch: page=${seedSeen} expected=${SEED}`);
    }

    const hasReplayHook = await page.evaluate(() => typeof window.__replayHaggisLog === 'function');
    if (!hasReplayHook) {
      throw new Error(
        'window.__replayHaggisLog hook missing — replay_run is not joined to input logs'
      );
    }

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

    const proof = await page.evaluate((minBytes) => {
      window.dispatchEvent(new Event('beforeunload'));
      const logBytes = window.__lastHaggisLog;
      if (!(logBytes instanceof Uint8Array)) {
        throw new Error('beforeunload did not publish window.__lastHaggisLog');
      }
      if (logBytes.byteLength < minBytes) {
        throw new Error(
          `input log too small for a replay-grade two-input run: ${logBytes.byteLength} bytes`
        );
      }
      const liveHash = window.__stateHash();
      const replayHash = window.__replayHaggisLog(logBytes);
      return {
        liveHash: String(liveHash),
        replayHash: String(replayHash),
        logBytes: logBytes.byteLength,
      };
    }, MIN_REPLAY_GRADE_LOG_BYTES);

    if (proof.liveHash !== proof.replayHash) {
      throw new Error(
        `replay hash mismatch: live=${proof.liveHash} replay=${proof.replayHash} logBytes=${proof.logBytes}`
      );
    }

    if (errors.length > 0) throw new Error(errors.join('\n'));
    return proof;
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch();
try {
  const proof = await captureReplayProof(browser);
  console.log(
    `smoke OK — browser log replays to live state hash ${proof.liveHash} (${proof.logBytes} bytes)`
  );
} finally {
  await browser.close();
}
