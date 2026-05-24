// Verify the production dist/ directory matches the documented
// deployment contract (cloudflare-pages.md). Run AFTER `pnpm build`.
//
// Asserts:
// - dist/_headers exists (security headers ship to Pages)
// - dist/_redirects exists (SPA fallback)
// - dist/index.html exists
// - dist/assets/ contains hashed chunks
// - No .map files anywhere (source map policy)
// - Bundle stays under sanity limit (~200KB total assets)

import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const errors = [];

function must(condition, message) {
  if (!condition) errors.push(message);
}

must(existsSync(dist), 'dist/ missing — did you run `pnpm build`?');
if (errors.length === 0) {
  must(existsSync(join(dist, '_headers')), 'dist/_headers missing (public/_headers not copied)');
  must(existsSync(join(dist, '_redirects')), 'dist/_redirects missing (public/_redirects not copied)');
  must(existsSync(join(dist, 'index.html')), 'dist/index.html missing');
  must(existsSync(join(dist, 'favicon.svg')), 'dist/favicon.svg missing — icon broken in production');
  must(existsSync(join(dist, 'manifest.webmanifest')), 'dist/manifest.webmanifest missing');
  must(existsSync(join(dist, 'assets')), 'dist/assets/ missing');

  const maps = walk(dist).filter((p) => p.endsWith('.map'));
  must(maps.length === 0, `source maps found in dist (policy violation): ${maps.join(', ')}`);

  if (existsSync(join(dist, 'assets'))) {
    const assets = readdirSync(join(dist, 'assets'));
    must(assets.some((f) => f.endsWith('.js')), 'no .js chunk in dist/assets');
    must(assets.some((f) => f.endsWith('.wasm')), 'no .wasm in dist/assets');
    // Vite hashes assets as `name-HASH.ext` (8+ char hash before ext).
    const hashedPattern = /-[A-Za-z0-9_-]{8,}\.[a-z]+$/;
    must(
      assets.every((f) => hashedPattern.test(f)),
      `unhashed assets found (caching policy violation): ${assets.filter((f) => !hashedPattern.test(f)).join(', ')}`
    );
    const totalBytes = assets.reduce(
      (sum, f) => sum + statSync(join(dist, 'assets', f)).size,
      0
    );
    const LIMIT = 200 * 1024;
    must(
      totalBytes <= LIMIT,
      `assets total ${totalBytes} bytes exceeds sanity limit ${LIMIT} — investigate`
    );
  }

  // Headers file sanity: must contain CSP directive + wasm-unsafe-eval.
  if (existsSync(join(dist, '_headers'))) {
    const headers = readFileSync(join(dist, '_headers'), 'utf8');
    must(
      /Content-Security-Policy:.*'wasm-unsafe-eval'/.test(headers),
      'CSP missing wasm-unsafe-eval (WASM init will fail in production)'
    );
    must(
      headers.includes('Strict-Transport-Security'),
      'HSTS header missing'
    );
  }
}

if (errors.length > 0) {
  console.error('verify-dist FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log('verify-dist OK');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
