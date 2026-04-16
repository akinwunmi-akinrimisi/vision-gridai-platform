import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    isolate: true,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/lib/**', 'src/hooks/**', 'src/components/**'],
      exclude: ['src/__tests__/**', 'node_modules/**'],
    },
  },
});
