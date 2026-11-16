import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { resolveBase, resolveHtmlInputs } from '../../tools/lib/build-targets.mjs';
import { cspPlugin } from '../../tools/lib/csp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.BUILD_TARGET || 'pages';

export default defineConfig({
  base: resolveBase(target),
  plugins: [cspPlugin()],
  build: {
    rollupOptions: {
      input: resolveHtmlInputs(target, __dirname),
    },
  },
});
