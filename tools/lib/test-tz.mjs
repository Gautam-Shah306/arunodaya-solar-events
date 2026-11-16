import { spawnSync } from 'node:child_process';

export const TARGET_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/Los_Angeles',
  'Pacific/Kiritimati',
  'Pacific/Pago_Pago',
  'Europe/London',
];

/**
 * Builds the arguments array for vitest limited to packages project
 * @returns {string[]}
 */
export function buildVitestArgs() {
  return ['vitest', 'run', '--project=packages'];
}

/**
 * Builds the spawn command and arguments for vitest on the current platform
 * @returns {{ cmd: string, args: string[], shell: boolean }}
 */
export function buildVitestCommand() {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npx.cmd' : 'npx';
  return {
    cmd,
    args: buildVitestArgs(),
    shell: isWin,
  };
}

/**
 * Default runner spawning vitest for a single timezone
 * @param {string} tz
 * @param {(cmd: string, args: string[], options: object) => import('node:child_process').SpawnSyncReturns<Buffer>} [spawnFn]
 * @returns {{ status: number }}
 */
export function defaultTzRunner(tz, spawnFn = spawnSync) {
  const { cmd, args, shell } = buildVitestCommand();
  const res = spawnFn(cmd, args, {
    env: { ...process.env, TZ: tz },
    stdio: 'inherit',
    shell,
  });
  return { status: res.status ?? (res.error ? 1 : 0) };
}

/**
 * Executes packages tests across the timezone matrix
 * @param {{
 *   zones?: string[],
 *   runner?: (tz: string) => { status: number },
 *   logger?: (...args: unknown[]) => void,
 *   errorLogger?: (...args: unknown[]) => void
 * }} [options]
 * @returns {number} 0 if all zones pass, 1 if any fails
 */
export function runTestTz({
  zones = TARGET_TIMEZONES,
  runner = defaultTzRunner,
  logger = console.log,
  errorLogger = console.error,
} = {}) {
  let anyFailed = false;

  for (const tz of zones) {
    const res = runner(tz);
    const pass = res.status === 0;
    if (pass) {
      logger(`[test:tz] ${tz}: PASS`);
    } else {
      errorLogger(`[test:tz] ${tz}: FAIL`);
      anyFailed = true;
    }
  }

  return anyFailed ? 1 : 0;
}
