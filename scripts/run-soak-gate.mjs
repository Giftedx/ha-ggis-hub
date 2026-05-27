// Orchestrates the memory-soak gate: build dist → start vite preview
// → run smoke-soak.mjs → tear down. Single entry point for the
// haggis-eval `soak` subcommand so the Go tool stays a thin shell-out.
//
// Exit 0: soak passed. Exit 1: heap grew past budget or page errors.

import { spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';

const PNPM = 'pnpm';
const NODE = process.execPath;

const PORT = process.env.HAGGIS_SOAK_PORT ?? '4177';
const portNumber = Number(PORT);
if (!/^(?:[1-9]\d{0,4})$/.test(PORT) || !Number.isInteger(portNumber) || portNumber > 65535) {
  throw new Error(`Invalid preview port: ${PORT}`);
}
const BASE = `http://localhost:${PORT}/`;

function log(...args) {
  console.log('[run-soak-gate]', ...args);
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
const isPosix = process.platform !== 'win32';
const preview = spawn(`${PNPM} exec vite preview --port ${PORT} --strictPort`, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
  detached: isPosix,
});

const previewOut = [];
preview.stdout.on('data', (b) => previewOut.push(b.toString()));
preview.stderr.on('data', (b) => previewOut.push(b.toString()));

function killPreview() {
  if (!preview.pid || preview.killed) return;
  try {
    if (isPosix) {
      process.kill(-preview.pid, 'SIGTERM');
    } else {
      spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
    }
  } catch {
    // Already dead.
  }
}

let exitCode = 0;
try {
  await waitForPort(BASE, 8000);
  log(`preview ready at ${BASE}`);

  const r = spawnSync(NODE, ['scripts/smoke-soak.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, SCREENSHOT_URL: BASE },
  });
  if (r.status !== 0) {
    log(`FAIL smoke-soak.mjs (exit ${r.status})`);
    exitCode = 1;
  } else {
    log('PASS smoke-soak.mjs');
  }
} catch (err) {
  log('preview never became ready:', err.message);
  log('preview output:\n' + previewOut.join(''));
  exitCode = 1;
} finally {
  log('killing preview');
  killPreview();
  await new Promise((r) => setTimeout(r, 200));
}

process.exit(exitCode);
