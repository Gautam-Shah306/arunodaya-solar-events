import { describe, expect, it } from 'vitest';
import { createFrozenClock, createOffsetClock, createSystemClock } from '../src/core/clock.js';
import { parseDebugParams } from '../src/core/debug.js';

describe('Clock and Debug Parameters', () => {
  it('system clock returns an integer millisecond instant', () => {
    const clock = createSystemClock();
    const t = clock.nowMs();
    expect(Number.isInteger(t)).toBe(true);
    expect(t).toBeGreaterThan(1700000000000);
  });

  it('offset clock continues from the simulated start', () => {
    let mockTime = 1000;
    const baseClock = {
      now() {
        return mockTime;
      },
      nowMs() {
        return mockTime;
      },
    };

    const simulatedStart = 1763164800000;
    const offsetClock = createOffsetClock(baseClock, simulatedStart);

    expect(offsetClock.nowMs()).toBe(simulatedStart);
    mockTime += 5000;
    expect(offsetClock.nowMs()).toBe(simulatedStart + 5000);
  });

  it('frozen clock does not advance', () => {
    const frozenMs = 1763164800000;
    const frozen = createFrozenClock(frozenMs);
    expect(frozen.nowMs()).toBe(frozenMs);
    expect(frozen.nowMs()).toBe(frozenMs);
  });

  it('debug params are empty when debug is disabled', () => {
    const search = '?now=2026-11-17T06:40&theme=pack-navy&clock=24h&freeze=1';
    const params = parseDebugParams(search, false);
    expect(params).toEqual({});
  });

  it('debug now parameter is read as IST and converted to an instant', () => {
    // 2026-11-17 06:40:00 IST:
    // IST day start 2026-11-17 00:00 IST = 1763317800000 ms (or exact epoch ms)
    // 6 * 3600 + 40 * 60 = 24000 seconds = 24_000_000 ms
    const search = '?now=2026-11-17T06:40';
    const params = parseDebugParams(search, true);
    expect(params.nowMs).toBeDefined();

    // Verify round-trip conversion to IST parts:
    // 06:40 in IST
    const instant = params.nowMs!;
    const istOffsetMs = 19800000;
    const istMs = instant + istOffsetMs;
    const dayMs = istMs % 86400000;
    const totalMinutes = Math.floor(dayMs / 60000);
    expect(Math.floor(totalMinutes / 60)).toBe(6);
    expect(totalMinutes % 60).toBe(40);
  });

  it('debug now parameter rejects malformed values', () => {
    expect(parseDebugParams('?now=invalid', true).nowMs).toBeUndefined();
    expect(parseDebugParams('?now=2026-13-40T25:70', true).nowMs).toBeUndefined();
    expect(parseDebugParams('?now=2026-11-17', true).nowMs).toBeUndefined();
  });

  it('debug theme parameter accepts only known theme ids', () => {
    expect(parseDebugParams('?theme=pack-navy', true).themeId).toBe('pack-navy');
    expect(parseDebugParams('?theme=pack-sandstone', true).themeId).toBe('pack-sandstone');
    expect(parseDebugParams('?theme=unknown-pack', true).themeId).toBeUndefined();
    expect(parseDebugParams('?theme=', true).themeId).toBeUndefined();
  });

  it('debug clock parameter accepts 12h and 24h only', () => {
    expect(parseDebugParams('?clock=12h', true).clockFormat).toBe('12h');
    expect(parseDebugParams('?clock=24h', true).clockFormat).toBe('24h');
    expect(parseDebugParams('?clock=36h', true).clockFormat).toBeUndefined();
    expect(parseDebugParams('?clock=invalid', true).clockFormat).toBeUndefined();
  });
});
