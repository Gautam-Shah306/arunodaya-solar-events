import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import { resolveBase } from './build-targets.mjs';
import { CSP_POLICY } from './csp.mjs';

/**
 * Starts a local Vite preview server for the built artifacts on 127.0.0.1 with CSP headers.
 *
 * @param {object} [options]
 * @param {number} [options.port]
 * @param {'pages' | 'android'} [options.target]
 * @param {boolean} [options.strictPort]
 * @param {string} [options.appRoot]
 * @returns {Promise<{ url: string, port: number, base: string, close(): Promise<void> }>}
 */
export async function startPreviewServer(options = {}) {
  const target = options.target ?? 'pages';
  const port = options.port ?? 0;
  const strictPort = options.strictPort ?? false;
  const appRoot = options.appRoot ? path.resolve(options.appRoot) : path.resolve('apps/app');
  const distDir = path.resolve(appRoot, `dist/${target}`);

  if (!fs.existsSync(distDir)) {
    throw new Error(
      `Dist directory does not exist: ${distDir}. Run "npm run build:${target}" first.`,
    );
  }

  const base = resolveBase(target);

  const previewServer = await preview({
    root: appRoot,
    base,
    build: {
      outDir: `dist/${target}`,
    },
    preview: {
      host: '127.0.0.1',
      port,
      strictPort,
      open: false,
      headers: {
        'Content-Security-Policy': CSP_POLICY,
      },
    },
  });

  const address = previewServer.httpServer.address();
  const actualPort = typeof address === 'object' && address !== null ? address.port : port;
  const url = `http://127.0.0.1:${actualPort}${base}`;

  return {
    url,
    port: actualPort,
    base,
    async close() {
      await previewServer.close();
    },
  };
}
