// Mount the Wild Haggis Survivors build under the hub's dist/wild/.
//
// WHS is a sibling repo built with Vite `base: '/wild/'`, so its emitted
// asset/manifest/SW URLs are already /wild/-rooted. We copy its dist/ verbatim
// into ha-ggis-hub/dist/wild/ so the single Cloudflare Pages project serves
// ha.ggis.xyz/wild from the same deploy (ADR-0003 Option B).
//
// Run AFTER both builds: `pnpm run build:all` orchestrates
//   hub build -> WHS build (build:whs) -> this copy.
//
// WHS's own dist/_headers is dropped: only the hub's root /_headers and
// /_redirects are read by Cloudflare Pages; a nested copy is dead weight and
// invites confusion about which file is authoritative.

import { cp, rm, access, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const hubRoot = resolve(process.cwd());
const whsDist = resolve(hubRoot, '..', 'wild-haggis-survivors', 'dist');
const dest = resolve(hubRoot, 'dist', 'wild');

const DROP_AT_ROOT = new Set(['_headers', '_redirects']);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(join(whsDist, 'index.html')))) {
    console.error(
      `[copy-whs] WHS build not found at ${whsDist}.\n` +
        `Build it first: \`npm --prefix ../wild-haggis-survivors run build\` ` +
        `(or run \`pnpm run build:all\`, which does both).`
    );
    process.exit(1);
  }

  await rm(dest, { recursive: true, force: true });
  await cp(whsDist, dest, {
    recursive: true,
    filter: (src) => {
      // Only the two top-level deploy files are dropped; everything else
      // (including nested files that happen to share the name) is copied.
      const rel = src.slice(whsDist.length + 1);
      return !DROP_AT_ROOT.has(rel);
    },
  });

  const top = await readdir(dest);
  console.log(
    `[copy-whs] mounted WHS at dist/wild/ (${top.length} top-level entries: ${top.join(', ')})`
  );
}

main().catch((err) => {
  console.error('[copy-whs] failed:', err);
  process.exit(1);
});
