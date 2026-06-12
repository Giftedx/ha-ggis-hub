import { pathToFileURL } from 'node:url';

export const HUB_URL = 'https://ha.ggis.xyz/';
export const APEX_PROBE_URL = 'https://ggis.xyz/__haggis_probe?check=redirect';
export const EXPECTED_APEX_LOCATION = 'https://ha.ggis.xyz/__haggis_probe?check=redirect';
export const WILD_ROUTE_URL = 'https://ha.ggis.xyz/wild/';
export const VERSION_URL = 'https://ha.ggis.xyz/__version';

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
    value:
      "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob: data:",
  },
];

const REQUIRED_CSP_SNIPPETS = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "'wasm-unsafe-eval'",
];
const HASHED_ASSET_PATTERN = /-[A-Za-z0-9_-]{6,}\.(?:css|js|wasm)$/;
const SOURCE_MAP_PATTERN = /sourceMappingURL\s*=/i;
const SHA_1_PATTERN = /^[a-f0-9]{40}$/i;
const SHA_256_PATTERN = /^[a-f0-9]{64}$/i;
const DEFAULT_TIMEOUT_MS = 15_000;

export function extractAssetPaths(html) {
  return [
    ...new Set(
      [
        ...String(html).matchAll(
          /["']((?:\/assets\/|\/wild\/assets\/)[^"']+\.(?:css|js|wasm))["']/g
        ),
      ].map((match) => match[1])
    ),
  ];
}

export function collectProductionProbeFailures(probe) {
  return [
    ...validateHub(probe.hub),
    ...validateApexRedirect(probe.apexRedirect),
    ...validateAssets({
      idPrefix: 'asset',
      ownerUrl: HUB_URL,
      expectedPaths: extractAssetPaths(probe.hub?.body ?? '').filter((path) =>
        path.startsWith('/assets/')
      ),
      assets: probe.assets ?? [],
    }),
    ...validateWild(probe.wild),
    ...validateAssets({
      idPrefix: 'wild-asset',
      ownerUrl: WILD_ROUTE_URL,
      expectedPaths: extractAssetPaths(probe.wild?.body ?? '').filter((path) =>
        path.startsWith('/wild/assets/')
      ),
      assets: probe.wildAssets ?? [],
      missingHashedId: 'wild-no-hashed-assets',
    }),
    ...validateVersion(probe.version),
  ];
}

function validateHub(hub) {
  const failures = [];
  if (hub?.error !== undefined) {
    return [failure('hub-fetch-error', hub.url ?? HUB_URL, hub.error)];
  }
  if (hub?.status !== 200) {
    failures.push(failure('hub-status', hub?.url ?? HUB_URL, `status ${hub?.status}; want 200`));
  }
  const body = hub?.body ?? '';
  if (!/ha\.ggis Hub/i.test(body)) {
    failures.push(failure('hub-html-marker', hub?.url ?? HUB_URL, 'missing ha.ggis Hub marker'));
  }
  if (SOURCE_MAP_PATTERN.test(body)) {
    failures.push(
      failure('hub-source-map-reference', hub?.url ?? HUB_URL, 'HTML references a source map')
    );
  }

  failures.push(...validateRequiredHeaders('hub', hub?.url ?? HUB_URL, hub?.headers ?? {}));

  const cacheControl = hub?.headers?.['cache-control'] ?? '';
  if (!cacheControl.includes('max-age=0') || !cacheControl.includes('must-revalidate')) {
    failures.push(
      failure(
        'hub-cache-control',
        hub?.url ?? HUB_URL,
        `cache-control ${cacheControl}; want max-age=0, must-revalidate`
      )
    );
  }

  const hashedAssets = extractAssetPaths(body).filter(
    (asset) => asset.startsWith('/assets/') && HASHED_ASSET_PATTERN.test(asset)
  );
  if (hashedAssets.length === 0) {
    failures.push(
      failure('hub-no-hashed-assets', hub?.url ?? HUB_URL, 'no hashed /assets/* references found')
    );
  }

  return failures;
}

function validateRequiredHeaders(idPrefix, url, headers) {
  const failures = [];
  for (const { name, value } of requiredProductionHeaders) {
    const actual = headers[name];
    if (actual !== value) {
      failures.push(
        failure(
          `${idPrefix}-missing-header`,
          url,
          `${name}: got ${actual ?? '<missing>'}; want ${value}`
        )
      );
    }
  }

  const csp = headers['content-security-policy'] ?? '';
  for (const snippet of REQUIRED_CSP_SNIPPETS) {
    if (!csp.includes(snippet)) {
      failures.push(failure(`${idPrefix}-csp`, url, `missing CSP snippet ${snippet}`));
    }
  }
  return failures;
}

function validateApexRedirect(apexRedirect) {
  if (apexRedirect?.error !== undefined) {
    return [failure('apex-fetch-error', apexRedirect.url ?? APEX_PROBE_URL, apexRedirect.error)];
  }
  const failures = [];
  if (![301, 302, 307, 308].includes(apexRedirect?.status)) {
    failures.push(
      failure(
        'apex-redirect-status',
        apexRedirect?.url ?? APEX_PROBE_URL,
        `status ${apexRedirect?.status}; want 30x redirect`
      )
    );
  }
  const location = apexRedirect?.headers?.location ?? '';
  if (location !== EXPECTED_APEX_LOCATION) {
    failures.push(
      failure(
        'apex-redirect-target',
        apexRedirect?.url ?? APEX_PROBE_URL,
        `location ${location || '<missing>'}; want ${EXPECTED_APEX_LOCATION}`
      )
    );
  }
  return failures;
}

function validateAssets({ idPrefix, ownerUrl, expectedPaths, assets, missingHashedId }) {
  const failures = [];
  const hashedExpectedPaths = expectedPaths.filter((assetPath) =>
    HASHED_ASSET_PATTERN.test(assetPath)
  );
  if (hashedExpectedPaths.length === 0) {
    failures.push(
      failure(
        missingHashedId ?? `${idPrefix}-none-hashed`,
        ownerUrl,
        `no hashed ${expectedPaths.some((path) => path.startsWith('/wild/')) ? '/wild/assets/*' : '/assets/*'} references found`
      )
    );
  }
  if (assets.length !== expectedPaths.length) {
    failures.push(
      failure(
        'asset-count',
        ownerUrl,
        `fetched ${assets.length} assets; expected ${expectedPaths.length}`
      )
    );
  }
  for (const asset of assets) {
    if (asset.error !== undefined) {
      failures.push(failure(`${idPrefix}-fetch-error`, asset.url, asset.error));
      continue;
    }
    if (asset.status !== 200) {
      failures.push(failure(`${idPrefix}-status`, asset.url, `status ${asset.status}; want 200`));
    }
    if (!HASHED_ASSET_PATTERN.test(new URL(asset.url).pathname)) {
      failures.push(
        failure(`${idPrefix}-not-hashed`, asset.url, 'asset filename is not content-hashed')
      );
    }
    const cacheControl = asset.headers?.['cache-control'] ?? '';
    if (!cacheControl.includes('max-age=31536000') || !cacheControl.includes('immutable')) {
      failures.push(
        failure(
          `${idPrefix}-not-immutable`,
          asset.url,
          `cache-control ${cacheControl}; want one-year immutable`
        )
      );
    }
    if (SOURCE_MAP_PATTERN.test(asset.body ?? '')) {
      failures.push(
        failure(`${idPrefix}-source-map-reference`, asset.url, 'asset references a source map')
      );
    }
  }
  return failures;
}

function validateWild(wild) {
  if (wild?.error !== undefined) {
    return [failure('wild-fetch-error', wild.url ?? WILD_ROUTE_URL, wild.error)];
  }
  const failures = [];
  if (wild?.url !== WILD_ROUTE_URL) {
    failures.push(
      failure(
        'wild-route-url',
        wild?.url ?? '<missing>',
        `want same-origin route ${WILD_ROUTE_URL}`
      )
    );
  }
  if (wild?.status !== 200) {
    failures.push(
      failure('wild-status', wild?.url ?? WILD_ROUTE_URL, `status ${wild?.status}; want 200`)
    );
  }
  if (!/^text\/html\b/i.test(wild?.headers?.['content-type'] ?? '')) {
    failures.push(
      failure(
        'wild-content-type',
        wild?.url ?? WILD_ROUTE_URL,
        `content-type ${wild?.headers?.['content-type'] ?? '<missing>'}; want text/html`
      )
    );
  }
  if (!/Wild Haggis Survivors/i.test(wild?.body ?? '')) {
    failures.push(
      failure('wild-html-marker', wild?.url ?? WILD_ROUTE_URL, 'missing WHS HTML marker')
    );
  }
  failures.push(
    ...validateRequiredHeaders('wild', wild?.url ?? WILD_ROUTE_URL, wild?.headers ?? {})
  );
  return failures;
}

function validateVersion(version) {
  if (version?.error !== undefined) {
    return [failure('version-fetch-error', version.url ?? VERSION_URL, version.error)];
  }
  const failures = [];
  if (version?.status !== 200) {
    failures.push(
      failure('version-status', version?.url ?? VERSION_URL, `status ${version?.status}; want 200`)
    );
  }
  if (!/^application\/json\b/i.test(version?.headers?.['content-type'] ?? '')) {
    failures.push(
      failure(
        'version-content-type',
        version?.url ?? VERSION_URL,
        `content-type ${version?.headers?.['content-type'] ?? '<missing>'}; want application/json`
      )
    );
  }
  const cacheControl = version?.headers?.['cache-control'] ?? '';
  if (!cacheControl.includes('max-age=0') || !cacheControl.includes('must-revalidate')) {
    failures.push(
      failure(
        'version-cache-control',
        version?.url ?? VERSION_URL,
        `cache-control ${cacheControl}; want max-age=0, must-revalidate`
      )
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(version?.body ?? '');
  } catch (error) {
    failures.push(
      failure('version-json', version?.url ?? VERSION_URL, `invalid JSON: ${error.message}`)
    );
    return failures;
  }

  if (manifest.schema !== 1) {
    failures.push(
      failure('version-schema', version?.url ?? VERSION_URL, `schema ${manifest.schema}; want 1`)
    );
  }
  if (Number.isNaN(Date.parse(manifest.generatedAt ?? ''))) {
    failures.push(
      failure(
        'version-generated-at',
        version?.url ?? VERSION_URL,
        'generatedAt is not an ISO timestamp'
      )
    );
  }
  if (manifest.hub?.packageName !== 'ha-ggis-hub') {
    failures.push(
      failure(
        'version-hub-name',
        version?.url ?? VERSION_URL,
        'hub.packageName must be ha-ggis-hub'
      )
    );
  }
  if (!SHA_1_PATTERN.test(manifest.hub?.git?.commit ?? '')) {
    failures.push(
      failure(
        'version-hub-commit',
        version?.url ?? VERSION_URL,
        'hub.git.commit must be a 40-hex git SHA'
      )
    );
  }
  if (typeof manifest.hub?.git?.dirty !== 'boolean') {
    failures.push(
      failure('version-hub-dirty', version?.url ?? VERSION_URL, 'hub.git.dirty must be boolean')
    );
  }
  if (manifest.wildHaggisSurvivors?.route !== '/wild/') {
    failures.push(
      failure('version-whs-route', version?.url ?? VERSION_URL, 'WHS route must be /wild/')
    );
  }
  if (!SHA_1_PATTERN.test(manifest.wildHaggisSurvivors?.source?.commit ?? '')) {
    failures.push(
      failure(
        'version-whs-commit',
        version?.url ?? VERSION_URL,
        'wildHaggisSurvivors.source.commit must be a 40-hex git SHA'
      )
    );
  }
  if (typeof manifest.wildHaggisSurvivors?.source?.dirty !== 'boolean') {
    failures.push(
      failure(
        'version-whs-dirty',
        version?.url ?? VERSION_URL,
        'wildHaggisSurvivors.source.dirty must be boolean'
      )
    );
  }
  if (manifest.wildHaggisSurvivors?.build?.mounted !== true) {
    failures.push(
      failure(
        'version-whs-build',
        version?.url ?? VERSION_URL,
        'WHS mounted build provenance missing'
      )
    );
  }
  if (
    !Number.isInteger(manifest.wildHaggisSurvivors?.build?.assetCount) ||
    manifest.wildHaggisSurvivors.build.assetCount < 1
  ) {
    failures.push(
      failure(
        'version-whs-asset-count',
        version?.url ?? VERSION_URL,
        'WHS assetCount must be positive'
      )
    );
  }
  if (!SHA_256_PATTERN.test(manifest.wildHaggisSurvivors?.build?.fingerprint ?? '')) {
    failures.push(
      failure(
        'version-whs-fingerprint',
        version?.url ?? VERSION_URL,
        'WHS build fingerprint must be sha256'
      )
    );
  }
  if (!SHA_256_PATTERN.test(manifest.wildHaggisSurvivors?.build?.indexSha256 ?? '')) {
    failures.push(
      failure(
        'version-whs-index-sha',
        version?.url ?? VERSION_URL,
        'WHS indexSha256 must be sha256'
      )
    );
  }
  return failures;
}

function failure(id, url, detail) {
  return { id, url, detail };
}

export async function runProductionProbe() {
  const hub = await fetchText(HUB_URL, { redirect: 'follow' });
  const apexRedirect = await fetchText(APEX_PROBE_URL, { redirect: 'manual' });
  const wild = await fetchText(WILD_ROUTE_URL, { redirect: 'follow' });
  const version = await fetchText(VERSION_URL, { redirect: 'follow' });
  const assets = [];
  if (hub.error === undefined) {
    for (const assetPath of extractAssetPaths(hub.body).filter((path) =>
      path.startsWith('/assets/')
    )) {
      assets.push(await fetchText(new URL(assetPath, HUB_URL).href, { redirect: 'follow' }));
    }
  }
  const wildAssets = [];
  if (wild.error === undefined) {
    for (const assetPath of extractAssetPaths(wild.body).filter((path) =>
      path.startsWith('/wild/assets/')
    )) {
      wildAssets.push(await fetchText(new URL(assetPath, HUB_URL).href, { redirect: 'follow' }));
    }
  }
  return { hub, apexRedirect, assets, wild, wildAssets, version };
}

async function fetchText(url, init) {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs()),
    });
    return {
      url,
      status: response.status,
      headers: lowerCaseHeaders(response.headers),
      body: await response.text(),
    };
  } catch (error) {
    return {
      url,
      error:
        error.cause?.code !== undefined
          ? `${error.cause.code}: ${error.cause.hostname ?? url}`
          : error.message,
    };
  }
}

function timeoutMs() {
  const raw = Number.parseInt(process.env.HAGGIS_PRODUCTION_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function lowerCaseHeaders(headers) {
  return Object.fromEntries(
    [...headers.entries()].map(([name, value]) => [name.toLowerCase(), value])
  );
}

async function main() {
  const probe = await runProductionProbe();
  const failures = collectProductionProbeFailures(probe);
  if (failures.length > 0) {
    console.error(
      `production-check FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'})`
    );
    for (const productionFailure of failures) {
      console.error(
        `- [${productionFailure.id}] ${productionFailure.url} — ${productionFailure.detail}`
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    'production-check OK — ha.ggis.xyz, ggis.xyz redirect, headers/CSP, immutable assets, /wild/, and /__version verified'
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
