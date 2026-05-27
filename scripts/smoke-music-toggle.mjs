// Browser smoke for the opt-in hub music control. The page must not
// fetch MP3 assets before the visitor asks for sound, and the first
// click must start the local rendered track through HTMLAudioElement.

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/';

const browser = await launchBrowser();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('requestfailed', (request) => {
    if (request.url().includes('/music/')) {
      errors.push(`music request failed: ${request.url()} ${request.failure()?.errorText ?? ''}`);
    }
  });

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => ({
    buttonText: document.querySelector('.scene-music')?.textContent?.trim() ?? null,
    buttonLabel: document.querySelector('.scene-music')?.getAttribute('aria-label') ?? null,
    audioSrc: document.querySelector('.scene-music-audio')?.getAttribute('src') ?? null,
    audioPreload: document.querySelector('.scene-music-audio')?.preload ?? null,
    musicResources: performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.includes('/music/') && name.endsWith('.mp3')),
  }));

  if (before.buttonText !== 'music') {
    throw new Error(
      `expected initial music button text "music", got ${JSON.stringify(before.buttonText)}`
    );
  }
  if (before.buttonLabel !== 'Play hub music: Flower of Scotland') {
    throw new Error(
      `expected initial music aria-label for Flower of Scotland, got ${JSON.stringify(before.buttonLabel)}`
    );
  }
  if (before.audioSrc !== '/music/flower-of-scotland.mp3') {
    throw new Error(
      `expected first audio src /music/flower-of-scotland.mp3, got ${JSON.stringify(before.audioSrc)}`
    );
  }
  if (before.audioPreload !== 'none') {
    throw new Error(`expected preload=none, got ${JSON.stringify(before.audioPreload)}`);
  }
  if (before.musicResources.length > 0) {
    throw new Error(`music fetched before opt-in: ${before.musicResources.join(', ')}`);
  }

  await page.click('.scene-music');
  await page.waitForFunction(
    () => {
      const button = document.querySelector('.scene-music');
      const audio = document.querySelector('.scene-music-audio');
      return (
        button?.textContent?.trim() === 'music on' &&
        button.getAttribute('aria-label') === 'Pause hub music' &&
        audio !== null &&
        audio.paused === false &&
        audio.currentSrc.endsWith('/music/flower-of-scotland.mp3')
      );
    },
    null,
    { timeout: 4_000 }
  );

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  const after = await page.evaluate(() => {
    const audio = document.querySelector('.scene-music-audio');
    return {
      buttonText: document.querySelector('.scene-music')?.textContent?.trim() ?? null,
      currentSrc: audio?.currentSrc ?? null,
      paused: audio?.paused ?? null,
    };
  });
  console.log('music-toggle:', after);
  console.log('smoke OK — music starts after explicit opt-in');
} finally {
  await browser.close();
}
