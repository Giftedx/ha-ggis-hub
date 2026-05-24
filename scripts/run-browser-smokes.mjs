// Orchestrate the browser-smoke suite: build dist → start vite preview
// → wait for port → run all smoke scripts → tear down. Single entry
// point for the haggis-eval `browser` gate so the Go tool stays a
// thin shell-out wrapper.
//
// Exit 0: all smokes passed. Exit 1: at least one failed.

import { spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';

const PORT = process.env.HAGGIS_SMOKE_PORT ?? '4173';
const BASE = `http://localhost:${PORT}/`;
const SMOKES = [
  'scripts/smoke-door-launch.mjs',
  'scripts/smoke-door-tap.mjs',
  'scripts/smoke-pointer-drive.mjs'
];

function log(...args) {
  console.log('[run-browser-smokes]', ...args);
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
// detached:true on POSIX so vite becomes its own process-group leader
// and we can kill the whole group (shell wrapper + vite grandchild) via
// `process.kill(-pid)` below. Without this, kill('SIGTERM') only takes
// out the shell and CI logs end with "Terminate orphan process: node".
const isPosix = process.platform !== 'win32';
const preview = spawn('pnpm', ['exec', 'vite', 'preview', '--port', PORT, '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
  detached: isPosix,
});

const previewOut = [];
preview.stdout.on('data', (b) => previewOut.push(b.toString()));
preview.stderr.on('data', (b) => previewOut.push(b.toString()));

let failures = 0;
try {
  await waitForPort(BASE, 8000);
  log(`preview ready at ${BASE}`);

  for (const smoke of SMOKES) {
    log(`running ${smoke}…`);
    const r = spawnSync('node', [smoke], {
      stdio: 'inherit',
      env: { ...process.env, SCREENSHOT_URL: BASE },
    });
    if (r.status !== 0) {
      failures += 1;
      log(`FAIL ${smoke} (exit ${r.status})`);
    } else {
      log(`PASS ${smoke}`);
    }
  }
} catch (err) {
  log('preview never became ready:', err.message);
  log('preview output:\n' + previewOut.join(''));
  failures = 1;
} finally {
  log('killing preview');
  killPreview();
  // Wait a beat so the port releases cleanly.
  await new Promise((r) => setTimeout(r, 200));
}

function killPreview() {
  if (!preview.pid || preview.killed) return;
  try {
    if (isPosix) {
      // Negative pid = signal entire process group.
      process.kill(-preview.pid, 'SIGTERM');
    } else {
      preview.kill('SIGTERM');
    }
  } catch {
    // Already dead.
  }
}

if (failures > 0) {
  log(`${failures} smoke(s) failed`);
  process.exit(1);
}
log('all smokes passed');
// Explicit exit. Without this, `pnpm exec vite preview` spawned with
// shell:true leaves an orphan vite grandchild (SIGTERM goes to the
// shell wrapper, not vite), keeping Node's event loop alive — the
// script then hangs forever waiting for handles to close. CI saw a
// 10-minute timeout here before this fix. Sister scripts
// run-determinism-smoke.mjs and run-visual-gate.mjs already exit
// explicitly for the same reason.
process.exit(0);
