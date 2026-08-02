import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const VERIFY_DIST_PATH = resolve(__dirname, 'verify-dist.mjs');
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('verify-dist --require-mounted', () => {
  it('fails when either mounted game index is missing', () => {
    const root = writeDistFixture({ mounted: true, mountIndexes: false });

    const result = runVerifyDist(root, '--require-mounted');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('dist/wild/index.html missing');
    expect(result.stderr).toContain('dist/just-five-more-minutes/index.html missing');
  });

  it('fails when either mounted-game manifest flag is false', () => {
    const root = writeDistFixture({ mounted: false, mountIndexes: true });

    const result = runVerifyDist(root, '--require-mounted');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('wildHaggisSurvivors.build.mounted must be true');
    expect(result.stderr).toContain('justFiveMoreMinutes.build.mounted must be true');
  });

  it('passes when both mounted-game indexes and manifest flags are present', () => {
    const root = writeDistFixture({ mounted: true, mountIndexes: true });

    const result = runVerifyDist(root, '--require-mounted');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('verify-dist OK');
  });
});

function runVerifyDist(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [VERIFY_DIST_PATH, ...args], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
}

function writeDistFixture({
  mounted,
  mountIndexes,
}: {
  mounted: boolean;
  mountIndexes: boolean;
}): string {
  const root = mkdtempSync(join(tmpdir(), 'haggis-verify-dist-'));
  temporaryRoots.push(root);
  const dist = join(root, 'dist');
  const assets = join(dist, 'assets');
  mkdirSync(assets, { recursive: true });

  writeFileSync(join(dist, '_redirects'), '/*  /index.html  200\n');
  writeFileSync(
    join(dist, '_headers'),
    "/*\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'\n  Strict-Transport-Security: max-age=31536000\n\n/__version\n  Content-Type: application/json; charset=utf-8\n  Cache-Control: public, max-age=0, must-revalidate\n"
  );
  writeFileSync(
    join(dist, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"></head></html>'
  );
  writeFileSync(join(dist, 'favicon.svg'), '<svg></svg>');
  writeFileSync(join(dist, 'favicon.png'), 'png');
  writeFileSync(join(dist, 'og.png'), 'png');
  writeFileSync(join(dist, 'manifest.webmanifest'), '{}');
  writeFileSync(join(assets, 'index-12345678.js'), 'export {};');
  writeFileSync(join(assets, 'hub-12345678.wasm'), 'wasm');

  if (mountIndexes) {
    for (const mount of ['wild', 'just-five-more-minutes']) {
      mkdirSync(join(dist, mount), { recursive: true });
      writeFileSync(join(dist, mount, 'index.html'), '<!doctype html>');
    }
  }

  writeFileSync(
    join(dist, '__version'),
    JSON.stringify({
      schema: 1,
      generatedAt: '2026-08-01T00:00:00.000Z',
      hub: {
        git: {
          commit: '0123456789abcdef0123456789abcdef01234567',
          dirty: false,
        },
      },
      wildHaggisSurvivors: {
        route: '/wild/',
        build: { mounted },
      },
      justFiveMoreMinutes: {
        route: '/just-five-more-minutes/',
        build: { mounted },
      },
    })
  );

  return root;
}
