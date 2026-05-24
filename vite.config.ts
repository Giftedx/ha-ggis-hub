import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    sourcemap: false,
    target: 'es2022'
  },
  test: {
    environment: 'node',
    globals: true,
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
        lines: 80,
        statements: 80,
        functions: 85,
        branches: 60,
      },
      reporter: ['text', 'json'],
    }
  }
});
