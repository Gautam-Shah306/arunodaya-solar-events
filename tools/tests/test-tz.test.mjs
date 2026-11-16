import { describe, expect, it } from 'vitest';
import {
  TARGET_TIMEZONES,
  buildVitestArgs,
  buildVitestCommand,
  defaultTzRunner,
  runTestTz,
} from '../lib/test-tz.mjs';

describe('Timezone matrix runner', () => {
  it('test:tz covers UTC IST and extreme offset zones', () => {
    expect(TARGET_TIMEZONES).toEqual([
      'UTC',
      'Asia/Kolkata',
      'America/Los_Angeles',
      'Pacific/Kiritimati',
      'Pacific/Pago_Pago',
      'Europe/London',
    ]);
  });

  it('test:tz builds a vitest command limited to the packages project', () => {
    const args = buildVitestArgs();
    expect(args).toEqual(['vitest', 'run', '--project=packages']);

    const cmdObj = buildVitestCommand();
    expect(cmdObj.args).toEqual(['vitest', 'run', '--project=packages']);
    expect(cmdObj.cmd).toMatch(/npx(\.cmd)?/);

    const dummySpawn = () => ({ status: 0 });
    expect(defaultTzRunner('UTC', dummySpawn)).toEqual({ status: 0 });
    const errSpawn = () => ({ status: null, error: new Error('fail') });
    expect(defaultTzRunner('UTC', errSpawn)).toEqual({ status: 1 });
  });

  it('test:tz fails when any zone fails', () => {
    const logs = [];
    const errors = [];
    const logger = (msg) => logs.push(String(msg));
    const errorLogger = (msg) => errors.push(String(msg));

    const runner = (tz) => {
      if (tz === 'Pacific/Kiritimati') {
        return { status: 1 };
      }
      return { status: 0 };
    };

    const code = runTestTz({
      zones: ['UTC', 'Pacific/Kiritimati'],
      runner,
      logger,
      errorLogger,
    });

    expect(code).toBe(1);
    expect(logs).toContain('[test:tz] UTC: PASS');
    expect(errors).toContain('[test:tz] Pacific/Kiritimati: FAIL');
  });

  it('test:tz passes when every zone passes', () => {
    const logs = [];
    const errors = [];
    const logger = (msg) => logs.push(String(msg));
    const errorLogger = (msg) => errors.push(String(msg));

    const runner = () => ({ status: 0 });

    const code = runTestTz({
      zones: ['UTC', 'Asia/Kolkata', 'Europe/London'],
      runner,
      logger,
      errorLogger,
    });

    expect(code).toBe(0);
    expect(errors).toHaveLength(0);
    expect(logs).toContain('[test:tz] UTC: PASS');
    expect(logs).toContain('[test:tz] Asia/Kolkata: PASS');
    expect(logs).toContain('[test:tz] Europe/London: PASS');
  });
});
