// Local-only dev tool. Opens the running Vite dev server at
// http://localhost:5173/ in headless chromium and saves a screenshot to
// .tmp/screenshot.png so the agent (or you) can inspect the rendered
// scene without doing it by hand. Not part of the build or test gates.
//
// Usage: pnpm exec node scripts/screenshot.mjs [width] [height] [wait_ms]
//   width    viewport width in CSS pixels  (default 1920)
//   height   viewport height in CSS pixels (default 1080)
//   wait_ms  ms to wait after load for animation to settle (default 700)

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const url = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const width = Number(process.argv[2] ?? 1920);
const height = Number(process.argv[3] ?? 1080);
const waitMs = Number(process.argv[4] ?? 700);
const outPath = '.tmp/screenshot.png';

await mkdir(dirname(outPath), { recursive: true });

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => consoleLogs.push(`[pageerror] ${err.message}`));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: outPath, fullPage: false });

  console.log(`screenshot: ${outPath} (${width}x${height})`);
  if (consoleLogs.length > 0) {
    console.log('--- browser console ---');
    for (const line of consoleLogs) console.log(line);
  }
} finally {
  await browser.close();
}
