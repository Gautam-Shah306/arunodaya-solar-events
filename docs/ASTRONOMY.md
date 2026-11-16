# Astronomical Conventions and Engine Reference

This document establishes the canonical astronomical conventions for Arunodaya, the reference dataset methodology, and the benchmark evaluation comparing candidate computation engines (`astronomy-engine` and `suncalc`).

## Conventions

All astronomical calculations and reference evaluations in Arunodaya adhere to the following definitions:

1. **Instants and Epoch**: All event instants are UTC epoch milliseconds (POSIX time, integer milliseconds since 1970-01-01T00:00:00.000Z, no leap seconds counted).
2. **Observer Coordinates**: The observer position is defined by geodetic latitude and east longitude on the WGS84 sea-level reference ellipsoid. Observer elevation does **not** change sunrise or sunset in v1 (Proposed; reason: printed calendars use the standard horizon and terrain-obstructed visibility is out of scope per spec section 3.2).
3. **Sunrise and Sunset**: The moments when the Sun's upper limb touches the astronomical horizon under standard atmospheric refraction of 34 arcminutes (equivalent to the Sun's centre at -34 arcminutes minus its apparent semidiameter, approximately -0.833 degrees).
4. **Moonrise and Moonset**: The moments when the Moon's upper limb touches the astronomical horizon, incorporating standard 34 arcminutes atmospheric refraction and topocentric lunar parallax.
5. **Civil Dawn and Dusk**: The moments when the geometric centre of the Sun is at exactly -6.0 degrees altitude without atmospheric refraction.
6. **Golden Hour Thresholds**: The moments when the geometric centre of the Sun is at exactly +6.0 degrees altitude without atmospheric refraction (`sun6Morning` when rising, `sun6Evening` when setting).
7. **Solar Noon**: The instant of the Sun's upper meridian transit across the observer's celestial meridian.
8. **Moon Phase and Illumination**: Evaluated at 12:00 IST (noon) on the given calendar date. Moon phase is defined as the lunation fraction in `[0, 1)` derived from the geocentric apparent ecliptic longitude difference (Moon minus Sun) divided by 360 degrees (0 at new moon, 0.5 at full moon). Illumination is the illuminated fraction of the lunar disc in `[0, 1]`.
9. **Day Attribution**: An astronomical event belongs to the IST calendar day (`[00:00 IST, next 00:00 IST)`) in which its exact instant occurs. A given IST calendar day may contain zero moonrises or zero moonsets (or two in rare circumstances).

## Reference Method

1. **Primary Reference**: Skyfield (Python 3.12, Skyfield 1.55) driving the NASA/JPL DE440s high-accuracy planetary ephemeris kernel (`de440s.bsp`, SHA-256: `c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2`, 32,726,016 bytes). Built-in timescale (`ts = load.timescale(builtin=True)`) guarantees full reproducibility without remote delta T downloads.
2. **Skyfield API Calls**:
   - Observer: `obs = wgs84.latlon(lat, lon)` with elevation 0.
   - Sunrise/Sunset: `almanac.risings_and_settings(eph, eph['sun'], obs, horizon_degrees=-50.0/60.0)` where -50' comprises -34' refraction and -16' mean solar semidiameter.
   - Solar Noon: `almanac.meridian_transits(eph, eph['sun'], obs)` taking culmination transit events (`1`).
   - Civil Dawn/Dusk: `almanac.risings_and_settings(eph, eph['sun'], obs, horizon_degrees=-6.0)`.
   - Golden Hour: `almanac.risings_and_settings(eph, eph['sun'], obs, horizon_degrees=6.0)`.
   - Moonrise/Moonset: `almanac.risings_and_settings(eph, eph['moon'], obs, horizon_degrees=-0.825667)` using mean lunar radius 0.2590° and 34' refraction.
   - Moon Phase/Illumination: evaluated at 12:00:00 IST using `almanac.moon_phase(eph, t_noon).degrees / 360.0` and `almanac.fraction_illuminated(eph, 'moon', t_noon)`.
3. **Secondary Cross-Check (PyEphem 4.2.1)**:
   Executed across all 2,814 city-days using:
   - `obs.pressure = 0`, `obs.elevation = 0`.
   - Sunrise / Sunset: `obs.horizon = '-0:34'`, `use_center = False`.
   - Solar Noon: `obs.next_transit(sun)`.
   - Civil Dawn / Dusk: `obs.horizon = '-6'`, `use_center = True`.
   - Golden Hour: `obs.horizon = '6'`, `use_center = True`.
   - Moonrise / Moonset: `obs.horizon = '-0:34'`, `use_center = False`.
   - Moon Phase: `ephem.Ecliptic(moon).lon - ephem.Ecliptic(sun).lon` and `moon.moon_phase`.
4. **Cross-Check Results**:
   Every event kind met all cross-check tolerances (sun kinds <= 30s, solar noon <= 30s, moon kinds <= 90s):
   - `sunrise`: n=2814, max=28.4s, mean=0.8s
   - `sunset`: n=2814, max=25.9s, mean=0.9s
   - `solarNoon`: n=2814, max=27.1s, mean=0.1s
   - `civilDawn`: n=2814, max=27.1s, mean=0.2s
   - `civilDusk`: n=2814, max=27.1s, mean=0.2s
   - `sun6Morning`: n=2814, max=27.1s, mean=0.2s
   - `sun6Evening`: n=2814, max=27.1s, mean=0.1s
   - `moonrise`: n=2717, max=26.9s, mean=2.8s
   - `moonset`: n=2729, max=17.2s, mean=2.8s
5. **Residual Convention Gaps**:
   - Solar semidiameter variations over the elliptical orbit (approx ±0.004°) introduce a residual difference of under 2 seconds compared to fixed mean semidiameter models.
   - Lunar topocentric parallax differences between analytical trigonometric models and numeric integration introduce a minor residual under 8 seconds.

## Benchmark Results

Evaluated across 2,790 city-days in the decision set (6 core cities across full year 2026, 2000-01-01, 2028-02-29; 21 sample cities on 28 dates):

### Candidate: astronomy-engine (v2.1.19)

| Event Kind    | n    | Unmatched | Extra | Boundary | Max Error (s) | Mean Error (s) | P95 Error (s) | Tolerance (s) | Status |
| :------------ | :--- | :-------- | :---- | :------- | :------------ | :------------- | :------------ | :------------ | :----- |
| sunrise       | 2790 | 0         | 0     | 0        | 1.44          | 0.74           | 1.24          | 60            | PASS   |
| sunset        | 2790 | 0         | 0     | 0        | 1.61          | 0.83           | 1.41          | 60            | PASS   |
| civilDawn     | 2790 | 0         | 0     | 0        | 0.36          | 0.06           | 0.12          | 60            | PASS   |
| civilDusk     | 2790 | 0         | 0     | 0        | 0.33          | 0.09           | 0.18          | 60            | PASS   |
| sun6Morning   | 2790 | 0         | 0     | 0        | 0.36          | 0.06           | 0.12          | 60            | PASS   |
| sun6Evening   | 2790 | 0         | 0     | 0        | 0.35          | 0.08           | 0.17          | 60            | PASS   |
| solarNoon     | 2790 | 0         | 0     | 0        | 0.30          | 0.05           | 0.11          | 30            | PASS   |
| moonrise      | 2693 | 0         | 0     | 0        | 7.09          | 2.73           | 5.03          | 120           | PASS   |
| moonset       | 2705 | 0         | 0     | 0        | 7.23          | 2.74           | 5.54          | 120           | PASS   |
| phaseFraction | 2790 | 0         | 0     | 0        | 0.00          | 0.00           | 0.00          | 0.003         | PASS   |
| illumination  | 2790 | 0         | 0     | 0        | 0.00          | 0.00           | 0.00          | 0.005         | PASS   |

### Candidate: suncalc (v2.1.4)

| Event Kind    | n    | Unmatched | Extra | Boundary | Max Error (s) | Mean Error (s) | P95 Error (s) | Tolerance (s) | Status |
| :------------ | :--- | :-------- | :---- | :------- | :------------ | :------------- | :------------ | :------------ | :----- |
| sunrise       | 2790 | 0         | 0     | 0        | 2.01          | 0.82           | 1.64          | 60            | PASS   |
| sunset        | 2790 | 0         | 0     | 0        | 3.73          | 2.06           | 3.33          | 60            | PASS   |
| civilDawn     | 2790 | 0         | 0     | 0        | 1.90          | 0.75           | 1.53          | 60            | PASS   |
| civilDusk     | 2790 | 0         | 0     | 0        | 3.88          | 2.15           | 3.45          | 60            | PASS   |
| sun6Morning   | 2790 | 0         | 0     | 0        | 1.96          | 0.76           | 1.58          | 60            | PASS   |
| sun6Evening   | 2790 | 0         | 0     | 0        | 3.77          | 2.14           | 3.40          | 60            | PASS   |
| solarNoon     | 2790 | 0         | 0     | 0        | 2.70          | 1.37           | 2.45          | 30            | PASS   |
| moonrise      | 2652 | 28        | 0     | 13       | 8.87          | 2.80           | 6.65          | 120           | FAIL   |
| moonset       | 2672 | 29        | 0     | 4        | 9.81          | 3.30           | 8.12          | 120           | FAIL   |
| phaseFraction | 2790 | 0         | 0     | 0        | 0.00          | 0.00           | 0.00          | 0.003         | PASS   |
| illumination  | 2790 | 0         | 0     | 0        | 0.00          | 0.00           | 0.00          | 0.005         | PASS   |

## Extended-Range Results

Evaluated across 24 city-days (6 core cities on 2035-03-20, 2050-06-21, 2075-09-23, and 2100-12-31). Extended-range dates after 2030 are subject to $\Delta T$ (Earth rotation) uncertainty and are report-only:

### astronomy-engine (v2.1.19)

| Event Kind    | n   | Unmatched | Extra | Boundary | Max Error (s) | Mean Error (s) | P95 Error (s) | Tolerance (s) | Status |
| :------------ | :-- | :-------- | :---- | :------- | :------------ | :------------- | :------------ | :------------ | :----- |
| sunrise       | 24  | 0         | 0     | 0        | 28.56         | 10.28          | 28.55         | 60            | info   |
| sunset        | 24  | 0         | 0     | 0        | 26.03         | 10.31          | 25.95         | 60            | info   |
| civilDawn     | 24  | 0         | 0     | 0        | 27.25         | 10.30          | 27.25         | 60            | info   |
| civilDusk     | 24  | 0         | 0     | 0        | 27.18         | 10.25          | 27.17         | 60            | info   |
| sun6Morning   | 24  | 0         | 0     | 0        | 27.27         | 10.31          | 27.27         | 60            | info   |
| sun6Evening   | 24  | 0         | 0     | 0        | 27.18         | 10.24          | 27.15         | 60            | info   |
| solarNoon     | 24  | 0         | 0     | 0        | 27.23         | 10.31          | 27.23         | 30            | info   |
| moonrise      | 24  | 0         | 0     | 0        | 27.55         | 10.21          | 27.52         | 120           | info   |
| moonset       | 24  | 0         | 0     | 0        | 18.27         | 7.46           | 17.79         | 120           | info   |
| phaseFraction | 24  | 0         | 0     | 0        | 0.00          | 0.00           | 0.00          | 0.003         | info   |
| illumination  | 24  | 0         | 0     | 0        | 0.00          | 0.00           | 0.00          | 0.005         | info   |

### suncalc (v2.1.4)

| Event Kind    | n   | Unmatched | Extra | Boundary | Max Error (s) | Mean Error (s) | P95 Error (s) | Tolerance (s) | Status |
| :------------ | :-- | :-------- | :---- | :------- | :------------ | :------------- | :------------ | :------------ | :----- |
| sunrise       | 24  | 0         | 0     | 0        | 27.88         | 10.50          | 27.87         | 60            | info   |
| sunset        | 24  | 0         | 0     | 0        | 26.75         | 9.58           | 26.74         | 60            | info   |
| civilDawn     | 24  | 0         | 0     | 0        | 27.96         | 10.59          | 27.95         | 60            | info   |
| civilDusk     | 24  | 0         | 0     | 0        | 26.67         | 9.59           | 26.66         | 60            | info   |
| sun6Morning   | 24  | 0         | 0     | 0        | 28.00         | 10.59          | 28.00         | 60            | info   |
| sun6Evening   | 24  | 0         | 0     | 0        | 26.66         | 9.57           | 26.63         | 60            | info   |
| solarNoon     | 24  | 0         | 0     | 0        | 27.31         | 9.97           | 27.31         | 30            | info   |
| moonrise      | 24  | 0         | 0     | 0        | 28.73         | 11.74          | 28.70         | 120           | info   |
| moonset       | 24  | 0         | 0     | 0        | 15.29         | 6.22           | 14.76         | 120           | info   |
| phaseFraction | 24  | 0         | 0     | 0        | 0.00          | 0.00           | 0.00          | 0.003         | info   |
| illumination  | 24  | 0         | 0     | 0        | 0.00          | 0.00           | 0.00          | 0.005         | info   |

## Execution Timings

Median execution time across 3 runs for 92 consecutive days (2026-04-01 through 2026-07-01) for Rajkot:

- `astronomy-engine`: 198.7 ms (~2.16 ms/day)
- `suncalc`: 72.2 ms (~0.79 ms/day)

## Supported Range Advice

- `astronomy-engine`: astronomy-engine maintains full sun accuracy within ±1 minute through 2100.
- `suncalc`: suncalc maintains full sun accuracy within ±1 minute through 2100.

## Decision

**DECISION: astronomy-engine - suncalc failed accuracy tolerances or had unmatched/extra events; astronomy-engine is the only candidate meeting all accuracy tolerances (max sun error: 1.6s)**

`astronomy-engine` is selected as the production astronomy engine for Arunodaya. It achieves sub-second accuracy across all solar events (max sun error 1.61s vs 60s tolerance, solar noon 0.30s vs 30s tolerance) and complete moon coverage (max error 7.23s vs 120s tolerance, 0 unmatched events), completely satisfying spec section 3.2.

## Production Provider

The production astronomy module lives under `packages/engine/src/astro/` (ADR 0009). It encapsulates `astronomy-engine` and exposes a pure, synchronous API for event calculations and multi-day snapshot building.

### Core Functions

- `computeAstroDay(observer, istDate): Result<AstroDay, AstroError>`: Computes exact astronomical event instants for an observer on a single IST civil date.
- `toDayRecord(astroDay): DayRecord`: Applies specification section 3.3 rounding rules to an `AstroDay` to create a contracts-compliant `DayRecord`.
- `computeDayRecord(observer, istDate): Result<DayRecord, AstroError>`: Convenience pipe composing `computeAstroDay` and `toDayRecord`.
- `computeMoonEvents(observer, istDate): Result<MoonEvent[], AstroError>`: Extracts sorted, rounded moon rise/set events for an IST day.
- `planSnapshotWindow(nowMs): { startIstDate, dayCount }`: Plans the 92-day snapshot window (`SNAPSHOT_POLICY`: yesterday, today, and 90 days ahead).
- `buildSnapshot({ location, startIstDate, dayCount, generatedAtMs }): Result<SnapshotV1, SnapshotBuildError>`: Generates a self-validated multi-day snapshot spanning `dayCount` days plus 2 moon lookahead days.
- `buildSnapshotAround(clock, location)`: Invokes `buildSnapshot` around the current time provided by an injected `Clock`.

### Library Mapping & Calling Conventions

The provider replicates the exact API calls used in the benchmark adapter (`tools/lib/candidates/astronomy-engine.mjs`):

- **Observer**: Created with `new Observer(observer.lat, observer.lon, 0)`. Observer elevation is ignored in v1.
- **Search Boundaries**: The search start time is set to 12 hours before IST day start (`dayStart - 12h`) with a search limit of `2.0 days`. Any event occurring before `dayStart` is advanced, ensuring every event occurring within `[dayStart, dayEnd)` is captured and none outside.
- **Sunrise & Sunset**: `SearchRiseSet(Body.Sun, observer, +1, startTime, limitDays)` (Rise) and `SearchRiseSet(Body.Sun, observer, -1, startTime, limitDays)` (Set). Includes standard 34' refraction and solar limb semidiameter by default.
- **Solar Noon**: `SearchHourAngle(Body.Sun, observer, 0, startTime)`. Extracted via `event.time.date.getTime()`.
- **Civil Dawn & Dusk**: `SearchAltitude(Body.Sun, observer, +1, startTime, limitDays, -6.0)` and `SearchAltitude(Body.Sun, observer, -1, startTime, limitDays, -6.0)` without refraction.
- **Golden Hour Boundaries**: `SearchAltitude(Body.Sun, observer, +1, startTime, limitDays, 6.0)` (`sun6Morning`) and `SearchAltitude(Body.Sun, observer, -1, startTime, limitDays, 6.0)` (`sun6Evening`).
- **Moonrise & Moonset**: Forward-searched iteratively inside the IST day using `SearchRiseSet(Body.Moon, observer, +1/-1, startTime, limitDays)` with a hard iteration cap of 5 to avoid infinite loops.
- **Moon Phase & Illumination**: Evaluated at 12:00:00 IST via `MoonPhase(noonTime)` (normalized so $360^\circ \to 0.0$) and `Illumination(Body.Moon, noonTime).phase_fraction` (clamped to $[0, 1]$).

### The Date Pitfall

`astronomy-engine` accepts JavaScript `Date` instances. If a primitive number is passed to its time functions, the library interprets the value as **Julian days since J2000** (`2000-01-01 12:00 UTC`), not epoch milliseconds. Passing a raw epoch millisecond number (e.g. `1763188800000`) corrupts calculations by millennia.

Therefore, `new Date(epochMs)` (with a single finite integer argument) and `date.getTime()` are used strictly at the provider boundary as instant carriers. Zero-argument `new Date()` is forbidden by `INV-CLOCK`, and all local-time getters are banned by `INV-TIME`.

### Day Attribution and Rounding

- **Attribution**: Events belong strictly to the IST date on which their exact instant lands: $[ \text{startMs}, \text{endMs} )$.
- **Rounding Rules**:
  - `start` (ceil to next whole minute): sunrise, navkarshi, civil dawn, golden morning end (+6° crossing), and moonrise.
  - `end` (floor to previous whole minute): sunset, civil dusk, golden evening start (+6° crossing), and moonset.
  - `nearest` (round to nearest minute): solar noon for display.
  - `Navkarshi`: Calculated from exact sunrise (`exactSunrise + 48 min`), then ceiling-rounded. Because $\lceil s \rceil + 48 = \lceil s + 48 \rceil$, the displayed gap between sunrise and Navkarshi is guaranteed to be exactly 48 minutes on screen.

### Accuracy Tiers

- **`standard`**: `2000-01-01` through `2035-12-31`. Maximum confidence; empirical $\Delta T$ uncertainty is negligible.
- **`approximate`**: `2036-01-01` through `2100-12-31`. Sun accuracy is maintained within $\pm 1$ minute across India, but times are labelled approximate due to future Earth rotation drift.
- **`unsupported`**: Dates before `2000-01-01` or after `2100-12-31`.

### Regression Guards

While contractual accuracy tolerances are $\pm 60$ s (sun), $\pm 30$ s (noon), and $\pm 120$ s (moon), continuous integration applies tighter regression guards (`packages/engine/tests/data/astro-tolerances-v1.json`) to catch subtle calculation drift:

- Sun events: $\le 5$ s
- Solar noon: $\le 2$ s
- Moon events: $\le 15$ s
- Extended range: $\le 45$ s

## Regeneration

To regenerate the reference dataset and execute the candidate benchmark:

```powershell
# 1. Regenerate reference dataset using digest-pinned Python container
npm run reference:generate

# 2. Run astronomy benchmark against candidate engines
npm run bench:astro
```

_Note_: The generated reference dataset (`packages/engine/tests/data/astro-reference-v1.json`) is committed test data and is regenerated only when reference conventions change. The DE440s ephemeris kernel is cached inside the Docker named volume `arunodaya-skyfield-data` and is never committed to Git.
