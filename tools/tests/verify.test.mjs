import { describe, expect, it } from 'vitest';
import { runVerify, stripAnsi } from '../verify.mjs';

describe('Verification pipeline runner and output formatting', () => {
  it('verify prints the tail of a failing step after the summary', () => {
    const logs = [];
    const logger = (msg) => logs.push(String(msg));
    const errorLogger = (msg) => logs.push(String(msg));

    const runner = (step) => {
      if (step === 'fail-step') {
        const lines = [];
        for (let i = 1; i <= 100; i++) {
          lines.push(`output line ${i}`);
        }
        return { status: 1, duration: '0.2', output: lines.join('\n') };
      }
      return { status: 0, duration: '0.1', output: 'ok' };
    };

    const exitCode = runVerify({
      steps: ['pass-step', 'fail-step'],
      runner,
      logger,
      errorLogger,
      argv: [],
    });

    expect(exitCode).toBe(1);
    const combined = logs.join('\n');

    expect(combined).toContain('---- last 80 lines of fail-step ----');
    expect(combined).toContain('output line 100');
    expect(combined).toContain('output line 21');
    expect(combined).not.toContain('output line 20\n');
  });

  it('verify prints no failure excerpt when every step passes', () => {
    const logs = [];
    const logger = (msg) => logs.push(String(msg));
    const errorLogger = (msg) => logs.push(String(msg));

    const runner = () => ({ status: 0, duration: '0.1', output: 'all good' });

    const exitCode = runVerify({
      steps: ['pass-one', 'pass-two'],
      runner,
      logger,
      errorLogger,
      argv: [],
    });

    expect(exitCode).toBe(0);
    const combined = logs.join('\n');

    expect(combined).toContain('All verification steps PASSED.');
    expect(combined).not.toContain('---- last 80 lines of');
  });

  it('verify failure excerpt strips ANSI escape sequences', () => {
    const rawAnsi =
      '\u001b[31m\u001b[1mError:\u001b[22m\u001b[39m \u001b[33mTest failed!\u001b[39m';
    expect(stripAnsi(rawAnsi)).toBe('Error: Test failed!');

    const logs = [];
    const logger = (msg) => logs.push(String(msg));
    const errorLogger = (msg) => logs.push(String(msg));

    const runner = () => ({
      status: 1,
      duration: '0.1',
      output: `Some header\n${rawAnsi}\nSome footer`,
    });

    runVerify({
      steps: ['failing-ansi-step'],
      runner,
      logger,
      errorLogger,
      argv: [],
    });

    const combined = logs.join('\n');
    expect(combined).toContain('---- last 80 lines of failing-ansi-step ----');
    expect(combined).toContain('Error: Test failed!');
    expect(combined).not.toContain('\u001b[');
    expect(combined).not.toContain('\x1b[');
  });
});
