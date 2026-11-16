import path from 'node:path';
import { build } from 'vite';
import { resolveBase } from './lib/build-targets.mjs';

/**
 * Builds the application using Vite's JavaScript API
 * @param {'pages' | 'android'} target
 */
export async function buildApp(target) {
  process.env.BUILD_TARGET = target;
  const root = path.resolve('apps/app');
  const base = resolveBase(target);
  const outDir = path.resolve(root, 'dist', target);

  console.log(`Building Arunodaya shell for target '${target}' (base: '${base}')...`);

  await build({
    root,
    base,
    build: {
      outDir,
      emptyOutDir: true,
    },
  });

  console.log(`Build complete: ${outDir}`);
}

async function main() {
  const args = process.argv.slice(2);
  let target = 'pages';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg.startsWith('--target=')) {
      target = arg.split('=')[1] ?? 'pages';
    } else if (arg === '--target') {
      target = args[i + 1] ?? 'pages';
    }
  }

  if (target !== 'pages' && target !== 'android') {
    console.error(`Invalid build target '${target}'. Expected 'pages' or 'android'.`);
    process.exit(1);
  }

  try {
    await buildApp(target);
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
) {
  main();
}
