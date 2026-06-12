// Deploy config gate — verifies public/_headers + public/_redirects
// match the documented Cloudflare Pages spec at
// docs/deployment/cloudflare-pages.md. Catches accidental deletions /
// CSP relaxations / missing security headers BEFORE deploy.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HEADERS_PATH = resolve(__dirname, '..', 'public', '_headers');
const REDIRECTS_PATH = resolve(__dirname, '..', 'public', '_redirects');

describe('public/_headers', () => {
  const headers = readFileSync(HEADERS_PATH, 'utf8');

  it('applies all required security headers to /*', () => {
    // Required by docs/architecture/security-model.md + the
    // cloudflare-pages.md spec. Missing any of these = relaxed
    // posture; CI catches before the deploy lands.
    const required = [
      'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy: strict-origin-when-cross-origin',
      'X-Frame-Options: DENY',
      'Cross-Origin-Opener-Policy: same-origin',
      'Cross-Origin-Resource-Policy: same-origin',
      'Origin-Agent-Cluster: ?1',
    ];
    for (const line of required) {
      expect(headers).toContain(line);
    }
  });

  it('CSP whitelists wasm-unsafe-eval (required for WebAssembly init)', () => {
    expect(headers).toMatch(/Content-Security-Policy:.*'wasm-unsafe-eval'/);
  });

  it('CSP locks default-src, base-uri, object-src, frame-ancestors, form-action', () => {
    expect(headers).toMatch(/default-src 'self'/);
    expect(headers).toMatch(/base-uri 'none'/);
    expect(headers).toMatch(/object-src 'none'/);
    expect(headers).toMatch(/frame-ancestors 'none'/);
    expect(headers).toMatch(/form-action 'none'/);
  });

  it('hashed assets get immutable cache, html does not', () => {
    expect(headers).toMatch(
      /\/assets\/\*[\s\S]*?Cache-Control: public, max-age=31536000, immutable/
    );
    expect(headers).toMatch(/\/\*\.html[\s\S]*?Cache-Control: public, max-age=0, must-revalidate/);
  });

  it('mounted WHS (/wild/) hashed assets get immutable cache; its SW revalidates', () => {
    // WHS is served from the /wild/ sub-path of this project (ADR-0003 Option B).
    // Its chunks are content-hashed → immutable; its service worker must
    // revalidate so deploys propagate without a stale-SW trap.
    expect(headers).toMatch(
      /\/wild\/assets\/\*[\s\S]*?Cache-Control: public, max-age=31536000, immutable/
    );
    expect(headers).toMatch(
      /\/wild\/sw\.js[\s\S]*?Cache-Control: no-cache, no-store, must-revalidate/
    );
  });

  it('self-hosted font files get immutable cache so FOUT does not recur after first load', () => {
    expect(headers).toMatch(
      /\/fonts\/\*[\s\S]*?Cache-Control: public, max-age=31536000, immutable/
    );
  });

  it('Permissions-Policy locks dangerous APIs to ()', () => {
    expect(headers).toMatch(/Permissions-Policy:.*camera=\(\)/);
    expect(headers).toMatch(/Permissions-Policy:.*microphone=\(\)/);
    expect(headers).toMatch(/Permissions-Policy:.*geolocation=\(\)/);
    expect(headers).toMatch(/Permissions-Policy:.*payment=\(\)/);
  });
});

describe('public/_redirects', () => {
  const redirects = readFileSync(REDIRECTS_PATH, 'utf8');

  it('has SPA fallback so deep links resolve to index.html', () => {
    expect(redirects).toMatch(/^\/\*\s+\/index\.html\s+200/m);
  });

  it('rewrites /wild/* to the WHS shell, BEFORE the hub wildcard', () => {
    // WHS is mounted at /wild/ (ADR-0003 Option B). Cloudflare Pages applies
    // the first matching rule, so the WHS sub-path rewrite must precede the
    // hub catch-all or WHS deep links would fall through to the hub shell.
    const wildRule = redirects.search(/^\/wild\/\*\s+\/wild\/index\.html\s+200/m);
    const hubWildcard = redirects.search(/^\/\*\s+\/index\.html\s+200/m);
    expect(wildRule).toBeGreaterThanOrEqual(0);
    expect(hubWildcard).toBeGreaterThanOrEqual(0);
    expect(wildRule).toBeLessThan(hubWildcard);
  });
});
