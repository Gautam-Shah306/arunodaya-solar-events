import { spawnSync } from 'node:child_process';
import { runSteps } from './lib/run-steps.mjs';

export const VERIFY_STEPS = [
  'check:toolchain',
  'verify:invariants',
  'verify:scenarios',
  'lint',
  'format:check',
  'typecheck',
  'test:coverage',
  'test:tz',
  'test:golden',
  'build:pages',
  'build:android',
  'test:build',
];

/**
 * Strips ANSI escape sequences from a string
 * @param {string} str
 * @returns {string}
 */
export function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

/**
 * Returns the last N lines of a string
 * @param {string} text
 * @param {number} [count=80]
 * @returns {string}
 */
export function getLastLines(text, count = 80) {
  if (!text) return '';
  const lines = text.trimEnd().split(/\r?\n/);
  return lines.slice(-count).join('\n');
}

/**
 * Runs verification pipeline with bounded failure excerpt logging
 * @param {{
 *   steps?: string[],
 *   runner?: ((step: string) => { status: number, duration?: string, output?: string }) | null,
 *   logger?: (...args: unknown[]) => void,
 *   errorLogger?: (...args: unknown[]) => void,
 *   argv?: string[]
 * }} [options]
 * @returns {number} 0 on success, 1 on failure
 */
export function runVerify({
  steps = VERIFY_STEPS,
  runner = null,
  logger = console.log,
  errorLogger = console.error,
  argv = process.argv.slice(2),
} = {}) {
  const bail = argv.includes('--bail') || argv.includes('-b');

  logger(`Starting Arunodaya verification pipeline (${steps.length} steps, bail: ${bail})...\n`);

  /** @type {Array<{ step: string, status: number, duration: string, output?: string | undefined }>} */
  const stepResults = [];
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  /**
   * @param {string} step
   */
  const defaultRunner = (step) => {
    logger(`>>> [STEP] npm run ${step}`);
    const start = Date.now();
    const res = spawnSync(npmCmd, ['run', step], {
      stdio: 'pipe',
      shell: process.platform === 'win32',
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    if (res.stdout) {
      process.stdout.write(res.stdout);
    }
    if (res.stderr) {
      process.stderr.write(res.stderr);
    }
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    const status = res.status ?? 1;
    const output = `${res.stdout || ''}\n${res.stderr || ''}`;
    return { status, duration, output };
  };

  const actualRunner = runner || defaultRunner;

  /**
   * @param {string} step
   */
  const spawnStep = (step) => {
    const res = actualRunner(step);
    const duration = res.duration ?? '0.0';
    const status = res.status ?? 1;
    stepResults.push({ step, status, duration, output: res.output });
    return { status };
  };

  const exitCode = runSteps(steps, spawnStep, { bail });

  logger('\n================ VERIFICATION SUMMARY ================');
  logger('| Step                          | Status | Duration  |');
  logger('|-------------------------------|--------|-----------|');
  for (const r of stepResults) {
    const statusStr = r.status === 0 ? 'PASS  ' : 'FAIL  ';
    const stepStr = r.step.padEnd(29, ' ');
    const durStr = `${r.duration}s`.padEnd(9, ' ');
    logger(`| ${stepStr} | ${statusStr} | ${durStr} |`);
  }
  for (const step of steps) {
    if (!stepResults.some((r) => r.step === step)) {
      const stepStr = step.padEnd(29, ' ');
      logger(`| ${stepStr} | SKIP   | -         |`);
    }
  }
  logger('======================================================');

  if (exitCode === 0) {
    logger('\nAll verification steps PASSED.');
  } else {
    errorLogger('\nVerification FAILED.');
    for (const r of stepResults) {
      if (r.status !== 0 && r.output) {
        const strippedTail = stripAnsi(getLastLines(r.output, 80));
        logger(`\n---- last 80 lines of ${r.step} ----\n${strippedTail}`);
      }
    }
  }

  return exitCode;
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
) {
  process.exit(runVerify());
}
