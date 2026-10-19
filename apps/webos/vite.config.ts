import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@cinefin/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    target: 'chrome87',
    cssTarget: 'chrome87',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
});
