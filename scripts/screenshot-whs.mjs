// One-off: screenshot the live Wild Haggis Survivors dev site so the
// agent can study its actual visual style as reference for the hub.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = 'https://wild-haggis-survivors.pages.dev/';
const out = '.tmp/whs-live.png';

await mkdir('.tmp', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`saved: ${out}`);
  for (const l of logs) console.log(l);
} finally {
  await browser.close();
}
