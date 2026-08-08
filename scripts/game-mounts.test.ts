import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error: implicit any for JS module
import { GAME_MOUNTS } from './game-mounts.mjs';
import { HUB_GAME_REGISTRY, GAME_ID_PATTERN } from '../src/games/registry.js';

interface GameMount {
  id: string;
  route: string;
  sourceDir: string;
  distDir: string;
  buildCommand: string;
  copyStep: string;
}

const MOUNTS = GAME_MOUNTS as GameMount[];
const packageJson = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const packageScripts = packageJson.scripts ?? {};
const buildAllSteps = packageScripts['build:all']?.split(/\s+/) ?? [];

describe('GAME_MOUNTS manifest', () => {
  it('has a mount for every routed door in the registry', () => {
    const routeGames = HUB_GAME_REGISTRY.filter((g) => g.launch.kind === 'route');

    for (const game of routeGames) {
      if (game.launch.kind !== 'route') continue; // TS narrowing

      const mounts = MOUNTS.filter((m) => m.id === game.id);
      expect(mounts.length, `Registry entry ${game.id} must have exactly one mount`).toBe(1);

      const mount = mounts[0];
      expect(mount?.route).toBe(game.launch.target);
      expect(mount?.distDir).toBe(game.launch.target.replace(/\//g, ''));
    }
  });

  it('has unique and valid ids', () => {
    const ids = new Set<string>();
    for (const mount of MOUNTS) {
      expect(ids.has(mount.id), `Duplicate mount id: ${mount.id}`).toBe(false);
      ids.add(mount.id);
      expect(GAME_ID_PATTERN.test(mount.id), `Invalid mount id: ${mount.id}`).toBe(true);
    }
  });

  it('does not have mounts without a corresponding registry entry', () => {
    for (const mount of MOUNTS) {
      const registryEntry = HUB_GAME_REGISTRY.find((g) => g.id === mount.id);
      expect(registryEntry, `Mount ${mount.id} has no corresponding registry entry`).toBeDefined();
    }
  });

  it('runs each mount build in build:all', () => {
    for (const mount of MOUNTS) {
      const buildSteps = Object.entries(packageScripts).filter(
        ([name, command]) => name.startsWith('build:') && command === mount.buildCommand
      );
      expect.soft(buildSteps.length, `${mount.id} needs one package build step`).toBe(1);

      const buildStep = buildSteps[0]?.[0];
      if (buildStep !== undefined) {
        expect.soft(buildAllSteps, `build:all must run ${buildStep}`).toContain(buildStep);
      }
    }
  });

  it('runs each mount copy step in build:all', () => {
    for (const mount of MOUNTS) {
      expect.soft(mount.copyStep, `${mount.id} is missing a copy step`).toBeTypeOf('string');
      expect
        .soft(packageScripts[mount.copyStep], `Missing package script ${mount.copyStep}`)
        .toBeTypeOf('string');
      expect.soft(buildAllSteps, `build:all must run ${mount.copyStep}`).toContain(mount.copyStep);
    }
  });
});
