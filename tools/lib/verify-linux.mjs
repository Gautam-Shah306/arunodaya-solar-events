import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { walkRepoFiles } from './invariants/walk.mjs';

/**
 * Returns tracked and untracked non-ignored files using git ls-files.
 * Forward-slash relative paths are returned.
 * Falls back to walking non-ignored repository files when git binary is unavailable.
 * @param {string} repoRoot
 * @param {{ spawnFn?: typeof spawnSync }} [options]
 * @returns {string[]}
 */
export function getProjectFiles(repoRoot, { spawnFn = spawnSync } = {}) {
  try {
    const res = spawnFn('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    if (!res.error && res.status === 0) {
      const raw = res.stdout || '';
      return raw
        .split('\0')
        .filter((f) => f.length > 0 && fs.existsSync(path.join(repoRoot, f)))
        .map((f) => f.replace(/\\/g, '/'));
    }
  } catch {
    // Fall back to filesystem walk if git fails or is unavailable
  }

  return walkRepoFiles(repoRoot);
}

/**
 * Extracts the Linux Node image string with sha256 digest from docs/TOOLCHAIN.md.
 * Throws a clear error if missing or malformed.
 * @param {string} toolchainDocPath
 * @returns {string}
 */
export function getLinuxImageDigest(toolchainDocPath) {
  if (!fs.existsSync(toolchainDocPath)) {
    throw new Error(`Toolchain documentation not found at: ${toolchainDocPath}`);
  }

  const content = fs.readFileSync(toolchainDocPath, 'utf8');
  const match = content.match(/node:24-bookworm-slim@sha256:[a-f0-9]{64}/);
  if (!match) {
    throw new Error(
      `No valid Linux Node image digest (node:24-bookworm-slim@sha256:<64-hex>) found in ${toolchainDocPath}`,
    );
  }

  return match[0];
}

/**
 * Builds the docker run argument array for spawning the container.
 * No double quotes inside arguments.
 * @param {{ workDir: string, image: string, volumeName: string }} options
 * @returns {string[]}
 */
export function buildDockerArgs({ workDir, image, volumeName }) {
  return [
    'run',
    '--rm',
    '-v',
    workDir + ':/work',
    '-v',
    volumeName + ':/work/node_modules',
    '-w',
    '/work',
    image,
    'sh',
    '-c',
    'npm ci && npm run verify',
  ];
}

/**
 * Copies files preserving relative paths.
 * @param {string[]} fileList
 * @param {string} sourceRoot
 * @param {string} destDir
 */
export function copyProjectFiles(fileList, sourceRoot, destDir) {
  for (const relPath of fileList) {
    const src = path.join(sourceRoot, relPath);
    if (!fs.existsSync(src)) {
      continue;
    }
    const dest = path.join(destDir, relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

/**
 * Orchestrates Linux verification in a clean temporary directory mounted into Docker.
 * @param {{ repoRoot?: string, toolchainPath?: string, dockerVolume?: string, dockerRunner?: typeof spawnSync }} [options]
 * @returns {number} Exit code of the docker process
 */
export function runVerifyLinux({
  repoRoot = process.cwd(),
  toolchainPath = path.join(repoRoot, 'docs', 'TOOLCHAIN.md'),
  dockerVolume = 'arunodaya-linux-modules',
  dockerRunner = spawnSync,
} = {}) {
  const image = getLinuxImageDigest(toolchainPath);
  console.log(`[verify:linux] Using digest-pinned Linux image: ${image}`);

  console.log('[verify:linux] Gathering tracked and non-ignored files...');
  const files = getProjectFiles(repoRoot);
  console.log(`[verify:linux] Found ${files.length} project files.`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arunodaya-linux-verify-'));
  console.log(`[verify:linux] Staging repository files to: ${tempDir}`);

  try {
    copyProjectFiles(files, repoRoot, tempDir);
    console.log('[verify:linux] Files staged. Launching Docker container...');

    const dockerArgs = buildDockerArgs({
      workDir: tempDir,
      image,
      volumeName: dockerVolume,
    });

    const res = dockerRunner('docker', dockerArgs, {
      stdio: 'inherit',
    });

    const exitCode = res.status ?? (res.error ? 1 : 0);
    console.log(`[verify:linux] Docker container finished with exit code ${exitCode}.`);
    return exitCode;
  } finally {
    console.log(`[verify:linux] Cleaning up staging directory: ${tempDir}`);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
