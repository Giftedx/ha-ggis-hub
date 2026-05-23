// Build dist, start vite preview, run smoke-visual-gate.mjs, tear
// down. Mirrors run-determinism-smoke.mjs so the haggis-eval `visual`
// gate stays a thin shell-out wrapper.
//
// Default mode is verify; pass `capture` to bootstrap or re-baseline.
//
// Exit 0: gate passed (or capture wrote new goldens).
// Exit 1: drift detected, page errored, or build failed.

import { spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';

const PORT = process.env.HAGGIS_SMOKE_PORT ?? '4175';
const BASE = `http://localhost:${PORT}/`;
const SMOKE = 'scripts/smoke-visual-gate.mjs';
const MODE = (process.argv[2] ?? 'verify').toLowerCase();

function log(...args) {
  console.log('[run-visual-gate]', ...args);
}

function buildDist() {
  log('building dist…');
  const r = spawnSync('pnpm', ['run', 'build'], { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    log('build failed; aborting');
    process.exit(1);
  }
}

function waitForPort(url, timeoutMs) {
  return new Promise((resolveOk, rejectOk) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const req = request(url, { method: 'HEAD' }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolveOk();
        else if (Date.now() > deadline) rejectOk(new Error(`bad status ${res.statusCode}`));
        else setTimeout(attempt, 200);
      });
      req.on('error', () => {
        if (Date.now() > deadline) rejectOk(new Error('timeout'));
        else setTimeout(attempt, 200);
      });
      req.end();
    };
    attempt();
  });
}

buildDist();

log(`starting preview on :${PORT}…`);
const preview = spawn('pnpm', ['exec', 'vite', 'preview', '--port', PORT, '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});

const previewOut = [];
preview.stdout.on('data', (b) => previewOut.push(b.toString()));
preview.stderr.on('data', (b) => previewOut.push(b.toString()));

let failed = false;
try {
  await waitForPort(BASE, 8000);
  log(`preview ready at ${BASE}`);

  const result = spawnSync('node', [SMOKE, MODE], {
    stdio: 'inherit',
    env: { ...process.env, SCREENSHOT_URL: BASE }
  });
  if (result.status !== 0) {
    failed = true;
  }
} catch (err) {
  log('preview never came up:', err.message);
  log('preview output:');
  console.log(previewOut.join(''));
  failed = true;
} finally {
  preview.kill();
}

process.exit(failed ? 1 : 0);
