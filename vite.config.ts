import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/ACCOUNTS-TASK-MANAGEMENT-SYSTEM/',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'github-pages-spa-404',
        configResolved(config) {
          (this as { targetOutDir?: string }).targetOutDir = config.build.outDir;
        },
        closeBundle() {
          try {
            const currentDir = typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : __dirname;
            const targetDir = (this as { targetOutDir?: string }).targetOutDir || 'dist';
            const outDir = path.isAbsolute(targetDir) ? targetDir : path.resolve(currentDir, targetDir);
            const indexPath = path.resolve(outDir, 'index.html');
            const notFoundPath = path.resolve(outDir, '404.html');
            if (fs.existsSync(indexPath)) {
              fs.copyFileSync(indexPath, notFoundPath);
            }
            fs.writeFileSync(path.resolve(outDir, '.nojekyll'), '');
          } catch (e) {
            console.warn('Failed to copy 404.html for GitHub Pages:', e);
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : __dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
