import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const url = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const viewport = { width: 1920, height: 1080 };
await mkdir('.tmp', { recursive: true });
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport, bypassCSP: true });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[ERROR] ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle' });
  // Hard reload to bust any cached module
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '.tmp/inspect-full.png' });
  console.log('--- LOGS ---');
  for (const l of logs) console.log(l);
} finally {
  await browser.close();
}
