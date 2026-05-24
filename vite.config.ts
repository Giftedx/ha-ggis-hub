import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    sourcemap: false,
    target: 'es2022'
  },
  test: {
    environment: 'node',
    globals: true,
    // Prevent Claude Code worktrees under .claude/ from contributing
    // test files to vitest discovery.
    exclude: ['**/node_modules/**', '**/.claude/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        // Browser-only entry point: imports DOM + WASM at module level,
        // cannot be exercised in a node vitest env.
        'src/main.ts',
        // Auto-generated wasm bindings + thin loader shim (no authored logic).
        'src/generated/**',
        'src/wasm/generated-loader.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
      reporter: ['text', 'json'],
    }
  }
});
