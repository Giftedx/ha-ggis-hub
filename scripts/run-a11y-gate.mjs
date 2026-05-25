// Build dist, start vite preview, run smoke-a11y.mjs, tear down.
// Mirrors run-visual-gate.mjs so the haggis-eval `a11y` gate stays a
// thin shell-out wrapper.
//
// Exit 0: gate passed.
// Exit 1: a11y violations, page errored, or build failed.

import { spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';

const PNPM = 'pnpm';
const NODE = process.execPath;

const PORT = process.env.HAGGIS_SMOKE_PORT ?? '4176';
const portNumber = Number(PORT);
if (!/^(?:[1-9]\d{0,4})$/.test(PORT) || !Number.isInteger(portNumber) || portNumber > 65535) {
  throw new Error(`Invalid preview port: ${PORT}`);
}
const BASE = `http://localhost:${PORT}/`;
const SMOKE = 'scripts/smoke-a11y.mjs';

function log(...args) {
  console.log('[run-a11y-gate]', ...args);
}

function buildDist() {
  log('building dist…');
  const r = spawnSync(`${PNPM} run build`, { stdio: 'inherit', shell: true });
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
// See run-browser-smokes.mjs for why detached:true on POSIX.
const isPosix = process.platform !== 'win32';
const preview = spawn(`${PNPM} exec vite preview --port ${PORT} --strictPort`, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
  detached: isPosix
});

const previewOut = [];
preview.stdout.on('data', (b) => previewOut.push(b.toString()));
preview.stderr.on('data', (b) => previewOut.push(b.toString()));

let failed = false;
try {
  await waitForPort(BASE, 8000);
  log(`preview ready at ${BASE}`);

  const result = spawnSync(NODE, [SMOKE], {
    stdio: 'inherit',
    env: { ...process.env, SCREENSHOT_URL: BASE }
  });
  if (result.status !== 0) failed = true;
} catch (err) {
  log('preview never came up:', err.message);
  log('preview output:');
  console.log(previewOut.join(''));
  failed = true;
} finally {
  if (preview.pid && !preview.killed) {
    try {
      if (isPosix) process.kill(-preview.pid, 'SIGTERM');
      else {
        spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
      }
    } catch {
      // Already dead.
    }
  }
}

process.exit(failed ? 1 : 0);
