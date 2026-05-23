import { chromium } from 'playwright';

const name = process.argv[2] ?? 'wooden-stool';
const url = `http://localhost:5173/?preview=${name}`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page = await context.newPage();
page.on('console', (msg) => console.log(`[${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const text = await page.locator('body').innerText();
console.log('--- body text ---');
console.log(text);
await browser.close();
