import { defineConfig } from 'vite';
import { resolveBase } from '../../tools/lib/build-targets.mjs';
import { cspPlugin } from '../../tools/lib/csp.mjs';

const target = process.env.BUILD_TARGET || 'pages';

export default defineConfig({
  base: resolveBase(target),
  plugins: [cspPlugin()],
});
