import path from 'node:path';
import { runVerifyLinux } from './lib/verify-linux.mjs';

const repoRoot = path.resolve('.');
const toolchainPath = path.join(repoRoot, 'docs', 'TOOLCHAIN.md');

const exitCode = runVerifyLinux({ repoRoot, toolchainPath });
process.exit(exitCode);
