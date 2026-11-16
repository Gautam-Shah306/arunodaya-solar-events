import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import { resolveBase } from './lib/build-targets.mjs';

const pagesDist = path.resolve('apps/app/dist/pages');
if (!fs.existsSync(pagesDist)) {
  console.error('Error: apps/app/dist/pages does not exist. Run "npm run build:pages first".');
  process.exit(1);
}

const base = resolveBase('pages');

await preview({
  root: pagesDist,
  base,
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    open: false,
  },
});

const serverUrl = `http://127.0.0.1:4173${base}`;
console.log(`Arunodaya Pages preview server running at:`);
console.log(`  Index:  ${serverUrl}index.html`);
console.log(`  Themes: ${serverUrl}themes.html`);
console.log('Press Ctrl+C to stop.');
