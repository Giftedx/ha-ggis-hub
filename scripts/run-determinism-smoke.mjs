// Build dist, start vite preview, run smoke-determinism.mjs, tear
// down. Mirrors run-browser-smokes.mjs but for the single determinism
// smoke so haggis-eval `determinism` and `browser` stay separate.

import { spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';

const PNPM = 'pnpm';
const NODE = process.execPath;

const PORT = process.env.HAGGIS_SMOKE_PORT ?? '4174';
const portNumber = Number(PORT);
if (!/^(?:[1-9]\d{0,4})$/.test(PORT) || !Number.isInteger(portNumber) || portNumber > 65535) {
  throw new Error(`Invalid preview port: ${PORT}`);
}
const BASE = `http://localhost:${PORT}/`;
const SMOKE = 'scripts/smoke-determinism.mjs';

function log(...args) {
  console.log('[run-determinism-smoke]', ...args);
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
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const req = request(url, { method: 'HEAD' }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else if (Date.now() > deadline) reject(new Error(`bad status ${res.statusCode}`));
        else setTimeout(attempt, 200);
      });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error('timeout'));
        else setTimeout(attempt, 200);
      });
      req.end();
    };
    attempt();
  });
}

buildDist();

log(`starting preview on :${PORT}…`);
// See run-browser-smokes.mjs for why detached:true on POSIX — same
// process-group cleanup story.
const isPosix = process.platform !== 'win32';
const preview = spawn(`${PNPM} exec vite preview --port ${PORT} --strictPort`, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
  detached: isPosix,
});

const previewOut = [];
preview.stdout.on('data', (b) => previewOut.push(b.toString()));
preview.stderr.on('data', (b) => previewOut.push(b.toString()));

let failed = false;
try {
  await waitForPort(BASE, 8000);
  log(`preview ready at ${BASE}`);

  log(`running ${SMOKE}…`);
  const r = spawnSync(NODE, [SMOKE], {
    stdio: 'inherit',
    env: { ...process.env, SCREENSHOT_URL: BASE },
  });
  if (r.status !== 0) {
    failed = true;
    log(`FAIL ${SMOKE} (exit ${r.status})`);
  } else {
    log(`PASS ${SMOKE}`);
  }
} catch (err) {
  log('preview never became ready:', err.message);
  log('preview output:\n' + previewOut.join(''));
  failed = true;
} finally {
  log('killing preview');
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
  await new Promise((r) => setTimeout(r, 200));
}

process.exit(failed ? 1 : 0);
