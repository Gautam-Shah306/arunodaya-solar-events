/**
 * Clock abstraction for deterministic time testing and execution.
 */
export interface Clock {
  /**
   * Returns the current instant in epoch milliseconds.
   */
  nowMs(): number;

  /**
   * Alias for nowMs() for convenient clock compatibility.
   */
  now?(): number;
}

/**
 * Creates an immutable clock returning a fixed instant.
 * @param ms Epoch milliseconds
 */
export function createFixedClock(ms: number): Clock {
  if (!Number.isFinite(ms) || !Number.isInteger(ms)) {
    throw new RangeError(`Clock instant must be a finite integer, got: ${String(ms)}`);
  }
  return {
    nowMs: () => ms,
    now: () => ms,
  };
}

/**
 * Mutable manual clock that can be advanced or set explicitly for testing.
 */
export interface ManualClock extends Clock {
  /**
   * Advances the clock by the specified milliseconds (can be negative).
   * @param ms Milliseconds to advance
   */
  advance(ms: number): void;

  /**
   * Sets the clock to a specific epoch instant.
   * @param ms Epoch milliseconds
   */
  set(ms: number): void;
}

/**
 * Creates a controllable manual clock for simulation and testing.
 * @param startMs Initial epoch milliseconds
 */
export function createManualClock(startMs: number): ManualClock {
  if (!Number.isFinite(startMs) || !Number.isInteger(startMs)) {
    throw new RangeError(`Start instant must be a finite integer, got: ${String(startMs)}`);
  }
  let currentMs = startMs;

  return {
    nowMs: () => currentMs,
    now: () => currentMs,
    advance(ms: number) {
      if (!Number.isFinite(ms) || !Number.isInteger(ms)) {
        throw new RangeError(`Advance milliseconds must be a finite integer, got: ${String(ms)}`);
      }
      currentMs += ms;
    },
    set(ms: number) {
      if (!Number.isFinite(ms) || !Number.isInteger(ms)) {
        throw new RangeError(`Set instant must be a finite integer, got: ${String(ms)}`);
      }
      currentMs = ms;
    },
  };
}
