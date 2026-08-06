import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const COPIER_PATH = resolve(__dirname, 'copy-game-build.mjs');

let tempRoot: string | undefined;

afterEach(async () => {
  if (tempRoot !== undefined) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

describe('copy-game-build', () => {
  it('copies a mounted game and drops only root deploy files', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'copy-game-build-'));
    const hubRoot = join(tempRoot, 'workspace', 'hub');
    const sourceDist = join(tempRoot, 'workspace', 'wild-haggis-survivors', 'dist');

    await mkdir(join(sourceDist, 'nested'), { recursive: true });
    await mkdir(hubRoot, { recursive: true });
    await Promise.all([
      writeFile(join(sourceDist, 'index.html'), '<h1>Wild Haggis Survivors</h1>'),
      writeFile(join(sourceDist, 'game.js'), 'console.log("game");'),
      writeFile(join(sourceDist, '_headers'), 'root headers'),
      writeFile(join(sourceDist, '_redirects'), 'root redirects'),
      writeFile(join(sourceDist, 'nested', '_headers'), 'nested headers'),
    ]);

    const result = spawnSync(process.execPath, [COPIER_PATH, 'wild-haggis-survivors'], {
      cwd: hubRoot,
      encoding: 'utf8',
    });

    expect(result.status, result.stderr).toBe(0);
    const destination = join(hubRoot, 'dist', 'wild');
    await expect(readFile(join(destination, 'index.html'), 'utf8')).resolves.toBe(
      '<h1>Wild Haggis Survivors</h1>'
    );
    await expect(readFile(join(destination, 'game.js'), 'utf8')).resolves.toBe(
      'console.log("game");'
    );
    await expect(readFile(join(destination, '_headers'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(destination, '_redirects'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(destination, 'nested', '_headers'), 'utf8')).resolves.toBe(
      'nested headers'
    );
  });

  it('reports the mount build command when index.html is missing', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'copy-game-build-'));
    const hubRoot = join(tempRoot, 'workspace', 'hub');
    const sourceDist = join(tempRoot, 'experiments', 'just-five-more-minutes', 'dist');

    await mkdir(hubRoot, { recursive: true });
    await mkdir(sourceDist, { recursive: true });

    const result = spawnSync(process.execPath, [COPIER_PATH, 'just-five-more-minutes'], {
      cwd: hubRoot,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'npm --prefix ../../experiments/just-five-more-minutes run build:hub'
    );
  });
});
