import { access, cp, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GAME_MOUNTS } from './game-mounts.mjs';

const DROP_AT_ROOT = new Set(['_headers', '_redirects']);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const mountId = process.argv[2];
  const mount = GAME_MOUNTS.find(({ id }) => id === mountId);
  if (mount === undefined) {
    console.error(`[copy-game] unknown mount id: ${mountId ?? '(missing)'}`);
    process.exit(1);
  }

  const hubRoot = resolve(process.cwd());
  const sourceDist = resolve(hubRoot, mount.sourceDir, 'dist');
  const destination = resolve(hubRoot, 'dist', mount.distDir);

  if (!(await exists(join(sourceDist, 'index.html')))) {
    console.error(
      `[copy-game] build not found for ${mount.id} at ${sourceDist}.\n` +
        `Build it first: \`${mount.buildCommand}\` ` +
        `(or run \`pnpm run build:all\`, which builds all mounted games).`
    );
    process.exit(1);
  }

  await rm(destination, { recursive: true, force: true });
  await cp(sourceDist, destination, {
    recursive: true,
    filter: (source) => {
      const relativeSource = source.slice(sourceDist.length + 1);
      return !DROP_AT_ROOT.has(relativeSource);
    },
  });

  const top = await readdir(destination);
  console.log(
    `[copy-game] mounted ${mount.id} at dist/${mount.distDir}/ ` +
      `(${top.length} top-level entries: ${top.join(', ')})`
  );
}

main().catch((error) => {
  console.error('[copy-game] failed:', error);
  process.exit(1);
});
