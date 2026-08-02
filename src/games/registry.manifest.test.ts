import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HUB_GAME_REGISTRY, type HubGameDefinition } from './registry';

const DOORS_MANIFEST_PATH = resolve(__dirname, '..', '..', 'room', 'doors.manifest');
const MISMATCHED_DOORS_MANIFEST = `wild-haggis-survivors|820|420|940|580|true|playable|Wild Haggis Survivor|route|/wild/
just-five-more-minutes|80|420|200|580|true|playable|Just Five More Minutes|route|/just-five-more-minutes/
future-bothy|410|80|590|240|false|coming-soon|Comin' Wi' The Next Moon|none|
`;

function compareDoorsManifestToRegistry(
  manifest: string,
  registry: readonly HubGameDefinition[]
): string[] {
  const lines = manifest.split(/\r?\n/).filter((line) => line.length > 0);
  const errors: string[] = [];

  if (lines.length !== registry.length) {
    errors.push(`Manifest has ${lines.length} doors; registry has ${registry.length}`);
  }

  for (const [index, line] of lines.entries()) {
    const game = registry[index];
    if (game === undefined) {
      break;
    }

    const fields = line.split('|');
    if (fields.length !== 10) {
      errors.push(`Manifest door ${index} has ${fields.length} fields; expected 10`);
      continue;
    }

    const expectedTarget = game.launch.kind === 'none' ? '' : game.launch.target;
    const comparisons = [
      ['id', fields[0], game.id],
      ['status', fields[6], game.status],
      ['title', fields[7], game.title],
      ['launch_kind', fields[8], game.launch.kind],
      ['launch_target', fields[9], expectedTarget],
    ] as const;

    for (const [field, actual, expected] of comparisons) {
      if (actual !== expected) {
        errors.push(
          `Manifest door ${index} ${field} is ${JSON.stringify(actual)}; registry has ${JSON.stringify(expected)}`
        );
      }
    }
  }

  return errors;
}

describe('room/doors.manifest registry coherence', () => {
  it('matches registry id, order, status, title, launch kind, and launch target', () => {
    const manifest = readFileSync(DOORS_MANIFEST_PATH, 'utf8');

    expect(compareDoorsManifestToRegistry(manifest, HUB_GAME_REGISTRY)).toEqual([]);
  });

  it('reports a field mismatch', () => {
    expect(
      compareDoorsManifestToRegistry(MISMATCHED_DOORS_MANIFEST, HUB_GAME_REGISTRY)
    ).not.toEqual([]);
  });
});
