import { startPreviewServer } from './lib/preview.mjs';

try {
  const { url } = await startPreviewServer({
    target: 'pages',
    port: 4173,
    strictPort: true,
  });

  console.log(`Arunodaya Pages preview server running at:`);
  console.log(`  Index:      ${url}index.html`);
  console.log(`  Themes:     ${url}themes.html`);
  console.log(`  Components: ${url}components.html`);
  console.log('Press Ctrl+C to stop.');
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Error starting preview server:', msg);
  process.exit(1);
}
