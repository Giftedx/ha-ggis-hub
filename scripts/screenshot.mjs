// Local-only dev tool. Opens the running Vite dev server, optionally
// drives the haggis around with simulated keypresses, and saves
// screenshots to .tmp/ so the agent (or you) can inspect rendered
// state without doing it by hand. Not part of the build or test gates.
//
// Usage:
//   node scripts/screenshot.mjs                         # idle scene, .tmp/screenshot.png
//   node scripts/screenshot.mjs left                    # haggis walked to left door
//   node scripts/screenshot.mjs right                   # haggis walked to right door
//   node scripts/screenshot.mjs sweep                   # captures idle, left, right
//
// Env:
//   SCREENSHOT_URL  defaults to http://localhost:5173/

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/';
const mode = process.argv[2] ?? 'idle';
const viewport = { width: 1920, height: 1080 };

await mkdir('.tmp', { recursive: true });

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  async function hold(direction, ms) {
    const key = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
    }[direction];
    if (!key) throw new Error(`unknown direction: ${direction}`);
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
    // Let the simulation settle a frame
    await page.waitForTimeout(80);
  }

  async function shoot(name) {
    const path = `.tmp/${name}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`shot: ${path}`);
  }

  if (mode === 'idle') {
    await shoot('screenshot');
  } else if (mode === 'left') {
    await hold('left', 700);
    await shoot('screenshot-left');
  } else if (mode === 'right') {
    await hold('right', 700);
    await shoot('screenshot-right');
  } else if (mode === 'sweep') {
    await shoot('screenshot-idle');
    await hold('left', 700);
    await shoot('screenshot-left');
    await hold('right', 1400);
    await shoot('screenshot-right');
  } else {
    throw new Error(`unknown mode: ${mode}`);
  }

  if (logs.length > 0) {
    console.log('--- browser console ---');
    for (const line of logs) console.log(line);
  }
} finally {
  await browser.close();
}
