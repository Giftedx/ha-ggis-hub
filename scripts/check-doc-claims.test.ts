import { describe, expect, it } from 'vitest';
interface DocClaimFailure {
  id: string;
  file: string;
  line: number;
  detail: string;
}

interface ClaimsModule {
  CURRENT_CLAIM_FILES: string[];
  collectDocClaimFailures: (input: {
    files: Record<string, string>;
    slicesConfig: typeof SLICES;
  }) => DocClaimFailure[];
  formatBacktickGateList: (gates: string[]) => string;
  formatPlainGateList: (gates: string[]) => string;
}

const claims = (await import(
  new URL('./check-doc-claims.mjs', import.meta.url).href
)) as ClaimsModule;
const {
  CURRENT_CLAIM_FILES,
  collectDocClaimFailures,
  formatBacktickGateList,
  formatPlainGateList,
} = claims;

const PRE_MERGE_GATES = [
  'docs',
  'ts',
  'security',
  'perf',
  'browser',
  'determinism',
  'visual',
  'a11y',
];

const SLICES = {
  schema: 1,
  slices: {
    'pre-merge': {
      description: 'test pre-merge',
      gates: PRE_MERGE_GATES,
    },
    release: {
      description: 'test release',
      gates: ['rust', 'rust-cov', 'docs', 'ts'],
    },
    fast: {
      description: 'test fast',
      gates: ['docs', 'ts', 'perf'],
    },
  },
};

function validFiles(): Record<string, string> {
  const plain = formatPlainGateList(PRE_MERGE_GATES);
  const backtick = formatBacktickGateList(PRE_MERGE_GATES);
  const files = Object.fromEntries(
    CURRENT_CLAIM_FILES.map((file) => [
      file,
      'FNV-signed tamper-evident JSON reports are not cryptographically signed.',
    ])
  );

  return {
    ...files,
    'package.json':
      '"docs:claims": "node scripts/check-doc-claims.mjs", "verify": "node scripts/run-pnpm-sequence.mjs docs:claims typecheck lint fmt:check test build:verified"',
    'tools/haggis-eval/README.md': `| \`docs\` | \`node scripts/check-doc-claims.mjs\` |\n\`pre-merge\` (${plain})`,
    'docs/foundation/07-quality-gates.md': `The pre-merge slice runs ${backtick}.`,
    '.github/workflows/ci.yml': 'PR CI runs `pnpm verify`; release CI runs `haggis-eval all`.',
  };
}

describe('formatPlainGateList', () => {
  it('formats slice gates as a stable plus-separated docs claim', () => {
    expect(formatPlainGateList(['docs', 'ts', 'perf'])).toBe('docs + ts + perf');
  });
});

describe('collectDocClaimFailures', () => {
  it('accepts current claim surfaces when they match slices.json-derived gate text', () => {
    expect(collectDocClaimFailures({ files: validFiles(), slicesConfig: SLICES })).toEqual([]);
  });

  it('rejects shields.io badge alt text that differs from the badge label', () => {
    const files = validFiles();
    const badge = '![Canvas](https://img.shields.io/badge/Canvas2D-hand--rolled-c9a23f?style=flat)';
    files['README.md'] = `Badge list:\n${badge}`;

    const failures = collectDocClaimFailures({ files, slicesConfig: SLICES });

    expect(failures).toEqual([
      {
        id: 'badge-alt-label-mismatch',
        file: 'README.md',
        line: 2,
        detail: badge,
      },
    ]);
  });

  it('accepts matching labels in badges with multiple path segments', () => {
    const files = validFiles();
    files['README.md'] = [
      '![Canvas2D](https://img.shields.io/badge/Canvas2D-hand--rolled-c9a23f?style=flat)',
      '![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)',
      '![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=flat&logo=webassembly&logoColor=white)',
      '![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)',
    ].join('\n');

    expect(collectDocClaimFailures({ files, slicesConfig: SLICES })).toEqual([]);
  });

  it('accepts a shields.io escaped underscore as a literal underscore', () => {
    const files = validFiles();
    files['README.md'] = '![My_Label](https://img.shields.io/badge/My__Label-x-blue)';

    expect(collectDocClaimFailures({ files, slicesConfig: SLICES })).toEqual([]);
  });

  it('reports a malformed percent label without throwing an exception', () => {
    const files = validFiles();
    const badge = '![Coverage](https://img.shields.io/badge/100%-passing-green)';
    files['README.md'] = badge;

    const failures = collectDocClaimFailures({ files, slicesConfig: SLICES });

    expect(failures).toEqual([
      {
        id: 'badge-alt-label-mismatch',
        file: 'README.md',
        line: 1,
        detail: badge,
      },
    ]);
  });

  it('rejects positive cryptographic-signing overclaims but allows explicit negation', () => {
    const files = validFiles();
    files['README.md'] = 'The haggis-eval report is cryptographically signed.';
    files['WRITEUP.md'] = 'The haggis-eval report is not cryptographically signed.';

    const failures = collectDocClaimFailures({ files, slicesConfig: SLICES });

    expect(failures.map((failure) => failure.id)).toContain('crypto-signing-overclaim');
  });

  it('rejects generic signed JSON report claims unless they are FNV/tamper-evident qualified or negated', () => {
    const files = validFiles();
    files['README.md'] = 'haggis-eval emits a signed JSON report.';
    files['WRITEUP.md'] = 'haggis-eval emits an FNV-signed JSON report.';
    files['CONTRIBUTING.md'] = 'haggis-eval emits a tamper-evident signed JSON report.';
    files['CHANGELOG.md'] = 'haggis-eval does not emit a generically signed JSON report.';

    const failures = collectDocClaimFailures({ files, slicesConfig: SLICES });

    expect(failures).toContainEqual(
      expect.objectContaining({ id: 'generic-signed-report-claim', file: 'README.md' })
    );
    expect(failures).not.toContainEqual(
      expect.objectContaining({ id: 'generic-signed-report-claim', file: 'WRITEUP.md' })
    );
    expect(failures).not.toContainEqual(
      expect.objectContaining({ id: 'generic-signed-report-claim', file: 'CONTRIBUTING.md' })
    );
    expect(failures).not.toContainEqual(
      expect.objectContaining({ id: 'generic-signed-report-claim', file: 'CHANGELOG.md' })
    );
  });

  it('rejects docs that omit the pre-merge gate list derived from slices.json', () => {
    const files = validFiles();
    files['tools/haggis-eval/README.md'] = '`pre-merge` (ts + security + perf)';

    const failures = collectDocClaimFailures({ files, slicesConfig: SLICES });

    expect(failures).toContainEqual(
      expect.objectContaining({
        id: 'missing-required-snippet',
        file: 'tools/haggis-eval/README.md',
      })
    );
  });
});
