// Orchestrate the browser-smoke suite: build dist → start vite preview
// → wait for port → run all smoke scripts → tear down. Single entry
// point for the haggis-eval `browser` gate so the Go tool stays a
// thin shell-out wrapper.
//
// Exit 0: all smokes passed. Exit 1: at least one failed.

import { spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';

const PNPM = 'pnpm';
const NODE = process.execPath;

const PORT = process.env.HAGGIS_SMOKE_PORT ?? '4173';
const portNumber = Number(PORT);
if (!/^(?:[1-9]\d{0,4})$/.test(PORT) || !Number.isInteger(portNumber) || portNumber > 65535) {
  throw new Error(`Invalid preview port: ${PORT}`);
}
const BASE = `http://localhost:${PORT}/`;
const BROWSER = process.env.PLAYWRIGHT_BROWSER ?? 'chromium';
const SMOKES = [
  'scripts/smoke-door-launch.mjs',
  'scripts/smoke-door-tap.mjs',
  'scripts/smoke-pointer-drive.mjs',
  'scripts/smoke-music-toggle.mjs',
  // smoke-a11y uses computed CSS and keyboard focus behaviour that is
  // intentionally chromium-specific (26 WCAG AA spot-checks). Skipped
  // for firefox/webkit runs where tab-focus behaviour is OS-dependent.
  ...(BROWSER === 'chromium' ? ['scripts/smoke-a11y.mjs'] : []),
];

function log(...args) {
  console.log('[run-browser-smokes]', ...args);
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
// detached:true on POSIX so vite becomes its own process-group leader
// and we can kill the whole Vite process group via `process.kill(-pid)` below.
const isPosix = process.platform !== 'win32';
const preview = spawn(`${PNPM} exec vite preview --port ${PORT} --strictPort`, {
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
    const r = spawnSync(NODE, [smoke], {
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
      spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
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
// Explicit exit after preview teardown; all smoke scripts have completed.
process.exit(0);
