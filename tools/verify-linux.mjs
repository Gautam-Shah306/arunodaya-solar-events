import path from 'node:path';
import { runVerifyLinux } from './lib/verify-linux.mjs';

const repoRoot = path.resolve('.');
const toolchainPath = path.join(repoRoot, 'docs', 'TOOLCHAIN.md');
const isIndex = process.argv.includes('--index');

const exitCode = runVerifyLinux({ repoRoot, toolchainPath, index: isIndex });
process.exit(exitCode);
