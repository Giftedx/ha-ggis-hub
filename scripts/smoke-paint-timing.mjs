// Paint-timing perf gate — the second half of slice 9 `perf` that was
// carried forward as "Lighthouse outstanding". Hand-rolled via the
// already-present Playwright + the browser's PerformanceObserver, so
// no Lighthouse npm dependency enters the graph (matches the hand-roll
// preference: the engineering primitive is the W3C Paint Timing API
// directly, not a vendor library wrapping it).
//
// Approach: chromium-headless loads `${URL_BASE}?seed=42`, the page is
// instrumented to record `first-contentful-paint` (Paint Timing API)
// and `largest-contentful-paint` (LCP via PerformanceObserver), plus
// navigation-timing's `domContentLoadedEventEnd` and `loadEventEnd`.
// Each metric is asserted against the budget block in perf-budgets.json
// under `paint`. Drift past budget exits non-zero with the offenders
// quoted.
//
// Runs against a live preview at SCREENSHOT_URL (default :4176/). Pair
// with scripts/run-paint-gate.mjs which builds dist + boots preview +
// tears down.

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const BUDGETS_PATH = resolve(REPO_ROOT, 'perf-budgets.json');

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4176/';
const SEED = 42;
const SAMPLES = Number(process.env.HAGGIS_PAINT_SAMPLES ?? '3');

function log(...args) {
  console.log('[smoke-paint-timing]', ...args);
}

const config = JSON.parse(readFileSync(BUDGETS_PATH, 'utf8'));
const paintBudgets = config.paint;
if (!paintBudgets) {
  console.error('paint-timing FAIL: perf-budgets.json has no `paint` block');
  process.exit(1);
}

// Collect paint metrics from one page load. Loads the URL, waits for
// the LCP element to settle (settleMs), then reads the Performance API.
// LCP is the trickiest entry — it can be reported multiple times as
// larger contentful elements arrive; we take the latest reported value
// before settle, which is the W3C-defined "final LCP" for this page
// visit since no further user interaction happens.
async function measureOnce(browser) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  // Inject LCP observer BEFORE navigation so we don't miss the first
  // contentful entries. PerformanceObserver with buffered:true also
  // catches paints that fired before the observer attached, but
  // installing pre-navigation is the safer pattern.
  await page.addInitScript(() => {
    window.__paintMetrics = { lcpEntries: [] };
    try {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__paintMetrics.lcpEntries.push({
            startTime: entry.startTime,
            renderTime: entry.renderTime,
            size: entry.size,
          });
        }
      });
      obs.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // LCP entry type not supported — chromium has it, but guard for
      // future browser channels.
    }
  });

  const url = `${URL_BASE}?seed=${SEED}`;
  await page.goto(url, { waitUntil: 'load' });
  // Settle: give LCP observer time to capture the canvas paint after
  // the WASM boundary boots and the first render frame lands. 800ms is
  // ~3x the worst-case observed boot on Windows local; CI runners are
  // sometimes slower, so the per-metric budget below is what catches
  // regressions, not this settle.
  await page.waitForTimeout(800);

  const metrics = await page.evaluate(() => {
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find((p) => p.name === 'first-contentful-paint');
    const fp = paint.find((p) => p.name === 'first-paint');
    const navList = performance.getEntriesByType('navigation');
    const nav = navList[0];
    const lcpEntries = window.__paintMetrics?.lcpEntries ?? [];
    // Final LCP for this visit is the last reported entry. renderTime
    // is preferred per the spec; startTime is the fallback when
    // renderTime is 0 (cross-origin images without Timing-Allow-Origin).
    let lcp = null;
    if (lcpEntries.length > 0) {
      const last = lcpEntries[lcpEntries.length - 1];
      lcp = last.renderTime || last.startTime;
    }
    // Canvas-aware paint mark — see src/main.ts. The bothy is canvas-
    // first so chrome's LCP heuristic collapses LCP onto FCP because
    // the canvas reads as a non-contentful element until WASM boots and
    // the renderer issues its first draw. `hub:firstFrame` is a user
    // mark scheduled inside a rAF after the first room.render() call,
    // so its startTime tracks the actual "you can see the bothy" moment
    // a visitor experiences. The gate asserts this against
    // paint.max_ms.hubFirstFrame.
    const hubFrameEntries = performance.getEntriesByName('hub:firstFrame', 'mark');
    const hubFirstFrame = hubFrameEntries.length > 0 ? hubFrameEntries[0].startTime : null;
    return {
      firstPaint: fp ? fp.startTime : null,
      firstContentfulPaint: fcp ? fcp.startTime : null,
      largestContentfulPaint: lcp,
      hubFirstFrame,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
      loadEvent: nav ? nav.loadEventEnd : null,
      lcpEntryCount: lcpEntries.length,
    };
  });

  await ctx.close();
  if (errors.length > 0) {
    throw new Error('page errors: ' + errors.join('; '));
  }
  return metrics;
}

const browser = await chromium.launch();
let exitCode = 0;
const allSamples = [];

try {
  for (let i = 0; i < SAMPLES; i += 1) {
    log(`sample ${i + 1}/${SAMPLES}`);
    const m = await measureOnce(browser);
    log(
      `  fp=${fmt(m.firstPaint)} fcp=${fmt(m.firstContentfulPaint)} lcp=${fmt(m.largestContentfulPaint)} hubFrame=${fmt(m.hubFirstFrame)} dcl=${fmt(m.domContentLoaded)} load=${fmt(m.loadEvent)} lcpEntries=${m.lcpEntryCount}`
    );
    allSamples.push(m);
  }

  // Use the median across samples so a single jittery cold-start
  // doesn't sink the gate. Median is the "robust" Lighthouse-style
  // central tendency for paint metrics on shared CI runners.
  const aggregated = aggregateMedian(allSamples);
  log(
    `median: fcp=${fmt(aggregated.firstContentfulPaint)} lcp=${fmt(aggregated.largestContentfulPaint)} hubFrame=${fmt(aggregated.hubFirstFrame)} dcl=${fmt(aggregated.domContentLoaded)} load=${fmt(aggregated.loadEvent)}`
  );

  const breaches = [];
  for (const [metric, budget] of Object.entries(paintBudgets.max_ms ?? {})) {
    const v = aggregated[metric];
    if (v == null) {
      breaches.push(
        `metric "${metric}" not observed (got null); cannot verify against budget ${budget}ms`
      );
      continue;
    }
    const pct = Math.round((v / budget) * 100);
    log(`  [${metric}] ${v.toFixed(1)} / ${budget} ms (${pct}%)`);
    if (v > budget) {
      breaches.push(`metric "${metric}" median ${v.toFixed(1)} ms exceeds budget ${budget} ms`);
    }
  }

  if (breaches.length > 0) {
    console.error('paint-timing FAIL:');
    for (const b of breaches) console.error('  -', b);
    exitCode = 1;
  } else {
    log('paint-timing OK');
  }

  console.log(
    JSON.stringify(
      { samples: allSamples, median: aggregated, budgets: paintBudgets.max_ms },
      null,
      2
    )
  );
} catch (err) {
  console.error('paint-timing FAIL:', err.message);
  exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);

function fmt(v) {
  return v == null ? 'null' : `${v.toFixed(1)}ms`;
}

function aggregateMedian(samples) {
  const keys = [
    'firstPaint',
    'firstContentfulPaint',
    'largestContentfulPaint',
    'hubFirstFrame',
    'domContentLoaded',
    'loadEvent',
  ];
  const out = {};
  for (const k of keys) {
    const vals = samples
      .map((s) => s[k])
      .filter((v) => v != null)
      .sort((a, b) => a - b);
    if (vals.length === 0) {
      out[k] = null;
      continue;
    }
    const mid = Math.floor(vals.length / 2);
    out[k] = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  }
  return out;
}
