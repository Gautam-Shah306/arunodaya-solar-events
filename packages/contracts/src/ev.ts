/**
 * Exact and displayed instants of an astronomical or solar event.
 */
export interface Ev {
  /**
   * Exact astronomical instant in milliseconds since the Unix epoch (1970-01-01T00:00:00.000Z).
   */
  readonly exactMs: number;

  /**
   * Display instant in integer milliseconds since epoch, rounded to the nearest minute boundary (multiple of 60000).
   * Direction is determined by event semantics (start events ceil, end events floor).
   */
  readonly displayMs: number;
}
