import { describe, expect, it } from 'vitest';
import {
  createBundleAnalyzerPlugin,
  formatBundleReport,
  groupModuleId,
} from '../lib/bundle-report.mjs';

describe('bundle-report logic', () => {
  it('groupModuleId groups npm packages from node_modules paths', () => {
    expect(groupModuleId('/work/node_modules/react/index.js')).toBe('npm:react');
    expect(groupModuleId('D:\\work\\node_modules\\react-dom\\client.js')).toBe('npm:react-dom');
    expect(groupModuleId('/node_modules/@vitejs/plugin-react/dist/index.mjs')).toBe(
      'npm:@vitejs/plugin-react',
    );
  });

  it('groupModuleId preserves workspace application and package source paths', () => {
    expect(groupModuleId('D:\\Sem4 vac\\arunodaya-solar-events\\apps\\app\\src\\main.tsx')).toBe(
      'apps/app/src/main.tsx',
    );
    expect(groupModuleId('/repo/packages/engine/src/astro/astro-day.ts')).toBe(
      'packages/engine/src/astro/astro-day.ts',
    );
    expect(groupModuleId('/other/path/virtual.js')).toBe('virtual.js');
    expect(groupModuleId('')).toBe('unknown');
  });

  it('createBundleAnalyzerPlugin computes raw, gzip size and top modules', () => {
    let captured = [];
    const plugin = createBundleAnalyzerPlugin((res) => {
      captured = res;
    });

    const fakeBundle = {
      'main.js': {
        type: 'chunk',
        code: 'console.log("hello arunodaya bundle analyzer");',
        modules: {
          '/repo/apps/app/src/main.tsx': { renderedLength: 100 },
          '/repo/node_modules/react/index.js': { renderedLength: 500 },
        },
      },
      'style.css': {
        type: 'asset',
        source: 'body { margin: 0; }',
      },
    };

    // @ts-expect-error generateBundle signature in mock
    plugin.generateBundle({}, fakeBundle);

    expect(captured.length).toBe(1);
    expect(captured[0]?.fileName).toBe('main.js');
    expect(captured[0]?.rawSize).toBeGreaterThan(0);
    expect(captured[0]?.gzipSize).toBeGreaterThan(0);
    expect(captured[0]?.topModules[0]?.name).toBe('npm:react');
    expect(captured[0]?.topModules[0]?.size).toBe(500);
  });

  it('formatBundleReport produces readable summary text', () => {
    const report = {
      target: 'pages',
      chunks: [
        {
          fileName: 'assets/main.js',
          rawSize: 1024,
          gzipSize: 512,
          topModules: [{ name: 'npm:react', size: 800 }],
        },
      ],
    };
    const formatted = formatBundleReport(report);
    expect(formatted).toContain("=== BUNDLE ANALYSIS: Target 'pages' ===");
    expect(formatted).toContain('assets/main.js');
    expect(formatted).toContain('npm:react');
  });
});
