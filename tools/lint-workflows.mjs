#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { buildActionlintArgs } from './lib/lint-workflows.mjs';

const repoRoot = path.resolve('.');

try {
  const args = buildActionlintArgs({ repoPath: repoRoot });
  const result = spawnSync('docker', args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.error(`Failed to execute docker: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
