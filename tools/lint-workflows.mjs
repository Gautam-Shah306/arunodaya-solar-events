#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { buildActionlintArgs } from './lib/lint-workflows.mjs';

const repoRoot = path.resolve('.');
const workflowsDir = path.join(repoRoot, '.github', 'workflows');

if (fs.existsSync(workflowsDir)) {
  const files = fs
    .readdirSync(workflowsDir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort();
  console.log(`Linting ${files.length} workflow file(s):`);
  for (const f of files) {
    console.log(`  .github/workflows/${f}`);
  }
}

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
