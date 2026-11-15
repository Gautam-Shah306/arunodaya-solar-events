import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildDockerArgs,
  copyProjectFiles,
  getLinuxImageDigest,
  getProjectFiles,
  runVerifyLinux,
} from '../lib/verify-linux.mjs';

const repoRoot = path.resolve('.');

describe('One-command Linux verification helpers', () => {
  it('verify:linux lists tracked and untracked non-ignored files only', () => {
    const files = getProjectFiles(repoRoot);
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(10);

    // Tracked and non-ignored files must be included
    expect(files).toContain('package.json');
    expect(files).toContain('README.md');
    expect(files).toContain('docs/spec/ARUNODAYA-SPEC.md');

    // Ignored or internal directories must never be included
    for (const f of files) {
      expect(f).not.toContain('\\');
      expect(f.startsWith('node_modules/')).toBe(false);
      expect(f.startsWith('.git/')).toBe(false);
    }
  });

  it('verify:linux builds docker run arguments without double quotes', () => {
    const args = buildDockerArgs({
      workDir: '/path/to/work',
      image:
        'node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54',
      volumeName: 'test-volume',
    });

    expect(args).toEqual([
      'run',
      '--rm',
      '-v',
      '/path/to/work:/work',
      '-v',
      'test-volume:/work/node_modules',
      '-w',
      '/work',
      'node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54',
      'sh',
      '-c',
      'npm ci && npm run verify',
    ]);

    for (const arg of args) {
      expect(arg).not.toContain('"');
    }
  });

  it('verify:linux uses the digest-pinned image recorded in the toolchain doc', () => {
    const toolchainDocPath = path.join(repoRoot, 'docs', 'TOOLCHAIN.md');
    const digest = getLinuxImageDigest(toolchainDocPath);

    expect(digest).toMatch(/^node:24-bookworm-slim@sha256:[a-f0-9]{64}$/);
    expect(digest).toBe(
      'node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54',
    );
  });

  it('verify:linux fails clearly when no image digest is recorded', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arunodaya-toolchain-test-'));
    const dummyPath = path.join(tempDir, 'TOOLCHAIN.md');
    try {
      fs.writeFileSync(dummyPath, '# Toolchain\nNo image digest here.\n', 'utf8');
      expect(() => getLinuxImageDigest(dummyPath)).toThrow(/No valid Linux Node image digest/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('getLinuxImageDigest throws when toolchain doc does not exist', () => {
    const nonExistent = path.join(os.tmpdir(), 'missing-toolchain-doc-file.md');
    expect(() => getLinuxImageDigest(nonExistent)).toThrow(/Toolchain documentation not found at:/);
  });

  it('getProjectFiles falls back to filesystem walk when git fails or throws', () => {
    const failingSpawn = () => ({ error: new Error('git missing'), status: 1 });
    const files = getProjectFiles(repoRoot, { spawnFn: failingSpawn });
    expect(Array.isArray(files)).toBe(true);
    expect(files).toContain('package.json');

    const throwingSpawn = () => {
      throw new Error('spawn failure');
    };
    const filesFallback = getProjectFiles(repoRoot, { spawnFn: throwingSpawn });
    expect(Array.isArray(filesFallback)).toBe(true);
    expect(filesFallback).toContain('package.json');
  });

  it('copyProjectFiles copies files and skips missing sources safely', () => {
    const tmpSrc = fs.mkdtempSync(path.join(os.tmpdir(), 'src-test-'));
    const tmpDest = fs.mkdtempSync(path.join(os.tmpdir(), 'dest-test-'));
    try {
      fs.mkdirSync(path.join(tmpSrc, 'sub'), { recursive: true });
      fs.writeFileSync(path.join(tmpSrc, 'sub', 'file.txt'), 'hello', 'utf8');

      copyProjectFiles(['sub/file.txt', 'sub/nonexistent.txt'], tmpSrc, tmpDest);

      expect(fs.existsSync(path.join(tmpDest, 'sub', 'file.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(tmpDest, 'sub', 'file.txt'), 'utf8')).toBe('hello');
      expect(fs.existsSync(path.join(tmpDest, 'sub', 'nonexistent.txt'))).toBe(false);
    } finally {
      fs.rmSync(tmpSrc, { recursive: true, force: true });
      fs.rmSync(tmpDest, { recursive: true, force: true });
    }
  });

  it('runVerifyLinux orchestrates staging and execution with exit code', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-orchestrate-'));
    const toolchainDoc = path.join(tmpDir, 'TOOLCHAIN.md');
    fs.writeFileSync(
      toolchainDoc,
      'node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54',
      'utf8',
    );
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content', 'utf8');

    let dockerCalled = false;
    const mockDockerRunner = (cmd, args) => {
      dockerCalled = true;
      expect(cmd).toBe('docker');
      expect(args).toContain('run');
      return { status: 0 };
    };

    try {
      const exitCode = runVerifyLinux({
        repoRoot: tmpDir,
        toolchainPath: toolchainDoc,
        dockerVolume: 'test-vol',
        dockerRunner: mockDockerRunner,
      });

      expect(exitCode).toBe(0);
      expect(dockerCalled).toBe(true);

      const failingRunner = () => ({ status: 2 });
      const failExit = runVerifyLinux({
        repoRoot: tmpDir,
        toolchainPath: toolchainDoc,
        dockerVolume: 'test-vol',
        dockerRunner: failingRunner,
      });
      expect(failExit).toBe(2);

      const errorRunner = () => ({ error: new Error('docker failed') });
      const errExit = runVerifyLinux({
        repoRoot: tmpDir,
        toolchainPath: toolchainDoc,
        dockerVolume: 'test-vol',
        dockerRunner: errorRunner,
      });
      expect(errExit).toBe(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
