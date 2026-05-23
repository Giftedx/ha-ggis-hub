import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const name = process.argv[2] ?? 'haggis-silhouette';
const url = `http://localhost:5173/?preview=${name}&t=${Date.now()}`;
await mkdir('.tmp', { recursive: true });
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[ERROR] ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `.tmp/preview-${name}.png` });
  console.log('--- LOGS ---');
  for (const l of logs) console.log(l);
} finally { await browser.close(); }
