import { describe, expect, it } from 'vitest';

interface ProbeResponse {
  url: string;
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  error?: string;
}

interface ProductionProbe {
  hub: ProbeResponse;
  apexRedirect: ProbeResponse;
  assets: ProbeResponse[];
  wild: ProbeResponse;
  wildAssets: ProbeResponse[];
  version: ProbeResponse;
}

interface ProductionFailure {
  id: string;
  url: string;
  detail: string;
}

interface RequiredHeader {
  name: string;
  value: string;
}

interface ProductionModule {
  APEX_PROBE_URL: string;
  EXPECTED_APEX_LOCATION: string;
  HUB_URL: string;
  VERSION_URL: string;
  WILD_ROUTE_URL: string;
  collectProductionProbeFailures: (probe: ProductionProbe) => ProductionFailure[];
  extractAssetPaths: (html: string) => string[];
  requiredProductionHeaders: RequiredHeader[];
}

const production = (await import(
  new URL('./check-production.mjs', import.meta.url).href
)) as ProductionModule;
const {
  APEX_PROBE_URL,
  EXPECTED_APEX_LOCATION,
  HUB_URL,
  VERSION_URL,
  WILD_ROUTE_URL,
  collectProductionProbeFailures,
  extractAssetPaths,
  requiredProductionHeaders,
} = production;

function requiredHeaders(): Record<string, string> {
  return Object.fromEntries(
    requiredProductionHeaders.map(({ name, value }) => [name.toLowerCase(), value])
  );
}

function validVersionBody(): string {
  return JSON.stringify({
    schema: 1,
    generatedAt: '2026-06-12T00:00:00.000Z',
    hub: {
      packageName: 'ha-ggis-hub',
      packageVersion: '0.2.4',
      git: {
        commit: '0123456789abcdef0123456789abcdef01234567',
        shortCommit: '0123456',
        branch: 'main',
        dirty: false,
        dirtyFiles: [],
      },
    },
    wildHaggisSurvivors: {
      route: '/wild/',
      source: {
        present: true,
        commit: 'fedcba9876543210fedcba9876543210fedcba98',
        shortCommit: 'fedcba9',
        branch: 'main',
        dirty: true,
        dirtyFiles: ['M src/game.ts'],
      },
      build: {
        mounted: true,
        assetCount: 2,
        fingerprint: 'a'.repeat(64),
        indexSha256: 'b'.repeat(64),
      },
    },
  });
}

function validProbe(): ProductionProbe {
  const hubHeaders = {
    ...requiredHeaders(),
    'cache-control': 'public, max-age=0, must-revalidate',
    'content-type': 'text/html; charset=utf-8',
  };
  const immutableAssetHeaders = {
    'cache-control': 'public, max-age=31536000, immutable',
  };
  return {
    hub: {
      url: HUB_URL,
      status: 200,
      headers: hubHeaders,
      body:
        '<!doctype html><title>ha.ggis Hub - a wee front door for haggis games</title>' +
        '<link rel="stylesheet" href="/assets/index-CiK-vxYc.css">' +
        '<script type="module" src="/assets/index-D05WIeYb.js"></script>',
    },
    apexRedirect: {
      url: APEX_PROBE_URL,
      status: 301,
      headers: { location: EXPECTED_APEX_LOCATION },
      body: '',
    },
    assets: [
      {
        url: 'https://ha.ggis.xyz/assets/index-CiK-vxYc.css',
        status: 200,
        headers: immutableAssetHeaders,
        body: 'body{color:#fff}',
      },
      {
        url: 'https://ha.ggis.xyz/assets/index-D05WIeYb.js',
        status: 200,
        headers: immutableAssetHeaders,
        body: 'console.log("hub")',
      },
    ],
    wild: {
      url: WILD_ROUTE_URL,
      status: 200,
      headers: {
        ...hubHeaders,
        'content-type': 'text/html; charset=utf-8',
      },
      body:
        '<!doctype html><title>Wild Haggis Survivors</title>' +
        '<script type="module" src="/wild/assets/index-WHS12345.js"></script>',
    },
    wildAssets: [
      {
        url: 'https://ha.ggis.xyz/wild/assets/index-WHS12345.js',
        status: 200,
        headers: immutableAssetHeaders,
        body: 'console.log("wild")',
      },
    ],
    version: {
      url: VERSION_URL,
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
      },
      body: validVersionBody(),
    },
  };
}

describe('extractAssetPaths', () => {
  it('extracts hashed hub and mounted-WHS Vite asset paths from production HTML', () => {
    expect(
      extractAssetPaths(
        '<link href="/assets/index-abc12345.css">' +
          '<script src="/assets/app-DEADBEEF.js"></script>' +
          '<script src="/wild/assets/game-wild1234.js"></script>'
      )
    ).toEqual([
      '/assets/index-abc12345.css',
      '/assets/app-DEADBEEF.js',
      '/wild/assets/game-wild1234.js',
    ]);
  });
});

describe('collectProductionProbeFailures', () => {
  it('accepts current production contract: hub, apex redirect, headers, assets, /wild, and /__version', () => {
    expect(collectProductionProbeFailures(validProbe())).toEqual([]);
  });

  it('fails when the hub fetch fails', () => {
    const probe = validProbe();
    probe.hub = { url: HUB_URL, error: 'ENOTFOUND ha.ggis.xyz' };

    expect(collectProductionProbeFailures(probe)).toContainEqual(
      expect.objectContaining({ id: 'hub-fetch-error' })
    );
  });

  it('fails when ggis.xyz does not redirect to the matching ha.ggis.xyz path and query', () => {
    const probe = validProbe();
    probe.apexRedirect.headers = { location: 'https://example.invalid/' };

    expect(collectProductionProbeFailures(probe)).toContainEqual(
      expect.objectContaining({ id: 'apex-redirect-target' })
    );
  });

  it('fails when required production security headers are missing', () => {
    const probe = validProbe();
    delete probe.hub.headers?.['content-security-policy'];

    expect(collectProductionProbeFailures(probe)).toContainEqual(
      expect.objectContaining({
        id: 'hub-missing-header',
        detail: expect.stringContaining('content-security-policy'),
      })
    );
  });

  it('fails when hub assets are not hashed, immutable, or source-map clean', () => {
    const probe = validProbe();
    probe.hub.body = '<script type="module" src="/assets/index.js"></script>';
    probe.assets = [
      {
        url: 'https://ha.ggis.xyz/assets/index.js',
        status: 200,
        headers: { 'cache-control': 'public, max-age=0, must-revalidate' },
        body: '//# sourceMappingURL=index.js.map',
      },
    ];

    const ids = collectProductionProbeFailures(probe).map((failure) => failure.id);

    expect(ids).toContain('hub-no-hashed-assets');
    expect(ids).toContain('asset-not-immutable');
    expect(ids).toContain('asset-source-map-reference');
  });

  it('does not confuse ordinary JavaScript .map calls with source-map references', () => {
    const probe = validProbe();
    probe.assets[1]!.body = 'const names = items.map((item) => item.name);';
    probe.wildAssets[0]!.body = 'const sprites = frames.map((frame) => frame.id);';

    expect(collectProductionProbeFailures(probe)).toEqual([]);
  });

  it('fails the stale external WHS launch URL and requires the same-origin /wild/ route', () => {
    const probe = validProbe();
    probe.wild.url = 'https://wild-haggis-survivors.pages.dev/';

    expect(collectProductionProbeFailures(probe)).toContainEqual(
      expect.objectContaining({ id: 'wild-route-url' })
    );
  });

  it('fails when mounted-WHS assets are not immutable or source-map clean', () => {
    const probe = validProbe();
    probe.wild.body = '<script type="module" src="/wild/assets/index.js"></script>';
    probe.wildAssets = [
      {
        url: 'https://ha.ggis.xyz/wild/assets/index.js',
        status: 200,
        headers: { 'cache-control': 'public, max-age=0, must-revalidate' },
        body: '//# sourceMappingURL=index.js.map',
      },
    ];

    const ids = collectProductionProbeFailures(probe).map((failure) => failure.id);

    expect(ids).toContain('wild-no-hashed-assets');
    expect(ids).toContain('wild-asset-not-immutable');
    expect(ids).toContain('wild-asset-source-map-reference');
  });

  it('fails when /__version is missing or does not carry hub and WHS provenance', () => {
    const probe = validProbe();
    probe.version.body = JSON.stringify({
      schema: 1,
      generatedAt: '2026-06-12T00:00:00.000Z',
      hub: { packageName: 'ha-ggis-hub', packageVersion: '0.2.4', git: { dirty: false } },
      wildHaggisSurvivors: { route: '/old-external/' },
    });

    const ids = collectProductionProbeFailures(probe).map((failure) => failure.id);

    expect(ids).toContain('version-hub-commit');
    expect(ids).toContain('version-whs-route');
    expect(ids).toContain('version-whs-build');
  });
});
