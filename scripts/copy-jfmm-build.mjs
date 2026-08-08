// Mount Just Five More Minutes under the hub's dist/just-five-more-minutes/.
//
// Built with `npm run build:hub` (Vite base `/just-five-more-minutes/`), then
// copied verbatim into ha-ggis-hub/dist/just-five-more-minutes/ so the single
// Cloudflare Pages project serves ha.ggis.xyz/just-five-more-minutes/.

import { cp, rm, access, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GAME_MOUNTS } from './game-mounts.mjs';

const hubRoot = resolve(process.cwd());
const mount = GAME_MOUNTS.find(({ id }) => id === 'just-five-more-minutes');
if (mount === undefined) {
  throw new Error('GAME_MOUNTS has no Just Five More Minutes entry.');
}
const jfmmDist = resolve(hubRoot, mount.sourceDir, 'dist');
const dest = resolve(hubRoot, 'dist', mount.distDir);

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
  if (!(await exists(join(jfmmDist, 'index.html')))) {
    console.error(
      `[copy-jfmm] build not found at ${jfmmDist}.\n` +
        `Build it first: \`${mount.buildCommand}\` ` +
        `(or run \`pnpm run build:all\`, which does both).`
    );
    process.exit(1);
  }

  await rm(dest, { recursive: true, force: true });
  await cp(jfmmDist, dest, {
    recursive: true,
    filter: (src) => {
      const rel = src.slice(jfmmDist.length + 1);
      return !DROP_AT_ROOT.has(rel);
    },
  });

  const top = await readdir(dest);
  console.log(
    `[copy-jfmm] mounted Just Five More Minutes at dist/${mount.distDir}/ (${top.length} top-level entries: ${top.join(', ')})`
  );
}

main().catch((err) => {
  console.error('[copy-jfmm] failed:', err);
  process.exit(1);
});
