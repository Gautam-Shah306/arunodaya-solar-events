/**
 * Geographic observer coordinates.
 * Elevation is optional and stored for display, but ignored in v1 calculations.
 */
export interface Observer {
  lat: number;
  lon: number;
  elevationM?: number | undefined;
}

/**
 * Structured astronomy computation errors.
 */
export interface AstroError {
  code:
    'invalid_observer' | 'invalid_date' | 'unsupported_date' | 'event_missing' | 'invalid_input';
  kind?: string;
  istDate?: string;
  message: string;
}

/**
 * Astronomical calculation results for an observer on a single IST civil date.
 * All instants are exact integer epoch milliseconds.
 */
export interface AstroDay {
  istDate: string;
  sunrise: number;
  sunset: number;
  solarNoon: number;
  civilDawn: number;
  civilDusk: number;
  sun6Morning: number;
  sun6Evening: number;
  moonrise: number[];
  moonset: number[];
  moonPhase: {
    fraction: number;
    illumination: number;
  };
}

/**
 * Astronomical accuracy tiers based on empirical Delta T predictability.
 */
export type AccuracyTier = 'standard' | 'approximate' | 'unsupported';
