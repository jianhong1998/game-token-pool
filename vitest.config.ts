import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    pool: 'forks', // Run tests in separate processes to avoid rollup conflicts
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@project/anchor': path.resolve(__dirname, './anchor/src'),
    },
  },
});
