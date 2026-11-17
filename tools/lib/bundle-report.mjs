import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Groups a module identifier into an npm package name or relative source path.
 * @param {string} id Module file path or virtual id
 * @returns {string} Grouped identifier (e.g. npm:react or apps/app/src/main.tsx)
 */
export function groupModuleId(id) {
  if (!id) return 'unknown';
  const normalized = id.replace(/\\/g, '/');

  const nmIndex = normalized.lastIndexOf('/node_modules/');
  if (nmIndex !== -1) {
    const afterNm = normalized.slice(nmIndex + '/node_modules/'.length);
    const parts = afterNm.split('/');
    if (parts[0]?.startsWith('@') && parts[1]) {
      return `npm:${parts[0]}/${parts[1]}`;
    }
    return `npm:${parts[0] || 'unknown'}`;
  }

  // Detect workspace relative packages or apps
  for (const prefix of ['apps/', 'packages/', 'tools/']) {
    const idx = normalized.indexOf(prefix);
    if (idx !== -1) {
      return normalized.slice(idx);
    }
  }

  return path.basename(normalized);
}

/**
 * Creates a Vite plugin that inspects chunks in generateBundle and collects metrics.
 * @param {(chunks: Array<{ fileName: string, rawSize: number, gzipSize: number, topModules: Array<{ name: string, size: number }> }>) => void} onDone
 * @returns {import('vite').Plugin}
 */
export function createBundleAnalyzerPlugin(onDone) {
  return {
    name: 'arunodaya-bundle-analyzer',
    generateBundle(_options, bundle) {
      const results = [];

      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type !== 'chunk') continue;

        const codeBuffer = Buffer.from(item.code, 'utf8');
        const rawSize = codeBuffer.length;
        const gzipSize = zlib.gzipSync(codeBuffer).length;

        // Group modules
        const moduleMap = new Map();
        if (item.modules) {
          for (const [modId, info] of Object.entries(item.modules)) {
            const group = groupModuleId(modId);
            const rendered = info.renderedLength || 0;
            moduleMap.set(group, (moduleMap.get(group) || 0) + rendered);
          }
        }

        const topModules = Array.from(moduleMap.entries())
          .map(([name, size]) => ({ name, size }))
          .sort((a, b) => b.size - a.size)
          .slice(0, 12);

        results.push({
          fileName,
          rawSize,
          gzipSize,
          topModules,
        });
      }

      onDone(results);
    },
  };
}

/**
 * Formats bundle analysis into a human-readable summary.
 * @param {{ target: string, chunks: Array<{ fileName: string, rawSize: number, gzipSize: number, topModules: Array<{ name: string, size: number }> }> }} report
 * @returns {string}
 */
export function formatBundleReport(report) {
  const lines = [
    `=== BUNDLE ANALYSIS: Target '${report.target}' ===`,
    `Total chunks: ${report.chunks.length}`,
    '',
  ];

  for (const chunk of report.chunks) {
    const rawKb = (chunk.rawSize / 1024).toFixed(2);
    const gzipKb = (chunk.gzipSize / 1024).toFixed(2);
    lines.push(
      `Chunk: ${chunk.fileName} | Raw: ${chunk.rawSize} B (${rawKb} kB) | Gzip: ${chunk.gzipSize} B (${gzipKb} kB)`,
    );
    lines.push('  Top 12 modules / groups:');
    for (const mod of chunk.topModules) {
      const modKb = (mod.size / 1024).toFixed(2);
      lines.push(`    - ${mod.name}: ${mod.size} B (${modKb} kB)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
