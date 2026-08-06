import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PACKAGE_JSON_PATH = resolve(__dirname, '..', 'package.json');
const PNPM_ORCHESTRATORS = [
  'run-a11y-gate.mjs',
  'run-browser-smokes.mjs',
  'run-determinism-smoke.mjs',
  'run-paint-gate.mjs',
  'run-soak-gate.mjs',
  'run-visual-gate.mjs',
];

describe('package manager script hygiene', () => {
  const manifest = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as {
    scripts?: Record<string, string>;
  };

  it('does not call bare nested pnpm run commands from package scripts', () => {
    const offenders = Object.entries(manifest.scripts ?? {})
      .filter(([, script]) => /\bpnpm\s+run\b/.test(script))
      .map(([name]) => name);

    expect(offenders).toEqual([]);
  });

  it('routes Node gate orchestrators through the pinned pnpm helper', () => {
    const offenders = PNPM_ORCHESTRATORS.filter((file) => {
      const source = readFileSync(resolve(__dirname, file), 'utf8');
      return (
        !source.includes("from './pinned-pnpm.mjs'") ||
        /\bPNPM\s*=\s*['"]pnpm['"]/.test(source) ||
        /shell:\s*true/.test(source)
      );
    });

    expect(offenders).toEqual([]);
  });

  it('keeps the mounted-game build entry points and uses one copier', () => {
    expect(manifest.scripts).toMatchObject({
      'build:whs': 'npm --prefix ../wild-haggis-survivors run build',
      'copy:whs': 'node scripts/copy-game-build.mjs wild-haggis-survivors',
      'build:jfmm': 'npm --prefix ../../experiments/just-five-more-minutes run build:hub',
      'copy:jfmm': 'node scripts/copy-game-build.mjs just-five-more-minutes',
    });
  });
});
