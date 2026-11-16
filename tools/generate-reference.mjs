import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { buildReferenceDockerArgs } from './lib/reference-docker.mjs';

const repoRoot = path.resolve('.');
const dockerArgs = buildReferenceDockerArgs({
  repoRoot,
  argv: process.argv.slice(2),
});

console.log('[reference:generate] Launching Python reference container...');
const res = spawnSync('docker', dockerArgs, {
  stdio: 'inherit',
});

const exitCode = res.status ?? (res.error ? 1 : 0);
process.exit(exitCode);
