import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnPnpmSync } from './pinned-pnpm.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = process.argv.slice(2);

if (scripts.length === 0) {
  console.error('run-pnpm-sequence: expected at least one package script name');
  process.exit(2);
}

for (const script of scripts) {
  const result = spawnPnpmSync(['run', script], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`run-pnpm-sequence: could not run ${script}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
