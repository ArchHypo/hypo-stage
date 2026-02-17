import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

/**
 * Standalone demo build (mock API + seed data) for deployment to Vercel.
 * Run: yarn build:standalone
 * For subpath deployment: set VITE_APP_BASE=/<path>/ (e.g. /hypo-stage/) when building.
 */
const base = process.env.VITE_APP_BASE ?? '/';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-plugin',
      closeBundle() {
        const outDir = path.resolve(__dirname, 'dist-standalone');
        const assetsDir = path.join(outDir, 'assets');
        const files = fs.readdirSync(assetsDir);
        const jsFile = files.find((f) => f.endsWith('.js'));
        const cssFile = files.find((f) => f.endsWith('.css'));
        if (!jsFile) return;
        const scriptSrc = `${base}assets/${jsFile}`;
        const cssLink = cssFile ? `    <link rel="stylesheet" href="${base}assets/${cssFile}">\n` : '';
        const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HypoStage – Demo</title>
${cssLink}
    <script type="module" crossorigin src="${scriptSrc}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
        fs.writeFileSync(path.join(outDir, 'index.html'), html);
      },
    },
  ],
  root: path.resolve(__dirname, 'demo'),
  base,
  build: {
    outDir: path.resolve(__dirname, 'dist-standalone'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'demo/main.tsx'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        inlineDynamicImports: true,
      },
      treeshake: false,
    },
  },
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 3000,
  },
});
