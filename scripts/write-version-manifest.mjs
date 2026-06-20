import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const DEFAULT_OUTPUT = 'dist/__version';
const WHS_ROUTE = '/wild/';
const JFMM_ROUTE = '/just-five-more-minutes/';

export function summarizeDirtyFiles(porcelain) {
  return String(porcelain)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildVersionManifest({
  generatedAt,
  packageJson,
  hubGit,
  whsGit,
  whsBuild,
  jfmmGit,
  jfmmBuild,
}) {
  return {
    schema: 1,
    generatedAt,
    hub: {
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      git: gitManifest(hubGit),
    },
    wildHaggisSurvivors: {
      route: WHS_ROUTE,
      source: gameSourceManifest(whsGit),
      build: buildManifest(whsBuild),
    },
    justFiveMoreMinutes: {
      route: JFMM_ROUTE,
      source: gameSourceManifest(jfmmGit),
      build: buildManifest(jfmmBuild),
    },
  };
}

export async function writeVersionManifest(path, manifest) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function collectVersionManifest(rootDir) {
  const packageJson = JSON.parse(await readFile(resolve(rootDir, 'package.json'), 'utf8'));
  const hubGit = await readGitState(rootDir, '.');
  const whsPath = resolve(rootDir, '..', 'wild-haggis-survivors');
  const whsGit = await readGitState(whsPath, '../wild-haggis-survivors');
  const whsBuild = await readMountedBuild(resolve(rootDir, 'dist', 'wild'), 'dist/wild');
  const jfmmPath = resolve(rootDir, '..', '..', 'experiments', 'just-five-more-minutes');
  const jfmmGit = await readGitState(jfmmPath, '../../experiments/just-five-more-minutes');
  const jfmmBuild = await readMountedBuild(
    resolve(rootDir, 'dist', 'just-five-more-minutes'),
    'dist/just-five-more-minutes'
  );

  return buildVersionManifest({
    generatedAt: new Date().toISOString(),
    packageJson,
    hubGit,
    whsGit,
    whsBuild,
    jfmmGit,
    jfmmBuild,
  });
}

async function readGitState(repoPath, displayPath) {
  try {
    await runGit(repoPath, ['rev-parse', '--is-inside-work-tree']);
    const [commit, shortCommit, branchRaw, porcelain] = await Promise.all([
      runGit(repoPath, ['rev-parse', 'HEAD']),
      runGit(repoPath, ['rev-parse', '--short=7', 'HEAD']),
      runGit(repoPath, ['branch', '--show-current']),
      runGit(repoPath, ['status', '--porcelain']),
    ]);
    const dirtyFiles = summarizeDirtyFiles(porcelain);
    return {
      available: true,
      path: displayPath,
      commit: commit.trim(),
      shortCommit: shortCommit.trim(),
      branch: branchRaw.trim() || null,
      dirty: dirtyFiles.length > 0,
      dirtyFiles,
    };
  } catch (error) {
    return {
      available: false,
      path: displayPath,
      commit: null,
      shortCommit: null,
      branch: null,
      dirty: null,
      dirtyFiles: [],
      error: error.message,
    };
  }
}

async function runGit(cwd, args) {
  const { stdout } = await execFileAsync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  return stdout;
}

async function readMountedBuild(mountDist, displayPath) {
  try {
    const indexPath = join(mountDist, 'index.html');
    const indexStat = await stat(indexPath);
    if (!indexStat.isFile()) {
      throw new Error(`${displayPath}/index.html is not a file`);
    }
    const files = await walkFiles(mountDist);
    const assetFiles = files.filter((file) =>
      normalizePath(relative(mountDist, file)).startsWith('assets/')
    );
    const buildFingerprint = createHash('sha256');
    for (const file of files.sort()) {
      const rel = normalizePath(relative(mountDist, file));
      buildFingerprint.update(rel);
      buildFingerprint.update('\0');
      buildFingerprint.update(await sha256File(file));
      buildFingerprint.update('\0');
    }
    return {
      mounted: true,
      assetCount: assetFiles.length,
      fingerprint: buildFingerprint.digest('hex'),
      indexSha256: await sha256File(indexPath),
    };
  } catch (error) {
    return {
      mounted: false,
      assetCount: 0,
      fingerprint: null,
      indexSha256: null,
      error: error.message,
    };
  }
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function sha256File(path) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

function gitManifest(state) {
  const out = {
    available: state.available,
    commit: state.commit,
    shortCommit: state.shortCommit,
    branch: state.branch,
    dirty: state.dirty,
    dirtyFiles: state.dirtyFiles,
  };
  if (state.error !== undefined) {
    out.error = state.error;
  }
  return out;
}

function gameSourceManifest(state) {
  const out = {
    present: state.available,
    path: state.path,
    commit: state.commit,
    shortCommit: state.shortCommit,
    branch: state.branch,
    dirty: state.dirty,
    dirtyFiles: state.dirtyFiles,
  };
  if (state.error !== undefined) {
    out.error = state.error;
  }
  return out;
}

function buildManifest(summary) {
  const out = {
    mounted: summary.mounted,
    assetCount: summary.assetCount,
    fingerprint: summary.fingerprint,
    indexSha256: summary.indexSha256,
  };
  if (summary.error !== undefined) {
    out.error = summary.error;
  }
  return out;
}

function normalizePath(path) {
  return path.replaceAll('\\', '/');
}

function parseArgs(argv) {
  const args = [...argv];
  let output = DEFAULT_OUTPUT;
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--output') {
      output = args.shift();
      if (output === undefined) {
        throw new Error('--output requires a path');
      }
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { output };
}

async function main() {
  const { output } = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const target = resolve(rootDir, output);
  const manifest = await collectVersionManifest(rootDir);
  await writeVersionManifest(target, manifest);
  const hubDirty = manifest.hub.git.dirty ? 'dirty' : 'clean';
  const whsDirty = manifest.wildHaggisSurvivors.source.dirty ? 'dirty' : 'clean';
  const whsBuild = manifest.wildHaggisSurvivors.build.mounted ? 'mounted' : 'not-mounted';
  const jfmmDirty = manifest.justFiveMoreMinutes.source.dirty ? 'dirty' : 'clean';
  const jfmmBuild = manifest.justFiveMoreMinutes.build.mounted ? 'mounted' : 'not-mounted';
  console.log(
    `[version] wrote ${normalizePath(relative(rootDir, target))} hub=${manifest.hub.git.shortCommit ?? 'unknown'}:${hubDirty} whs=${manifest.wildHaggisSurvivors.source.shortCommit ?? 'unknown'}:${whsDirty}:${whsBuild} jfmm=${manifest.justFiveMoreMinutes.source.shortCommit ?? 'unknown'}:${jfmmDirty}:${jfmmBuild}`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[version] failed:', error);
    process.exit(1);
  });
}
