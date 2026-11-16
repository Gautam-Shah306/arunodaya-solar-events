import type { Ev } from './ev.js';

/**
 * Supported schema version constant for SnapshotV1.
 */
export const SNAPSHOT_SCHEMA_VERSION_V1 = 1 as const;

/**
 * Array of all supported snapshot schema versions.
 */
export const SCHEMA_VERSIONS = [SNAPSHOT_SCHEMA_VERSION_V1] as const;

/**
 * A single solar day record containing astronomical events and solar noon.
 */
export interface DayRecord {
  /**
   * Calendar date in Indian Standard Time (YYYY-MM-DD).
   */
  readonly istDate: string;

  /**
   * Sunrise event. Start-type event rounded up (ceiling).
   */
  readonly sunrise: Ev;

  /**
   * Navkarshi event (exact sunrise + 48 minutes, rounded up).
   */
  readonly navkarshi: Ev;

  /**
   * Sunset event. End-type event rounded down (floor).
   */
  readonly sunset: Ev;

  /**
   * Civil dawn (sun 6 degrees below eastern horizon). Rounded up.
   */
  readonly civilDawn: Ev;

  /**
   * Civil dusk (sun 6 degrees below western horizon). Rounded down.
   */
  readonly civilDusk: Ev;

  /**
   * Instant of solar noon in epoch milliseconds (sun transit across the meridian).
   */
  readonly solarNoonMs: number;

  /**
   * Morning golden hour window.
   */
  readonly goldenMorning: {
    readonly start: Ev;
    readonly end: Ev;
  };

  /**
   * Evening golden hour window.
   */
  readonly goldenEvening: {
    readonly start: Ev;
    readonly end: Ev;
  };

  /**
   * Moon phase and illuminated fraction evaluated at solar noon.
   */
  readonly moonPhaseAtNoon: {
    /**
     * Lunation cycle fraction in [0, 1), where 0 is new moon, 0.25 first quarter, 0.5 full moon, 0.75 last quarter.
     */
    readonly phase: number;

    /**
     * Illuminated disk fraction in [0, 1], where 0 is completely dark and 1 is completely illuminated.
     */
    readonly illumination: number;
  };
}

/**
 * Moonrise or moonset event occurrence.
 */
export interface MoonEvent {
  /**
   * Event kind: 'rise' for moonrise (start-type), 'set' for moonset (end-type).
   */
  readonly kind: 'rise' | 'set';

  /**
   * Exact and displayed instants of the lunar event.
   */
  readonly ev: Ev;
}

/**
 * Location metadata associated with an astronomical snapshot.
 */
export interface SnapshotLocation {
  /**
   * Latitude in degrees, range [-90, 90].
   */
  readonly lat: number;

  /**
   * Longitude in degrees, range [-180, 180].
   */
  readonly lon: number;

  /**
   * Optional elevation in meters above sea level (-500 to 9000 m).
   */
  readonly elevationM?: number | undefined;

  /**
   * Human-readable place label (1 to 80 characters).
   */
  readonly label: string;

  /**
   * Location source: 'gps' | 'last_known' | 'manual'.
   */
  readonly source: 'gps' | 'last_known' | 'manual';

  /**
   * Instant when location coordinates were obtained or fixed in epoch milliseconds.
   */
  readonly fixAtMs: number;

  /**
   * Optional coordinate accuracy radius in meters (>= 0).
   */
  readonly accuracyM?: number | undefined;
}

/**
 * Precomputed multi-day astronomical snapshot payload (Schema Version 1).
 */
export interface SnapshotV1 {
  /**
   * Schema version number, strictly 1 for SnapshotV1.
   */
  readonly schemaVersion: 1;

  /**
   * Timestamp when the snapshot was generated in epoch milliseconds.
   */
  readonly generatedAtMs: number;

  /**
   * Astronomy calculation engine metadata.
   */
  readonly engine: {
    readonly name: string;
    readonly version: string;
  };

  /**
   * Geographic location for which the astronomical data was computed.
   */
  readonly location: SnapshotLocation;

  /**
   * Array of contiguous chronological day records (1 to 400 days).
   */
  readonly days: readonly DayRecord[];

  /**
   * Flat array of lunar rise and set events sorted chronologically by displayMs.
   */
  readonly moonEvents: readonly MoonEvent[];
}
