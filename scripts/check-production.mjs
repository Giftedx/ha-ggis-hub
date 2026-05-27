import { pathToFileURL } from 'node:url';

export const HUB_URL = 'https://ha.ggis.xyz/';
export const APEX_PROBE_URL = 'https://ggis.xyz/__haggis_probe?check=redirect';
export const EXPECTED_APEX_LOCATION = 'https://ha.ggis.xyz/__haggis_probe?check=redirect';
export const WHS_URL = 'https://wild-haggis-survivors.pages.dev/';

export const requiredProductionHeaders = [
  { name: 'strict-transport-security', value: 'max-age=31536000; includeSubDomains; preload' },
  { name: 'x-content-type-options', value: 'nosniff' },
  { name: 'referrer-policy', value: 'strict-origin-when-cross-origin' },
  { name: 'x-frame-options', value: 'DENY' },
  { name: 'cross-origin-opener-policy', value: 'same-origin' },
  { name: 'cross-origin-resource-policy', value: 'same-origin' },
  { name: 'origin-agent-cluster', value: '?1' },
  {
    name: 'content-security-policy',
    value: "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob: data:"
  }
];

const REQUIRED_CSP_SNIPPETS = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "'wasm-unsafe-eval'"
];

export function extractAssetPaths(html) {
  return [...new Set([...html.matchAll(/["'](\/assets\/[^"']+\.(?:css|js|wasm))["']/g)]
    .map((match) => match[1]))];
}

export function collectProductionProbeFailures(probe) {
  return [
    ...validateHub(probe.hub),
    ...validateApexRedirect(probe.apexRedirect),
    ...validateAssets(probe.hub, probe.assets),
    ...validateWhs(probe.whs)
  ];
}

function validateHub(hub) {
  const failures = [];
  if (hub.error !== undefined) {
    return [failure('hub-fetch-error', hub.url, hub.error)];
  }
  if (hub.status !== 200) {
    failures.push(failure('hub-status', hub.url, `status ${hub.status}; want 200`));
  }
  if (!/ha\.ggis Hub/i.test(hub.body ?? '')) {
    failures.push(failure('hub-html-marker', hub.url, 'missing ha.ggis Hub marker'));
  }
  if (/(?:sourceMappingURL|\.map\b)/i.test(hub.body ?? '')) {
    failures.push(failure('hub-source-map-reference', hub.url, 'HTML references a source map'));
  }

  for (const { name, value } of requiredProductionHeaders) {
    const actual = hub.headers?.[name];
    if (actual !== value) {
      failures.push(failure('hub-missing-header', hub.url, `${name}: got ${actual ?? '<missing>'}; want ${value}`));
    }
  }

  const csp = hub.headers?.['content-security-policy'] ?? '';
  for (const snippet of REQUIRED_CSP_SNIPPETS) {
    if (!csp.includes(snippet)) {
      failures.push(failure('hub-csp', hub.url, `missing CSP snippet ${snippet}`));
    }
  }

  const cacheControl = hub.headers?.['cache-control'] ?? '';
  if (!cacheControl.includes('max-age=0') || !cacheControl.includes('must-revalidate')) {
    failures.push(failure('hub-cache-control', hub.url, `cache-control ${cacheControl}; want max-age=0, must-revalidate`));
  }

  const hashedAssets = extractAssetPaths(hub.body ?? '').filter((asset) => /-[A-Za-z0-9_-]{6,}\.(?:css|js|wasm)$/.test(asset));
  if (hashedAssets.length === 0) {
    failures.push(failure('hub-no-hashed-assets', hub.url, 'no hashed /assets/* JS/CSS/WASM references found'));
  }

  return failures;
}

function validateApexRedirect(apexRedirect) {
  if (apexRedirect.error !== undefined) {
    return [failure('apex-fetch-error', apexRedirect.url, apexRedirect.error)];
  }
  const failures = [];
  if (![301, 302, 307, 308].includes(apexRedirect.status)) {
    failures.push(failure('apex-redirect-status', apexRedirect.url, `status ${apexRedirect.status}; want 30x redirect`));
  }
  const location = apexRedirect.headers?.location ?? '';
  if (location !== EXPECTED_APEX_LOCATION) {
    failures.push(failure('apex-redirect-target', apexRedirect.url, `location ${location || '<missing>'}; want ${EXPECTED_APEX_LOCATION}`));
  }
  return failures;
}

function validateAssets(hub, assets) {
  const failures = [];
  const expectedAssetPaths = extractAssetPaths(hub.body ?? '');
  if (assets.length !== expectedAssetPaths.length) {
    failures.push(failure('asset-count', HUB_URL, `fetched ${assets.length} assets; expected ${expectedAssetPaths.length}`));
  }
  for (const asset of assets) {
    if (asset.error !== undefined) {
      failures.push(failure('asset-fetch-error', asset.url, asset.error));
      continue;
    }
    if (asset.status !== 200) {
      failures.push(failure('asset-status', asset.url, `status ${asset.status}; want 200`));
    }
    if (!/-[A-Za-z0-9_-]{6,}\.(?:css|js|wasm)$/.test(new URL(asset.url).pathname)) {
      failures.push(failure('asset-not-hashed', asset.url, 'asset filename is not content-hashed'));
    }
    const cacheControl = asset.headers?.['cache-control'] ?? '';
    if (!cacheControl.includes('max-age=31536000') || !cacheControl.includes('immutable')) {
      failures.push(failure('asset-not-immutable', asset.url, `cache-control ${cacheControl}; want one-year immutable`));
    }
    if (/(?:sourceMappingURL|\.map\b)/i.test(asset.body ?? '')) {
      failures.push(failure('asset-source-map-reference', asset.url, 'asset references a source map'));
    }
  }
  return failures;
}

function validateWhs(whs) {
  if (whs.error !== undefined) {
    return [failure('whs-fetch-error', whs.url, whs.error)];
  }
  const failures = [];
  if (whs.status !== 200) {
    failures.push(failure('whs-status', whs.url, `status ${whs.status}; want 200`));
  }
  if (!/^text\/html\b/i.test(whs.headers?.['content-type'] ?? '')) {
    failures.push(failure('whs-content-type', whs.url, `content-type ${whs.headers?.['content-type'] ?? '<missing>'}; want text/html`));
  }
  return failures;
}

function failure(id, url, detail) {
  return { id, url, detail };
}

export async function runProductionProbe() {
  const hub = await fetchText(HUB_URL, { redirect: 'follow' });
  const apexRedirect = await fetchText(APEX_PROBE_URL, { redirect: 'manual' });
  const whs = await fetchText(WHS_URL, { redirect: 'follow' });
  const assets = [];
  if (hub.error === undefined) {
    for (const assetPath of extractAssetPaths(hub.body)) {
      assets.push(await fetchText(new URL(assetPath, HUB_URL).href, { redirect: 'follow' }));
    }
  }
  return { hub, apexRedirect, assets, whs };
}

async function fetchText(url, init) {
  try {
    const response = await fetch(url, init);
    return {
      url,
      status: response.status,
      headers: lowerCaseHeaders(response.headers),
      body: await response.text()
    };
  } catch (error) {
    return {
      url,
      error: error.cause?.code !== undefined
        ? `${error.cause.code}: ${error.cause.hostname ?? url}`
        : error.message
    };
  }
}

function lowerCaseHeaders(headers) {
  return Object.fromEntries([...headers.entries()].map(([name, value]) => [name.toLowerCase(), value]));
}

async function main() {
  const probe = await runProductionProbe();
  const failures = collectProductionProbeFailures(probe);
  if (failures.length > 0) {
    console.error(`production-check FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'})`);
    for (const failure of failures) {
      console.error(`- [${failure.id}] ${failure.url} - ${failure.detail}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log('production-check OK - ha.ggis.xyz, ggis.xyz redirect, headers, assets, and WHS launch URL verified');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
