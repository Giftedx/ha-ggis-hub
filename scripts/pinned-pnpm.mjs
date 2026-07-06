import { existsSync, readFileSync, statSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function spawnPnpm(args, options = {}) {
  const command = pnpmCommand(args, options.env);
  return spawn(command.exe, command.args, {
    ...options,
    env: command.env,
    shell: false,
  });
}

export function spawnPnpmSync(args, options = {}) {
  const command = pnpmCommand(args, options.env);
  return spawnSync(command.exe, command.args, {
    ...options,
    env: command.env,
    shell: false,
  });
}

function pnpmCommand(args, extraEnv) {
  const pnpm = resolvePinnedPnpm();
  const env = childEnv(pnpm, extraEnv);
  if (process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(pnpm.exe)) {
    return {
      exe: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/c', 'call', pnpm.exe, ...args],
      env,
    };
  }
  return { exe: pnpm.exe, args, env };
}

function resolvePinnedPnpm() {
  const pinned = pinnedPnpmVersion();
  if (pinned === '') {
    return { exe: 'pnpm', dir: '' };
  }

  const candidates = pnpmCandidates(process.env.PATH ?? '');
  for (const candidate of candidates) {
    if (pnpmVersion(candidate) === pinned) {
      return { exe: candidate, dir: dirname(candidate) };
    }
  }

  if (candidates[0] !== undefined) {
    return { exe: candidates[0], dir: dirname(candidates[0]) };
  }

  return { exe: 'pnpm', dir: '' };
}

function pinnedPnpmVersion() {
  const manifest = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  return parsePnpmPackageManager(String(manifest.packageManager ?? ''));
}

function parsePnpmPackageManager(value) {
  const prefix = 'pnpm@';
  if (!value.startsWith(prefix)) {
    return '';
  }
  return value.slice(prefix.length).split('+', 1)[0].trim();
}

function pnpmCandidates(pathValue) {
  const names =
    process.platform === 'win32' ? ['pnpm.cmd', 'pnpm.exe', 'pnpm.bat', 'pnpm'] : ['pnpm'];
  const seen = new Set();
  const out = [];

  for (const dir of pathValue.split(delimiter)) {
    if (dir === '') {
      continue;
    }
    for (const name of names) {
      const candidate = join(dir, name);
      const key = process.platform === 'win32' ? candidate.toLowerCase() : candidate;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        out.push(candidate);
      }
    }
  }

  return out;
}

function pnpmVersion(candidate) {
  const result = spawnPnpmCandidateSync(candidate, ['-v'], {
    cwd: rootDir,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return '';
  }
  return result.stdout.trim();
}

function spawnPnpmCandidateSync(exe, args, options) {
  if (process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(exe)) {
    return spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', 'call', exe, ...args], {
      ...options,
      shell: false,
    });
  }

  return spawnSync(exe, args, { ...options, shell: false });
}

function childEnv(pnpm, extraEnv) {
  const env = { ...process.env, ...(extraEnv ?? {}) };
  if (pnpm.dir === '') {
    return env;
  }

  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  env[pathKey] = `${pnpm.dir}${delimiter}${env[pathKey] ?? ''}`;
  return env;
}
