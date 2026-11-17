#!/usr/bin/env node
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { build } from 'vite';
import { isDebugBuild, resolveBase, resolveHtmlInputs } from './lib/build-targets.mjs';
import { createBundleAnalyzerPlugin, formatBundleReport } from './lib/bundle-report.mjs';
import { cspPlugin } from './lib/csp.mjs';

/**
 * Executes a Vite build for the specified target and returns bundle analysis.
 * @param {'pages' | 'android'} target
 * @param {{ appRoot?: string }} [options]
 * @returns {Promise<{ target: string, chunks: Array<{ fileName: string, rawSize: number, gzipSize: number, topModules: Array<{ name: string, size: number }> }> }>}
 */
export async function runBundleAnalysis(target, options = {}) {
  process.env.BUILD_TARGET = target;
  const appRoot = options.appRoot || path.resolve('apps/app');
  const base = resolveBase(target);
  const outDir = path.resolve(appRoot, 'dist', target);

  /** @type {Array<any>} */
  let chunkResults = [];
  const analyzer = createBundleAnalyzerPlugin((res) => {
    chunkResults = res;
  });

  await build({
    root: appRoot,
    base,
    plugins: [react(), cspPlugin(), analyzer],
    define: {
      __AR_DEBUG__: isDebugBuild(target),
    },
    worker: {
      format: 'es',
    },
    build: {
      outDir,
      emptyOutDir: true,
      assetsInlineLimit: 0,
      rollupOptions: {
        input: resolveHtmlInputs(target, appRoot),
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
    logLevel: 'warn',
  });

  return {
    target,
    chunks: chunkResults,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let target = 'pages';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] || '';
    if (arg.startsWith('--target=')) {
      target = arg.split('=')[1] || 'pages';
    } else if (arg === '--target' && args[i + 1]) {
      target = args[i + 1] || 'pages';
    }
  }

  if (target !== 'pages' && target !== 'android') {
    console.error(`Invalid target '${target}'. Expected 'pages' or 'android'.`);
    process.exit(1);
  }

  try {
    const report = await runBundleAnalysis(target);
    console.log(formatBundleReport(report));
  } catch (err) {
    console.error('Bundle analysis failed:', err);
    process.exit(1);
  }
}

main();
