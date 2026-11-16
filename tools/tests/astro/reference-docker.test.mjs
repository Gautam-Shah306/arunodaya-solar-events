import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildReferenceDockerArgs,
  readPythonImageFromToolchain,
} from '../../lib/reference-docker.mjs';

describe('reference-docker', () => {
  it('reference generator docker arguments use the digest-pinned python image from the toolchain doc', () => {
    const args = buildReferenceDockerArgs({
      repoRoot: 'C:/mock/repo',
      toolchainPath: path.resolve('docs/TOOLCHAIN.md'),
    });
    const pinnedImage = readPythonImageFromToolchain(path.resolve('docs/TOOLCHAIN.md'));
    expect(pinnedImage).toContain('python:3.12-slim@sha256:');
    expect(args).toContain(pinnedImage);
  });

  it('reference generator docker arguments contain no double quotes', () => {
    const args = buildReferenceDockerArgs({
      repoRoot: 'C:/path with spaces/repo',
      forwardedFlags: ['--primary', 'ephem'],
    });
    for (const arg of args) {
      expect(arg).not.toContain('"');
    }
  });

  it('reference generator mounts the repository and named cache volumes', () => {
    const repoPath = 'D:/work/repo';
    const args = buildReferenceDockerArgs({
      repoRoot: repoPath,
      pythonImage: 'python:3.12-slim@sha256:1234567890abcdef',
    });
    expect(args).toContain('-v');
    expect(args).toContain('arunodaya-pip-cache:/root/.cache/pip');
    expect(args).toContain('arunodaya-skyfield-data:/data');
    expect(args).toContain(`${path.resolve(repoPath)}:/work`);
  });

  it('reference generator keeps a repository path with spaces as a single argument', () => {
    const repoWithSpaces = 'C:/my projects/arunodaya solar events';
    const args = buildReferenceDockerArgs({
      repoRoot: repoWithSpaces,
      pythonImage: 'python:3.12-slim@sha256:1234567890abcdef',
    });
    const mountIndex = args.findIndex((a) => a === '-v');
    expect(mountIndex).toBeGreaterThanOrEqual(0);
    const repoMountArg = args[mountIndex + 1];
    expect(repoMountArg).toBe(`${path.resolve(repoWithSpaces)}:/work`);
    // Ensure no space-splitting happened: it is a single string in the args array
    expect(typeof repoMountArg).toBe('string');
  });

  it('reference generator fails clearly when no python image digest is recorded', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arunodaya-test-toolchain-'));
    const mockToolchain = path.join(tmpDir, 'TOOLCHAIN.md');
    fs.writeFileSync(mockToolchain, '# Toolchain without python\n', 'utf8');

    expect(() => {
      buildReferenceDockerArgs({
        repoRoot: 'C:/repo',
        toolchainPath: mockToolchain,
      });
    }).toThrow(/No python image digest recorded/i);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reference generator forwards flags after the double dash', () => {
    const args = buildReferenceDockerArgs({
      repoRoot: 'C:/repo',
      pythonImage: 'python:3.12-slim@sha256:1234567890abcdef',
      argv: ['node', 'generate-reference.mjs', '--', '--primary', 'ephem'],
    });
    const shIndex = args.indexOf('-c');
    expect(shIndex).toBeGreaterThanOrEqual(0);
    const shCommand = args[shIndex + 1];
    expect(shCommand).toContain('--primary ephem');
  });
});
