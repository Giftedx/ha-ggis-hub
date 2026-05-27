import { describe, expect, it } from 'vitest';
import {
  collectProductionProbeFailures,
  extractAssetPaths,
  requiredProductionHeaders
} from './check-production.mjs';

const HUB_URL = 'https://ha.ggis.xyz/';
const APEX_URL = 'https://ggis.xyz/__haggis_probe?check=redirect';
const WHS_URL = 'https://wild-haggis-survivors.pages.dev/';

function validProbe() {
  const headers = Object.fromEntries(requiredProductionHeaders.map(({ name, value }) => [
    name.toLowerCase(),
    value
  ]));
  headers['cache-control'] = 'public, max-age=0, must-revalidate';
  return {
    hub: {
      url: HUB_URL,
      status: 200,
      headers,
      body: '<!doctype html><title>ha.ggis Hub - a wee front door for haggis games</title><link rel="stylesheet" href="/assets/index-CiK-vxYc.css"><script type="module" src="/assets/index-D05WIeYb.js"></script>'
    },
    apexRedirect: {
      url: APEX_URL,
      status: 301,
      headers: { location: 'https://ha.ggis.xyz/__haggis_probe?check=redirect' },
      body: ''
    },
    assets: [
      {
        url: 'https://ha.ggis.xyz/assets/index-CiK-vxYc.css',
        status: 200,
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        body: 'body{color:#fff}'
      },
      {
        url: 'https://ha.ggis.xyz/assets/index-D05WIeYb.js',
        status: 200,
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        body: 'console.log("hub")'
      }
    ],
    whs: {
      url: WHS_URL,
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: '<!doctype html><title>Wild Haggis Survivors</title>'
    }
  };
}

describe('extractAssetPaths', () => {
  it('extracts hashed Vite asset paths from production HTML', () => {
    expect(extractAssetPaths('<link href="/assets/index-abc123.css"><script src="/assets/app-DEADBEEF.js"></script>')).toEqual([
      '/assets/index-abc123.css',
      '/assets/app-DEADBEEF.js'
    ]);
  });
});

describe('collectProductionProbeFailures', () => {
  it('accepts a live hub with redirect, required headers, immutable assets, and reachable WHS URL', () => {
    expect(collectProductionProbeFailures(validProbe())).toEqual([]);
  });

  it('fails when the production hub DNS or fetch step fails', () => {
    const probe = validProbe();
    probe.hub = { url: HUB_URL, error: 'getaddrinfo ENOTFOUND ha.ggis.xyz' };

    expect(collectProductionProbeFailures(probe)).toContainEqual(expect.objectContaining({
      id: 'hub-fetch-error'
    }));
  });

  it('fails when ggis.xyz does not redirect to the matching ha.ggis.xyz path and query', () => {
    const probe = validProbe();
    probe.apexRedirect.headers.location = 'https://example.invalid/';

    expect(collectProductionProbeFailures(probe)).toContainEqual(expect.objectContaining({
      id: 'apex-redirect-target'
    }));
  });

  it('fails when required production security headers are missing', () => {
    const probe = validProbe();
    delete probe.hub.headers['content-security-policy'];

    expect(collectProductionProbeFailures(probe)).toContainEqual(expect.objectContaining({
      id: 'hub-missing-header',
      detail: expect.stringContaining('content-security-policy')
    }));
  });

  it('fails when production assets are not hashed, immutable, or source-map clean', () => {
    const probe = validProbe();
    probe.hub.body = '<script type="module" src="/assets/index.js"></script>';
    probe.assets = [{
      url: 'https://ha.ggis.xyz/assets/index.js',
      status: 200,
      headers: { 'cache-control': 'public, max-age=0, must-revalidate' },
      body: '//# sourceMappingURL=index.js.map'
    }];

    const ids = collectProductionProbeFailures(probe).map((failure) => failure.id);

    expect(ids).toContain('hub-no-hashed-assets');
    expect(ids).toContain('asset-not-immutable');
    expect(ids).toContain('asset-source-map-reference');
  });
});
