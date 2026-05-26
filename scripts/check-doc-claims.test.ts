import { describe, expect, it } from 'vitest';
import {
  collectDocClaimFailures,
  formatBacktickGateList,
  formatPlainGateList
} from './check-doc-claims.mjs';

const PRE_MERGE_GATES = [
  'rust-lint',
  'docs',
  'ts',
  'coverage',
  'security',
  'perf',
  'browser',
  'determinism',
  'visual',
  'a11y'
];

const SLICES = {
  schema: 1,
  slices: {
    'pre-merge': {
      description: 'test pre-merge',
      gates: PRE_MERGE_GATES
    },
    release: {
      description: 'test release',
      gates: ['rust', 'docs', 'ts']
    },
    fast: {
      description: 'test fast',
      gates: ['docs', 'ts']
    }
  }
};

function validFiles(): Record<string, string> {
  const plain = formatPlainGateList(PRE_MERGE_GATES);
  const backtick = formatBacktickGateList(PRE_MERGE_GATES);
  return {
    'README.md': 'PRs run `haggis-eval slice pre-merge` and reports are FNV-signed tamper-evident JSON.',
    'WRITEUP.md': 'FNV-signed tamper-evident gate reports are verified with verify-report.',
    'docs/README.md': 'The full `haggis-eval all` release gate emits an FNV-signed tamper-evident JSON report.',
    'docs/foundation/07-quality-gates.md': `The pre-merge slice runs ${backtick}.`,
    'docs/foundation/12-craft-commitments.md': 'This is tamper evidence, not cryptographic authenticity.',
    'docs/architecture/evaluation-strategy.md': 'The tool orchestrates a 22-result FNV-signed tamper-evident report matrix.',
    'docs/architecture/testing-strategy.md': 'Current host coverage: 24 Vitest files and 175 tests.',
    'tools/haggis-eval/README.md': `\`pre-merge\` (${plain})`,
    '.github/workflows/ci.yml': `# haggis-eval pre-merge gates: ${plain}`,
    'CHANGELOG.md': 'pnpm verify        24 test files, 175 tests, build/dist verification passed',
    'docs/audit/2026-05-26-quality-realignment.md': 'Report truth: current reports are not cryptographically signed artifacts.'
  };
}

describe('formatPlainGateList', () => {
  it('formats slice gates as a stable plus-separated docs claim', () => {
    expect(formatPlainGateList(['rust-lint', 'docs', 'ts'])).toBe('rust-lint + docs + ts');
  });
});

describe('collectDocClaimFailures', () => {
  it('accepts current claim surfaces when they match slices.json-derived gate text', () => {
    expect(collectDocClaimFailures({ files: validFiles(), slicesConfig: SLICES })).toEqual([]);
  });

  it('rejects stale report evidence and old test-count claims', () => {
    const files = validFiles();
    files['CHANGELOG.md'] = [
      'haggis-eval all PASS, signature 0x844f8b0f63c2871d',
      'haggis-eval verify-report PENDING final regenerated report',
      'pnpm verify 24 test files, 172 tests'
    ].join('\n');

    const ids = collectDocClaimFailures({ files, slicesConfig: SLICES }).map((failure) => failure.id);

    expect(ids).toContain('old-report-signature');
    expect(ids).toContain('pending-verifier-evidence');
    expect(ids).toContain('old-test-count');
  });

  it('rejects positive cryptographic-signing overclaims but allows explicit negation', () => {
    const files = validFiles();
    files['README.md'] = 'The report is cryptographically signed.';
    files['docs/audit/2026-05-26-quality-realignment.md'] = 'The report is not cryptographically signed artifacts.';

    const failures = collectDocClaimFailures({ files, slicesConfig: SLICES });

    expect(failures.map((failure) => failure.id)).toContain('crypto-signing-overclaim');
  });

  it('rejects docs that omit the pre-merge gate list derived from slices.json', () => {
    const files = validFiles();
    files['tools/haggis-eval/README.md'] = '`pre-merge` (rust-lint + ts + coverage)';

    const failures = collectDocClaimFailures({ files, slicesConfig: SLICES });

    expect(failures).toContainEqual(expect.objectContaining({
      id: 'missing-required-snippet',
      file: 'tools/haggis-eval/README.md'
    }));
  });
});
