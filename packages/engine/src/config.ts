/**
 * Engine configuration constants.
 * Values marked Proposed follow ARUNODAYA-SPEC.md and can be tuned without breaking the contract.
 */

/**
 * Fixed Navkarshi offset after exact sunrise in minutes.
 * (Decided: strictly 48 minutes / 2 ghatis per Jain tradition).
 */
export const NAVKARSHI_OFFSET_MINUTES = 48 as const;

/**
 * Greeting boundary configuration.
 */
export const GREETING = {
  /**
   * Morning start time in minutes since midnight IST (04:00 IST = 240).
   * (Decided per spec §5.2).
   */
  morningStartMinuteOfDay: 240,

  /**
   * Fixed evening anchor in minutes since midnight IST (17:00 IST = 1020).
   * (Decided per spec §5.2).
   */
  fixedEveningStartMinuteOfDay: 1020,

  /**
   * Evening duration after sunset in minutes (180 minutes = 3 hours).
   * (Proposed per spec §5.2).
   */
  eveningLengthAfterSunsetMinutes: 180,

  /**
   * Whether evening starts at the earlier of fixed 17:00 IST or sunset.
   * If true, evening begins at sunset when sunset is earlier than 17:00 (e.g. Northeast India winter).
   * (Proposed per spec §5.2).
   */
  eveningStartsAtEarlierOfFixedAndSunset: true,
} as const;

/**
 * Supported calendar year range for IST astronomical calculations.
 * (Proposed per spec §3.1).
 */
export const SUPPORTED_YEARS = {
  first: 2000,
  last: 2100,
} as const;

/**
 * Snapshot precomputation and expiration horizon policy.
 * (Proposed per spec §8.2 and §10.1).
 */
export const SNAPSHOT_POLICY = {
  /**
   * Historical days included prior to the generation date (strictly 1).
   */
  daysBehind: 1,

  /**
   * Future days precomputed ahead of the generation date (default 90).
   */
  daysAhead: 90,

  /**
   * Threshold in whole days before the horizon ends when status transitions to 'expiring' (7 days).
   * (Proposed per spec §8.2).
   */
  expiringWithinDays: 7,
} as const;
