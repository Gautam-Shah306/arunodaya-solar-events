import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../build-app.mjs';
import { startPreviewServer } from '../lib/preview.mjs';

describe('preview server API', () => {
  beforeAll(async () => {
    if (!fs.existsSync(path.resolve('apps/app/dist/pages/index.html'))) {
      await buildApp('pages');
    }
  });
  it('throws clearly when target dist directory is missing', async () => {
    // @ts-expect-error test non-existent target
    await expect(startPreviewServer({ target: 'nonexistent-target' })).rejects.toThrow(
      /Dist directory does not exist/,
    );
  });

  it('starts server on 127.0.0.1, serves CSP headers, and closes cleanly', async () => {
    // Test with default options (target = pages)
    const serverDefault = await startPreviewServer();
    expect(serverDefault.url).toContain('127.0.0.1');
    await serverDefault.close();

    const server = await startPreviewServer({ target: 'pages', port: 0 });
    expect(server.url).toContain('127.0.0.1');
    expect(server.port).toBeGreaterThan(0);
    expect(server.base).toBe('/arunodaya-solar-events/');

    // Check CSP header via HTTP request
    await new Promise((resolve, reject) => {
      http
        .get(`${server.url}index.html`, (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers['content-security-policy']).toBeDefined();
          expect(res.headers['content-security-policy']).toContain("default-src 'self'");
          res.resume();
          resolve();
        })
        .on('error', reject);
    });

    await server.close();
  });
});
