import { spawnSync } from 'node:child_process';
import { evaluateToolchain } from './lib/toolchain.mjs';

export function checkToolchain() {
  const nodeVersion = process.version;
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npmRes = spawnSync(npmCmd, ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (npmRes.status !== 0) {
    console.error('Failed to execute npm --version:', npmRes.stderr || npmRes.stdout);
    return 1;
  }

  const npmVersion = npmRes.stdout.trim();
  const errors = evaluateToolchain({ nodeVersion, npmVersion });

  if (errors.length > 0) {
    console.error('Toolchain validation failed:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    return 1;
  }

  console.log(`Toolchain verified: Node ${nodeVersion}, npm ${npmVersion}`);
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
) {
  process.exit(checkToolchain());
}
