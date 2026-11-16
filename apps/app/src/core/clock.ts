import type { Clock } from '@arunodaya/engine';

export type { Clock };

function getNowMs(clock: Clock): number {
  if (typeof clock.nowMs === 'function') {
    return clock.nowMs();
  }
  if (typeof clock.now === 'function') {
    return clock.now();
  }
  return Date.now();
}

/**
 * Creates the production system clock backed by Date.now().
 * Per invariant R8 / INV-CLOCK, this is the single sanctioned call site for Date.now()
 * in the entire application runtime.
 */
export function createSystemClock(): Clock {
  return {
    nowMs(): number {
      return Date.now();
    },
    now(): number {
      return Date.now();
    },
  };
}

/**
 * Creates a clock that starts at simulatedStartMs and advances in lockstep with a base clock.
 *
 * @param base Base clock (typically system clock)
 * @param simulatedStartMs Epoch milliseconds start instant
 */
export function createOffsetClock(base: Clock, simulatedStartMs: number): Clock {
  const baseStart = getNowMs(base);
  return {
    nowMs(): number {
      return simulatedStartMs + (getNowMs(base) - baseStart);
    },
    now(): number {
      return simulatedStartMs + (getNowMs(base) - baseStart);
    },
  };
}

/**
 * Creates a clock that remains permanently frozen at a specific epoch millisecond instant.
 *
 * @param ms Frozen epoch milliseconds instant
 */
export function createFrozenClock(ms: number): Clock {
  return {
    nowMs(): number {
      return ms;
    },
    now(): number {
      return ms;
    },
  };
}
