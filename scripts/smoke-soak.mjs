// Memory-growth soak: loads the hub, waits for the game loop to be
// running, forces GC, soaks for HAGGIS_SOAK_SECS seconds, forces GC
// again, then asserts heap growth < HAGGIS_SOAK_MAX_MB.
//
// Catches leaks in: the RAF loop accumulator, renderer closures, input
// sampler, event-listener stacking, or any per-frame allocation that
// GC cannot collect before the page is torn down.
//
// Runs against a live preview at SCREENSHOT_URL (default :4177/).
// Pair with scripts/run-soak-gate.mjs which builds dist + boots preview
// + tears down.

import { chromium } from 'playwright';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4177/';
const SOAK_SECS = Number(process.env.HAGGIS_SOAK_SECS ?? '15');
const MAX_GROWTH_MB = Number(process.env.HAGGIS_SOAK_MAX_MB ?? '5');

function log(...args) {
  console.log('[smoke-soak]', ...args);
}

const browser = await chromium.launch();
let exitCode = 0;

try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  await page.goto(`${URL_BASE}?seed=42`);

  // Wait until the game is running (WASM loaded + first render done).
  await page.waitForFunction(() => typeof window.__stateHash === 'function', {
    timeout: 15000,
  });
  log('game running — settling 2s before baseline sample…');
  await page.waitForTimeout(2000);

  // Force GC + baseline heap sample via CDP Performance.getMetrics.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(300);
  const before = await heapUsed(cdp);
  log(`heap before: ${mb(before)} MB`);

  // Soak: let the natural RAF loop + renderer run for SOAK_SECS.
  log(`soaking for ${SOAK_SECS}s…`);
  await page.waitForTimeout(SOAK_SECS * 1000);

  // Force GC + post-soak heap sample.
  await cdp.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(300);
  const after = await heapUsed(cdp);
  log(`heap after:  ${mb(after)} MB`);

  const growthMB = (after - before) / (1024 * 1024);
  const sign = growthMB >= 0 ? '+' : '';
  log(`growth: ${sign}${growthMB.toFixed(2)} MB (budget ${MAX_GROWTH_MB} MB)`);

  if (errors.length > 0) {
    console.error('soak FAIL: page errors during soak:');
    for (const e of errors) console.error('  ', e);
    exitCode = 1;
  } else if (growthMB > MAX_GROWTH_MB) {
    console.error(
      `soak FAIL: heap grew ${growthMB.toFixed(2)} MB — exceeds ${MAX_GROWTH_MB} MB budget`,
    );
    exitCode = 1;
  } else {
    log('soak OK');
  }

  await ctx.close();
} catch (err) {
  console.error('soak FAIL:', err.message);
  exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

async function heapUsed(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? 0;
}
