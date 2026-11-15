import { describe, expect, it } from 'vitest';
import { runSteps } from '../lib/run-steps.mjs';

describe('runSteps', () => {
  it('runSteps returns 0 when all steps pass', () => {
    const steps = ['step1', 'step2'];
    const spawnFn = () => ({ status: 0 });
    const code = runSteps(steps, spawnFn);
    expect(code).toBe(0);
  });

  it('runSteps returns 1 when any step fails', () => {
    const steps = ['step1', 'step2'];
    const spawnFn = (step) => ({ status: step === 'step2' ? 1 : 0 });
    const code = runSteps(steps, spawnFn);
    expect(code).toBe(1);
  });

  it('runSteps stops after the first failure only when bail is set', () => {
    const steps = ['step1', 'step2', 'step3'];
    const callsWithoutBail = [];
    const spawnWithoutBail = (step) => {
      callsWithoutBail.push(step);
      return { status: step === 'step1' ? 1 : 0 };
    };
    const codeWithoutBail = runSteps(steps, spawnWithoutBail, { bail: false });
    expect(codeWithoutBail).toBe(1);
    expect(callsWithoutBail).toEqual(['step1', 'step2', 'step3']);

    const callsWithBail = [];
    const spawnWithBail = (step) => {
      callsWithBail.push(step);
      return { status: step === 'step1' ? 1 : 0 };
    };
    const codeWithBail = runSteps(steps, spawnWithBail, { bail: true });
    expect(codeWithBail).toBe(1);
    expect(callsWithBail).toEqual(['step1']);
  });
});
