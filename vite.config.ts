import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    sourcemap: false,
    target: 'es2022'
  },
  test: {
    environment: 'node',
    globals: true
  }
});
