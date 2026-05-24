// Visual gate — perceptual screenshot diff. The eye-gate the project
// has been missing: every other gate (typecheck, test, build, perf,
// determinism, security) verifies mechanism; this one verifies what
// the visitor actually SEES.
//
// Approach: capture the playfield canvas at a deterministic seed,
// resize to 16x16 grayscale via sharp, compute a 256-bit average-hash
// (aHash) per scene, compare against the recorded golden hash in
// tests/golden/visual-budgets.json via Hamming distance. Threshold is
// per-scene; default 18 / 256 (~7%) absorbs the per-frame variance
// from particle animation + flicker without missing real layout
// drift.
//
// Modes:
//   capture  — take screenshot, save golden PNG + hash. Use when
//              intentionally accepting a new visual state.
//   verify   — take screenshot, compute hash, fail if Hamming over
//              threshold. Default mode.
//
// Usage (requires `vite preview` running on the configured port):
//   node scripts/smoke-visual-gate.mjs verify
//   node scripts/smoke-visual-gate.mjs capture
//
// Or via the run-visual-gate.mjs harness which builds + previews +
// runs + tears down. Pair that into haggis-eval as a future `visual`
// subcommand.

import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const GOLDEN_DIR = resolve(REPO_ROOT, 'tests', 'golden');
const BUDGET_FILE = resolve(GOLDEN_DIR, 'visual-budgets.json');

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/';
const MODE = (process.argv[2] ?? 'verify').toLowerCase();

// Scene specs — each describes a deterministic capture. Add scenes
// here as the surface grows. Seed is forwarded as ?seed=N which the
// host uses for the WASM boundary's PRNG so each visit reproduces.
const SCENES = [
  {
    name: 'bothy-idle-seed-42',
    seed: 42,
    viewport: { width: 960, height: 540 },
    // Wait for boundary boot + a couple of render frames to settle.
    settleMs: 1200,
    // Hamming-distance tolerance against the golden hash, out of 256
    // bits. Used as the default at capture time; verify mode reads the
    // per-scene tolerance from visual-budgets.json. Bootstrap default
    // sits at 8 — see visual-budgets.json _comment for the 2026-05-24
    // calibration that sourced this from 4 consecutive Linux CI runs
    // (stable 3-bit drift against the Windows-captured golden).
    toleranceBits: 8
  }
];

function log(...args) {
  console.log('[smoke-visual-gate]', ...args);
}

if (MODE !== 'capture' && MODE !== 'verify') {
  console.error(`unknown mode '${MODE}'; use capture or verify`);
  process.exit(2);
}

mkdirSync(GOLDEN_DIR, { recursive: true });

// Load existing budgets or seed a fresh file.
let budgets = { schema: 1, scenes: {} };
if (existsSync(BUDGET_FILE)) {
  try {
    budgets = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
  } catch (err) {
    log('failed to parse existing visual-budgets.json — rewriting fresh');
    budgets = { schema: 1, scenes: {} };
  }
}

// Compute aHash from a sharp Buffer:
//   1. resize to 16x16 grayscale (raw pixel array)
//   2. compute mean intensity
//   3. each pixel > mean -> bit 1, else bit 0
//   4. assemble 256-bit hash as 64-char hex
async function ahashFromPngBytes(pngBytes) {
  const { data } = await sharp(pngBytes)
    .resize(16, 16, { fit: 'fill', kernel: 'lanczos3' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // data is 256 bytes, each is the gray pixel value 0..255.
  let sum = 0;
  for (const v of data) sum += v;
  const mean = sum / data.length;

  // Build 32 bytes = 256 bits. Bit i (within byte) corresponds to
  // pixel (byteIdx*8 + bitIdx) in row-major order.
  const hashBytes = Buffer.alloc(32, 0);
  for (let i = 0; i < 256; i += 1) {
    if (data[i] > mean) {
      const byteIdx = i >> 3;
      const bitIdx = i & 7;
      hashBytes[byteIdx] |= (1 << bitIdx);
    }
  }
  return hashBytes.toString('hex');
}

function hammingDistanceHex(aHex, bHex) {
  if (aHex.length !== bHex.length) {
    throw new Error(`hash length mismatch: ${aHex.length} vs ${bHex.length}`);
  }
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    let diff = a[i] ^ b[i];
    while (diff !== 0) {
      distance += diff & 1;
      diff >>>= 1;
    }
  }
  return distance;
}

async function captureScene(page, scene) {
  await page.setViewportSize(scene.viewport);
  const url = `${URL_BASE}?seed=${scene.seed}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(scene.settleMs);
  // Capture the canvas element specifically, not the page chrome.
  // Falls back to a full screenshot if the canvas isn't found.
  const canvas = await page.$('canvas.scene-canvas');
  const pngBytes = canvas
    ? await canvas.screenshot({ type: 'png' })
    : await page.screenshot({ type: 'png' });
  return pngBytes;
}

const browser = await chromium.launch();
let exitCode = 0;
const report = { mode: MODE, scenes: [] };

try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[ERROR] ${e.message}`));

  for (const scene of SCENES) {
    log(`scene: ${scene.name}`);
    const pngBytes = await captureScene(page, scene);
    const hash = await ahashFromPngBytes(pngBytes);

    if (MODE === 'capture') {
      const pngPath = resolve(GOLDEN_DIR, `${scene.name}.png`);
      writeFileSync(pngPath, pngBytes);
      budgets.scenes[scene.name] = {
        hash,
        toleranceBits: scene.toleranceBits,
        capturedAt: new Date().toISOString()
      };
      log(`  captured: ${pngPath}`);
      log(`  hash:     ${hash}`);
      report.scenes.push({ name: scene.name, mode: 'capture', hash });
      continue;
    }

    // verify mode
    const golden = budgets.scenes[scene.name];
    if (!golden) {
      log(`  no golden hash — run 'capture' first to bootstrap`);
      log(`  current hash: ${hash}`);
      exitCode = 1;
      report.scenes.push({ name: scene.name, mode: 'verify', status: 'no-golden', hash });
      continue;
    }
    const distance = hammingDistanceHex(hash, golden.hash);
    const tolerance = golden.toleranceBits ?? scene.toleranceBits;
    const ok = distance <= tolerance;
    log(`  golden:   ${golden.hash}`);
    log(`  current:  ${hash}`);
    log(`  hamming:  ${distance} / 256 (tolerance ${tolerance})  ${ok ? 'OK' : 'DRIFT'}`);
    report.scenes.push({
      name: scene.name,
      mode: 'verify',
      status: ok ? 'ok' : 'drift',
      hash,
      golden: golden.hash,
      distance,
      tolerance
    });
    if (!ok) exitCode = 1;
  }

  if (errors.length > 0) {
    log('page errors during run:');
    for (const e of errors) log(`  ${e}`);
    exitCode = 1;
  }

  if (MODE === 'capture') {
    writeFileSync(BUDGET_FILE, JSON.stringify(budgets, null, 2) + '\n');
    log(`wrote ${BUDGET_FILE}`);
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
process.exit(exitCode);
