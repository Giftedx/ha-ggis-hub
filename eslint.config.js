// @ts-check
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'src/generated/**'] },
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // tsc --strict already enforces unused locals/params with the _ convention.
      '@typescript-eslint/no-unused-vars': 'off',
      // noUncheckedIndexedAccess in tsconfig widens array element types to
      // T | undefined, making ! assertions necessary at known-in-bounds access
      // sites. Banning ! globally conflicts with that tsconfig setting.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Numbers (and bigints) in template literals are idiomatic TS.
      // Requiring String(x) everywhere adds noise without catching bugs.
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: false,
        allowAny: false,
        allowNullish: false,
      }],
    },
  },
  {
    // Test stubs intentionally implement async interfaces without internal
    // awaits — this is the correct pattern for synchronous fakes.
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      // Stub classes need typed constructors for interface compatibility
      // (e.g., `new (seed: bigint) => Handle`) even when the body is empty.
      '@typescript-eslint/no-useless-constructor': 'off',
      // Mocks and stubs frequently need `any` to shape-match generated or
      // partially-typed module interfaces (e.g., the WASM bindgen module).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
);
