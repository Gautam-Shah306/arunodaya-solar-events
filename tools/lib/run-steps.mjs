/**
 * Runs an array of steps in order
 * @param {string[]} steps
 * @param {(step: string) => { status: number }} spawnFn
 * @param {{ bail?: boolean }} [options]
 * @returns {number} 0 if all steps passed, 1 if any step failed
 */
export function runSteps(steps, spawnFn, { bail = false } = {}) {
  let anyFailed = false;
  /** @type {Array<{ step: string, status: number }>} */
  const results = [];

  for (const step of steps) {
    const res = spawnFn(step);
    const status = res.status;
    results.push({ step, status });

    if (status !== 0) {
      anyFailed = true;
      if (bail) {
        break;
      }
    }
  }

  runSteps.lastResults = results;
  return anyFailed ? 1 : 0;
}

/** @type {Array<{ step: string, status: number }>} */
runSteps.lastResults = [];
