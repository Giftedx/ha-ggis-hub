// Per-asset bundle-size gate. Reads dist/assets/ + asserts each
// asset stem stays within its budget from perf-budgets.json. Also
// asserts the all-assets total. Run after `pnpm build`.
//
// This is the bottom half of the slice 9 `perf` gate; the Lighthouse
// half is still outstanding (needs a live preview + chrome-headless
// + the lighthouse npm dep). Bundle sizes are the highest-impact-per-
// effort signal: regressions are immediate, easy to diff, and the
// failure mode is small enough to fix in a single PR.

import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const config = JSON.parse(readFileSync(resolve(root, 'perf-budgets.json'), 'utf8'));

if (!existsSync(dist)) {
  console.error('perf-budgets FAIL: dist/ missing — run `pnpm build` first');
  process.exit(1);
}

const assetsDir = join(dist, 'assets');
if (!existsSync(assetsDir)) {
  console.error('perf-budgets FAIL: dist/assets/ missing');
  process.exit(1);
}

const assets = readdirSync(assetsDir);
const errors = [];
let allTotal = 0;

for (const entry of config.per_stem) {
  const { stem, extensions, max_bytes, note } = entry;
  let stemTotal = 0;
  const matched = [];
  for (const file of assets) {
    const ext = file.split('.').pop();
    if (!extensions.includes(ext)) continue;
    if (!file.startsWith(stem + '-') && file !== `${stem}.${ext}`) continue;
    const size = statSync(join(assetsDir, file)).size;
    stemTotal += size;
    matched.push(`${file} (${size}B)`);
  }
  const pct = max_bytes > 0 ? Math.round((stemTotal / max_bytes) * 100) : 0;
  console.log(`[${stem}] ${stemTotal} / ${max_bytes} B (${pct}%) — ${matched.join(', ') || '(none matched)'}`);
  if (stemTotal > max_bytes) {
    errors.push(`stem "${stem}" total ${stemTotal} B exceeds budget ${max_bytes} B (${note ?? ''})`);
  }
  if (matched.length === 0) {
    errors.push(`stem "${stem}" matched no assets — config drift, expected files starting with "${stem}-"`);
  }
}

for (const file of assets) {
  allTotal += statSync(join(assetsDir, file)).size;
}
const totalMax = config.totals.all_assets_max_bytes;
const totalPct = totalMax > 0 ? Math.round((allTotal / totalMax) * 100) : 0;
console.log(`[total] ${allTotal} / ${totalMax} B (${totalPct}%) across ${assets.length} files`);
if (allTotal > totalMax) {
  errors.push(`total assets ${allTotal} B exceeds budget ${totalMax} B`);
}

if (errors.length > 0) {
  console.error('perf-budgets FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log('perf-budgets OK');
