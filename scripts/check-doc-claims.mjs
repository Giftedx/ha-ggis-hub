import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CURRENT_CLAIM_FILES = [
  'README.md',
  'WRITEUP.md',
  'docs/README.md',
  'docs/foundation/07-quality-gates.md',
  'docs/foundation/12-craft-commitments.md',
  'docs/architecture/evaluation-strategy.md',
  'docs/architecture/testing-strategy.md',
  'tools/haggis-eval/README.md',
  '.github/workflows/ci.yml',
  'CHANGELOG.md',
  'docs/audit/2026-05-26-quality-realignment.md'
];

const FORBIDDEN_LINE_PATTERNS = [
  { id: 'old-report-path', pattern: /all-20260526T031918Z/ },
  { id: 'old-report-signature', pattern: /0x844f8b0f63c2871d/ },
  { id: 'pending-verifier-evidence', pattern: /\bPENDING final\b/i },
  { id: 'old-test-count', pattern: /\b(?:168|171|172)\s+(?:tests|cases|passed)\b/i },
  {
    id: 'duplicate-pr-ci-claim',
    pattern: /runs\s+`pnpm verify`\s+and\s+`haggis-eval slice pre-merge`\s+on PRs/i
  }
];

export function formatPlainGateList(gates) {
  return gates.join(' + ');
}

export function formatBacktickGateList(gates) {
  return gates.map((gate) => `\`${gate}\``).join(', ');
}

export function collectDocClaimFailures({ files, slicesConfig }) {
  const failures = [];
  const preMergeGates = slicesConfig.slices?.['pre-merge']?.gates ?? [];
  const plainPreMerge = formatPlainGateList(preMergeGates);
  const backtickPreMerge = formatBacktickGateList(preMergeGates);

  for (const file of CURRENT_CLAIM_FILES) {
    const text = files[file];
    if (text === undefined) {
      failures.push({
        id: 'missing-claim-file',
        file,
        line: 0,
        detail: `${file} is not present in the docs-claim scan input`
      });
      continue;
    }
    failures.push(...collectForbiddenLineFailures(file, text));
  }

  const requiredSnippets = [
    {
      file: 'tools/haggis-eval/README.md',
      snippet: `\`pre-merge\` (${plainPreMerge})`
    },
    {
      file: 'docs/foundation/07-quality-gates.md',
      snippet: `The pre-merge slice runs ${backtickPreMerge}.`
    },
    {
      file: '.github/workflows/ci.yml',
      snippet: `# haggis-eval pre-merge gates: ${plainPreMerge}`
    }
  ];

  for (const required of requiredSnippets) {
    const text = files[required.file] ?? '';
    if (!text.includes(required.snippet)) {
      failures.push({
        id: 'missing-required-snippet',
        file: required.file,
        line: 0,
        detail: `missing required snippet: ${required.snippet}`
      });
    }
  }

  return failures;
}

function collectForbiddenLineFailures(file, text) {
  const failures = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of FORBIDDEN_LINE_PATTERNS) {
      if (rule.pattern.test(line)) {
        failures.push({ id: rule.id, file, line: index + 1, detail: line.trim() });
      }
    }
    if (/\bcryptographically signed\b/i.test(line) && !/\bnot cryptographically signed\b/i.test(line)) {
      failures.push({
        id: 'crypto-signing-overclaim',
        file,
        line: index + 1,
        detail: line.trim()
      });
    }
    if (/\bsigned JSON report\b/i.test(line) && !/\bFNV-signed\b/i.test(line)) {
      failures.push({
        id: 'generic-signed-report-claim',
        file,
        line: index + 1,
        detail: line.trim()
      });
    }
  });
  return failures;
}

export function readClaimFiles(rootDir) {
  return Object.fromEntries(CURRENT_CLAIM_FILES.map((file) => [
    file,
    fs.readFileSync(path.join(rootDir, file), 'utf8')
  ]));
}

export function readSlicesConfig(rootDir) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, 'tools/haggis-eval/slices.json'), 'utf8'));
}

function main() {
  const rootDir = process.cwd();
  const failures = collectDocClaimFailures({
    files: readClaimFiles(rootDir),
    slicesConfig: readSlicesConfig(rootDir)
  });

  if (failures.length > 0) {
    console.error(`doc-claims FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'})`);
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
