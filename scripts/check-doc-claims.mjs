import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CURRENT_CLAIM_FILES = [
  'AGENTS.md',
  'README.md',
  'WRITEUP.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'docs/README.md',
  'docs/foundation/07-quality-gates.md',
  'docs/foundation/12-craft-commitments.md',
  'docs/architecture/evaluation-strategy.md',
  'docs/architecture/testing-strategy.md',
  'docs/plans/2026-05-22-implementation-sequence.md',
  'docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md',
  'tools/haggis-eval/README.md',
  '.github/workflows/ci.yml',
  'package.json',
];

const CRYPTO_SIGNING_PATTERN = /\bcryptographically signed\b/i;
const CRYPTO_NEGATION_PATTERN = /\bnot\s+(?:a\s+)?cryptographically signed\b/i;
const SIGNED_JSON_PATTERN = /\bsigned JSON reports?\b/i;
const SIGNED_JSON_QUALIFIER_PATTERN = /\b(?:FNV-signed|tamper-evident)\b/i;
const SIGNED_JSON_NEGATION_PATTERN =
  /\b(?:not|never|does not|do not|without)\b[^.]{0,100}\bsigned JSON reports?\b/i;

export function formatPlainGateList(gates) {
  return gates.join(' + ');
}

export function formatBacktickGateList(gates) {
  return gates.map((gate) => `\`${gate}\``).join(', ');
}

export function collectDocClaimFailures({ files, slicesConfig }) {
  const failures = [];
  const preMergeGates = slicesConfig.slices?.['pre-merge']?.gates;

  for (const file of CURRENT_CLAIM_FILES) {
    const text = files[file];
    if (text === undefined) {
      failures.push({
        id: 'missing-claim-file',
        file,
        line: 0,
        detail: `${file} is not present in the docs-claim scan input`,
      });
      continue;
    }
    failures.push(...collectForbiddenLineFailures(file, text));
  }

  if (!Array.isArray(preMergeGates) || preMergeGates.length === 0) {
    failures.push({
      id: 'missing-pre-merge-slice',
      file: 'tools/haggis-eval/slices.json',
      line: 0,
      detail: 'slices.json must declare a non-empty pre-merge gate list',
    });
    return failures;
  }

  const plainPreMerge = formatPlainGateList(preMergeGates);
  const backtickPreMerge = formatBacktickGateList(preMergeGates);
  const requiredSnippets = [
    {
      file: 'package.json',
      snippet: '"docs:claims": "node scripts/check-doc-claims.mjs"',
    },
    {
      file: 'package.json',
      snippet: '"verify": "pnpm run docs:claims && pnpm run typecheck',
    },
    {
      file: 'tools/haggis-eval/README.md',
      snippet: '| `docs`',
    },
    {
      file: 'tools/haggis-eval/README.md',
      snippet: `\`pre-merge\` (${plainPreMerge})`,
    },
    {
      file: 'docs/foundation/07-quality-gates.md',
      snippet: `The pre-merge slice runs ${backtickPreMerge}.`,
    },
  ];

  for (const required of requiredSnippets) {
    const text = files[required.file] ?? '';
    if (!text.includes(required.snippet)) {
      failures.push({
        id: 'missing-required-snippet',
        file: required.file,
        line: 0,
        detail: `missing required snippet: ${required.snippet}`,
      });
    }
  }

  return failures;
}

function collectForbiddenLineFailures(file, text) {
  const failures = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (CRYPTO_SIGNING_PATTERN.test(line) && !CRYPTO_NEGATION_PATTERN.test(line)) {
      failures.push({
        id: 'crypto-signing-overclaim',
        file,
        line: index + 1,
        detail: line.trim(),
      });
    }
    if (
      SIGNED_JSON_PATTERN.test(line) &&
      !SIGNED_JSON_QUALIFIER_PATTERN.test(line) &&
      !SIGNED_JSON_NEGATION_PATTERN.test(line)
    ) {
      failures.push({
        id: 'generic-signed-report-claim',
        file,
        line: index + 1,
        detail: line.trim(),
      });
    }
  });
  return failures;
}

export function readClaimFiles(rootDir) {
  return Object.fromEntries(
    CURRENT_CLAIM_FILES.map((file) => {
      const fullPath = path.join(rootDir, file);
      if (!fs.existsSync(fullPath)) {
        return [file, undefined];
      }
      return [file, fs.readFileSync(fullPath, 'utf8')];
    })
  );
}

export function readSlicesConfig(rootDir) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, 'tools/haggis-eval/slices.json'), 'utf8'));
}

function main() {
  const rootDir = process.cwd();
  const failures = collectDocClaimFailures({
    files: readClaimFiles(rootDir),
    slicesConfig: readSlicesConfig(rootDir),
  });

  if (failures.length > 0) {
    console.error(
      `doc-claims FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'})`
    );
    for (const failure of failures) {
      const location = failure.line > 0 ? `${failure.file}:${failure.line}` : failure.file;
      console.error(`- [${failure.id}] ${location} — ${failure.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`doc-claims OK — ${CURRENT_CLAIM_FILES.length} files checked`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
