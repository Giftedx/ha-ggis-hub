// Shared browser launch helper for smoke scripts.
// Reads PLAYWRIGHT_BROWSER env var (default: chromium).
import { chromium, firefox, webkit } from 'playwright';

const BROWSERS = { chromium, firefox, webkit };

export function launchBrowser(options = {}) {
  const name = process.env.PLAYWRIGHT_BROWSER ?? 'chromium';
  const browserType = BROWSERS[name];
  if (!browserType) {
    throw new Error(`Unknown browser: ${name}. Valid: chromium, firefox, webkit`);
  }
  return browserType.launch(options);
}
