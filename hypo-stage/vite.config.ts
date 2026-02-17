import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Standalone demo build (mock API + seed data) for deployment to Vercel.
 * Run: yarn build:standalone
 * For subpath deployment: set VITE_APP_BASE=/<path>/ (e.g. /hypo-stage/) when building.
 */
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'demo'),
  base: process.env.VITE_APP_BASE ?? '/',
  build: {
    outDir: path.resolve(__dirname, 'dist-standalone'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'demo/index.html'),
    },
  },
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 3000,
  },
});
