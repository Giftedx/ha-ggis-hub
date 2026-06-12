import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

interface GitState {
  available: boolean;
  path: string;
  commit: string | null;
  shortCommit: string | null;
  branch: string | null;
  dirty: boolean | null;
  dirtyFiles: string[];
  error?: string;
}

interface BuildSummary {
  mounted: boolean;
  assetCount: number;
  fingerprint: string | null;
  indexSha256: string | null;
  error?: string;
}

interface VersionModule {
  buildVersionManifest: (input: {
    generatedAt: string;
    packageJson: { name: string; version: string };
    hubGit: GitState;
    whsGit: GitState;
    whsBuild: BuildSummary;
  }) => unknown;
  summarizeDirtyFiles: (porcelain: string) => string[];
  writeVersionManifest: (path: string, manifest: unknown) => Promise<void>;
}

const versionModule = (await import(
  new URL('./write-version-manifest.mjs', import.meta.url).href
)) as VersionModule;
const { buildVersionManifest, summarizeDirtyFiles, writeVersionManifest } = versionModule;

const cleanHubGit: GitState = {
  available: true,
  path: '.',
  commit: '0123456789abcdef0123456789abcdef01234567',
  shortCommit: '0123456',
  branch: 'main',
  dirty: false,
  dirtyFiles: [],
};

const dirtyWhsGit: GitState = {
  available: true,
  path: '../wild-haggis-survivors',
  commit: 'fedcba9876543210fedcba9876543210fedcba98',
  shortCommit: 'fedcba9',
  branch: 'main',
  dirty: true,
  dirtyFiles: ['M src/game.ts', '?? notes.txt'],
};

const mountedWhsBuild: BuildSummary = {
  mounted: true,
  assetCount: 3,
  fingerprint: 'a'.repeat(64),
  indexSha256: 'b'.repeat(64),
};

describe('summarizeDirtyFiles', () => {
  it('keeps porcelain dirty-state evidence compact and stable', () => {
    expect(summarizeDirtyFiles(' M src/game.ts\n?? notes.txt\n')).toEqual([
      'M src/game.ts',
      '?? notes.txt',
    ]);
  });

  it('returns an empty list for a clean worktree', () => {
    expect(summarizeDirtyFiles('\n')).toEqual([]);
  });
});

describe('buildVersionManifest', () => {
  it('records build-time hub commit and mounted WHS source/build provenance', () => {
    const manifest = buildVersionManifest({
      generatedAt: '2026-06-12T00:00:00.000Z',
      packageJson: { name: 'ha-ggis-hub', version: '0.2.4' },
      hubGit: cleanHubGit,
      whsGit: dirtyWhsGit,
      whsBuild: mountedWhsBuild,
    });

    expect(manifest).toEqual({
      schema: 1,
      generatedAt: '2026-06-12T00:00:00.000Z',
      hub: {
        packageName: 'ha-ggis-hub',
        packageVersion: '0.2.4',
        git: {
          available: true,
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
          path: '../wild-haggis-survivors',
          commit: 'fedcba9876543210fedcba9876543210fedcba98',
          shortCommit: 'fedcba9',
          branch: 'main',
          dirty: true,
          dirtyFiles: ['M src/game.ts', '?? notes.txt'],
        },
        build: {
          mounted: true,
          assetCount: 3,
          fingerprint: 'a'.repeat(64),
          indexSha256: 'b'.repeat(64),
        },
      },
    });
  });

  it('records unavailable WHS source explicitly instead of guessing from hub assets', () => {
    const manifest = buildVersionManifest({
      generatedAt: '2026-06-12T00:00:00.000Z',
      packageJson: { name: 'ha-ggis-hub', version: '0.2.4' },
      hubGit: cleanHubGit,
      whsGit: {
        available: false,
        path: '../wild-haggis-survivors',
        commit: null,
        shortCommit: null,
        branch: null,
        dirty: null,
        dirtyFiles: [],
        error: 'not a git checkout',
      },
      whsBuild: {
        mounted: false,
        assetCount: 0,
        fingerprint: null,
        indexSha256: null,
        error: 'dist/wild/index.html missing',
      },
    });

    expect(manifest).toMatchObject({
      wildHaggisSurvivors: {
        source: {
          present: false,
          error: 'not a git checkout',
        },
        build: {
          mounted: false,
          error: 'dist/wild/index.html missing',
        },
      },
    });
  });
});

describe('writeVersionManifest', () => {
  it('writes endpoint-safe pretty JSON with a trailing newline', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'haggis-version-'));
    try {
      const target = join(dir, '__version');
      await writeVersionManifest(target, { schema: 1, hub: { packageName: 'ha-ggis-hub' } });

      const body = await readFile(target, 'utf8');
      expect(body.endsWith('\n')).toBe(true);
      expect(JSON.parse(body)).toEqual({ schema: 1, hub: { packageName: 'ha-ggis-hub' } });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
