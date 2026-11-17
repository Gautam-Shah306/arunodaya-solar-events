import { execSync } from 'node:child_process';

console.log('Running Arunodaya Real-Browser E2E Tests...');
try {
  execSync('npx vitest run --project=e2e', { stdio: 'inherit' });
} catch (err) {
  const status =
    err && typeof err === 'object' && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 1;
  process.exit(status);
}
