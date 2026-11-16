/**
 * Astronomical benchmark tolerances implementing Arunodaya specification section 3.2:
 * Sun events within ±1 minute (60s), Solar Noon within ±30s,
 * Moon events within ±2 minutes (120s), and cross-check tolerances (Proposed).
 */
export const TOLERANCES = {
  sunSeconds: 60,
  solarNoonSeconds: 30,
  moonSeconds: 120,
  phaseFraction: 0.003,
  illumination: 0.005,
  crossCheckSunSeconds: 30,
  crossCheckMoonSeconds: 90,
};
