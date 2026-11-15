import { spawnSync } from 'node:child_process';
import { runSteps } from './lib/run-steps.mjs';

const VERIFY_STEPS = [
  'check:toolchain',
  'verify:invariants',
  'lint',
  'format:check',
  'typecheck',
  'test:coverage',
  'build:pages',
  'build:android',
  'test:build',
];

export function runVerify() {
  const args = process.argv.slice(2);
  const bail = args.includes('--bail') || args.includes('-b');

  console.log(
    `Starting Arunodaya verification pipeline (${VERIFY_STEPS.length} steps, bail: ${bail})...\n`,
  );

  /** @type {Array<{ step: string, status: number, duration: string }>} */
  const stepResults = [];
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  /**
   * @param {string} step
   */
  const spawnStep = (step) => {
    console.log(`>>> [STEP] npm run ${step}`);
    const start = Date.now();
    const res = spawnSync(npmCmd, ['run', step], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    const status = res.status ?? 1;
    stepResults.push({ step, status, duration });
    return { status };
  };

  const exitCode = runSteps(VERIFY_STEPS, spawnStep, { bail });

  console.log('\n================ VERIFICATION SUMMARY ================');
  console.log('| Step                          | Status | Duration  |');
  console.log('|-------------------------------|--------|-----------|');
  for (const r of stepResults) {
    const statusStr = r.status === 0 ? 'PASS  ' : 'FAIL  ';
    const stepStr = r.step.padEnd(29, ' ');
    const durStr = `${r.duration}s`.padEnd(9, ' ');
    console.log(`| ${stepStr} | ${statusStr} | ${durStr} |`);
  }
  for (const step of VERIFY_STEPS) {
    if (!stepResults.some((r) => r.step === step)) {
      const stepStr = step.padEnd(29, ' ');
      console.log(`| ${stepStr} | SKIP   | -         |`);
    }
  }
  console.log('======================================================');

  if (exitCode === 0) {
    console.log('\nAll verification steps PASSED.');
  } else {
    console.error('\nVerification FAILED.');
  }

  return exitCode;
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
) {
  process.exit(runVerify());
}
