import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { isDebugBuild, resolveBase, resolveHtmlInputs } from '../../tools/lib/build-targets.mjs';
import { cspPlugin } from '../../tools/lib/csp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.BUILD_TARGET || 'pages';

export default defineConfig({
  base: resolveBase(target),
  plugins: [react(), cspPlugin()],
  define: {
    __AR_DEBUG__: isDebugBuild(target),
  },
  worker: {
    format: 'es',
  },
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: resolveHtmlInputs(target, __dirname),
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (
            normalized.includes('/node_modules/react/') ||
            normalized.includes('/node_modules/react-dom/') ||
            normalized.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
});
