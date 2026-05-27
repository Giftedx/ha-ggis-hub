// Smoke test: reduced-motion path. When the browser reports
// `prefers-reduced-motion: reduce`, the hub must:
//   1. Show "reduced motion · the bothy bides quiet" in the polite
//      status region (proving the OS preference is detected and wired
//      through WASM boot into the door-status announcer).
//   2. Produce no page errors (the renderer fallback must not throw).
//
// Walk cycle and door launch are intentionally NOT re-tested here —
// those are covered by smoke-door-launch.mjs. This smoke's unique
// surface is the reduced-motion detection → status-text path.

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/';
const EXPECTED_STATUS = 'reduced motion · the bothy bides quiet';

const browser = await launchBrowser();
try {
  const ctx = await browser.newContext({
    viewport: { width: 960, height: 540 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  // Give WASM time to boot and fire the first tick so the
  // status announcer has a chance to set the fallback text.
  await page.waitForTimeout(800);

  const statusText = await page.evaluate(
    () => document.querySelector('.scene-status')?.textContent?.trim() ?? null
  );

  if (errors.length > 0) {
    throw new Error(`page errors during smoke:\n${errors.join('\n')}`);
  }
  if (statusText !== EXPECTED_STATUS) {
    throw new Error(`expected status "${EXPECTED_STATUS}", got ${JSON.stringify(statusText)}`);
  }

  console.log('smoke OK — reduced-motion status:', statusText);
} finally {
  await browser.close();
}
