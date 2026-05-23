// Preview a single sprite at large scale so the agent can iterate the
// pixel-by-pixel design without scene clutter.
//
// Usage: node scripts/preview-sprite.mjs haggis
// Output: .tmp/preview-<name>.png

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const name = process.argv[2] ?? 'haggis';
const url = `${process.env.SCREENSHOT_URL ?? 'http://localhost:5173/'}?preview=${name}`;
const viewport = { width: 1100, height: 900 };

await mkdir('.tmp', { recursive: true });

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const path = `.tmp/preview-${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`preview: ${path}`);
} finally {
  await browser.close();
}
