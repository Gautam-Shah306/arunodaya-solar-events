import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPreviewServer } from '../lib/preview.mjs';

describe('preview server API', () => {
  let tempRoot = '';

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arunodaya-preview-test-'));
    const pagesDir = path.join(tempRoot, 'dist', 'pages');
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.writeFileSync(
      path.join(pagesDir, 'index.html'),
      '<!doctype html><html><body>preview ok</body></html>',
      'utf8',
    );
  });

  afterAll(() => {
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('throws clearly when target dist directory is missing', async () => {
    await expect(
      // @ts-expect-error test non-existent target
      startPreviewServer({ appRoot: tempRoot, target: 'nonexistent-target' }),
    ).rejects.toThrow(/Dist directory does not exist/);
  });

  it('starts server on 127.0.0.1, serves CSP headers, and closes cleanly', async () => {
    // Test with default target = pages against isolated fixture
    const serverDefault = await startPreviewServer({ appRoot: tempRoot });
    expect(serverDefault.url).toContain('127.0.0.1');
    await serverDefault.close();

    const server = await startPreviewServer({ appRoot: tempRoot, target: 'pages', port: 0 });
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
          resolve(undefined);
        })
        .on('error', reject);
    });

    await server.close();
  });
});
