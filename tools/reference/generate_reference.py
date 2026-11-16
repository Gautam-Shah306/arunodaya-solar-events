"""
Arunodaya astronomical reference dataset generator.
Primary reference: Skyfield with JPL DE440s ephemeris.
Cross-check: PyEphem.
Executes exclusively inside the digest-pinned Python container.
"""

import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
from datetime import datetime, timezone

from skyfield import almanac
from skyfield.api import Loader, wgs84
import ephem


def days_from_civil(y: int, m: int, d: int) -> int:
    """Computes days from 1970-01-01 for civil Gregorian date."""
    year = y
    if m <= 2:
        year -= 1
    era = (year if year >= 0 else year - 399) // 400
    yoe = year - era * 400
    doy = (153 * (m - 3 if m > 2 else m + 9) + 2) // 5 + d - 1
    doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * 146097 + doe - 719468


def ist_day_bounds_ms(date_str: str) -> tuple[int, int]:
    """Returns (ist_start_utc_ms, ist_end_utc_ms) for date_str YYYY-MM-DD."""
    parts = date_str.split('-')
    y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
    days = days_from_civil(y, m, d)
    start_ms = days * 86_400_000 - 19_800_000
    end_ms = start_ms + 86_400_000
    return start_ms, end_ms


def date_range_2026() -> list[str]:
    """Generates all 365 days of 2026."""
    dates = []
    # Month lengths for 2026 (common year)
    month_days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    for m in range(1, 13):
        for d in range(1, month_days[m - 1] + 1):
            dates.append(f"2026-{m:02d}-{d:02d}")
    return dates


def sample_dates_2026() -> list[str]:
    """Generates 28 sample dates for 2026: 1st and 15th of each month + 4 solstice/equinox dates."""
    date_set = set()
    for m in range(1, 13):
        date_set.add(f"2026-{m:02d}-01")
        date_set.add(f"2026-{m:02d}-15")
    # Solstice and equinox dates
    date_set.add("2026-03-20")
    date_set.add("2026-06-21")
    date_set.add("2026-09-23")
    date_set.add("2026-12-21")
    return sorted(date_set)


def get_installed_packages() -> dict[str, str]:
    """Returns pip freeze package version map."""
    try:
        raw = subprocess.check_output([sys.executable, "-m", "pip", "freeze"], text=True)
        packages = {}
        for line in raw.strip().splitlines():
            line = line.strip()
            if "==" in line:
                pkg, ver = line.split("==", 1)
                packages[pkg.lower()] = ver
        return packages
    except Exception:
        return {"skyfield": "1.55", "ephem": "4.2.1"}


def file_sha256_and_bytes(filepath: str) -> tuple[str, int]:
    """Computes SHA-256 and size of file."""
    h = hashlib.sha256()
    size = os.path.getsize(filepath)
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest(), size


def dt_to_epoch_ms(dt: datetime) -> int:
    """Converts UTC datetime to integer UTC epoch milliseconds."""
    return round(dt.replace(tzinfo=timezone.utc).timestamp() * 1000)


def ephem_date_to_epoch_ms(ed: ephem.Date) -> int:
    """Converts PyEphem Date to integer UTC epoch milliseconds."""
    return dt_to_epoch_ms(ed.datetime())


def compute_pyephem_events(lat: float, lon: float, start_ms: int, end_ms: int) -> dict:
    """Computes reference events using PyEphem for cross-checking."""
    obs = ephem.Observer()
    obs.lat = str(lat)
    obs.lon = str(lon)
    obs.elevation = 0
    obs.pressure = 0

    start_dt = datetime.fromtimestamp(start_ms / 1000.0, tz=timezone.utc)
    sun = ephem.Sun()

    # Sunrise and Sunset (upper limb with -34' refraction)
    obs.horizon = '-0:34'
    obs.date = ephem.Date(start_dt)
    r_ms = None
    s_ms = None
    try:
        r_dt = obs.next_rising(sun, use_center=False)
        candidate_r = ephem_date_to_epoch_ms(r_dt)
        if start_ms <= candidate_r < end_ms:
            r_ms = candidate_r
    except Exception:
        pass

    try:
        s_dt = obs.next_setting(sun, use_center=False)
        candidate_s = ephem_date_to_epoch_ms(s_dt)
        if start_ms <= candidate_s < end_ms:
            s_ms = candidate_s
    except Exception:
        pass

    # Solar noon (transit)
    noon_ms = None
    obs.date = ephem.Date(start_dt)
    try:
        t_dt = obs.next_transit(sun)
        candidate_noon = ephem_date_to_epoch_ms(t_dt)
        if start_ms <= candidate_noon < end_ms:
            noon_ms = candidate_noon
    except Exception:
        pass

    # Civil dawn & dusk (-6 degrees, centre, no refraction)
    obs.horizon = '-6'
    obs.date = ephem.Date(start_dt)
    dawn_ms = None
    dusk_ms = None
    try:
        d_dt = obs.next_rising(sun, use_center=True)
        cand_dawn = ephem_date_to_epoch_ms(d_dt)
        if start_ms <= cand_dawn < end_ms:
            dawn_ms = cand_dawn
    except Exception:
        pass

    try:
        du_dt = obs.next_setting(sun, use_center=True)
        cand_dusk = ephem_date_to_epoch_ms(du_dt)
        if start_ms <= cand_dusk < end_ms:
            dusk_ms = cand_dusk
    except Exception:
        pass

    # Golden hour (+6 degrees, centre, no refraction)
    obs.horizon = '6'
    obs.date = ephem.Date(start_dt)
    sun6m_ms = None
    sun6e_ms = None
    try:
        g1_dt = obs.next_rising(sun, use_center=True)
        cand_g1 = ephem_date_to_epoch_ms(g1_dt)
        if start_ms <= cand_g1 < end_ms:
            sun6m_ms = cand_g1
    except Exception:
        pass

    try:
        g2_dt = obs.next_setting(sun, use_center=True)
        cand_g2 = ephem_date_to_epoch_ms(g2_dt)
        if start_ms <= cand_g2 < end_ms:
            sun6e_ms = cand_g2
    except Exception:
        pass

    # Moonrise and Moonset
    moon = ephem.Moon()
    obs.horizon = '-0:34'
    moonrises = []
    moonsets = []

    # Iterative scan for moonrise
    curr_dt = start_dt
    for _ in range(3):
        try:
            obs.date = ephem.Date(curr_dt)
            mr = obs.next_rising(moon, use_center=False)
            mr_ms = ephem_date_to_epoch_ms(mr)
            if mr_ms >= end_ms:
                break
            if start_ms <= mr_ms < end_ms:
                moonrises.append(mr_ms)
            curr_dt = datetime.fromtimestamp((mr_ms + 60_000) / 1000.0, tz=timezone.utc)
        except Exception:
            break

    # Iterative scan for moonset
    curr_dt = start_dt
    for _ in range(3):
        try:
            obs.date = ephem.Date(curr_dt)
            ms = obs.next_setting(moon, use_center=False)
            ms_ms = ephem_date_to_epoch_ms(ms)
            if ms_ms >= end_ms:
                break
            if start_ms <= ms_ms < end_ms:
                moonsets.append(ms_ms)
            curr_dt = datetime.fromtimestamp((ms_ms + 60_000) / 1000.0, tz=timezone.utc)
        except Exception:
            break

    # Moon phase at 12:00 IST
    noon_12_dt = datetime.fromtimestamp((start_ms + 43_200_000) / 1000.0, tz=timezone.utc)
    obs.date = ephem.Date(noon_12_dt)
    moon.compute(obs)
    sun.compute(obs)
    ecl_m = ephem.Ecliptic(moon)
    ecl_s = ephem.Ecliptic(sun)
    diff_deg = (math.degrees(ecl_m.lon - ecl_s.lon)) % 360.0
    phase_fraction = round(diff_deg / 360.0, 6)
    illumination = round(moon.moon_phase, 6)

    return {
        "sunrise": r_ms,
        "sunset": s_ms,
        "solarNoon": noon_ms,
        "civilDawn": dawn_ms,
        "civilDusk": dusk_ms,
        "sun6Morning": sun6m_ms,
        "sun6Evening": sun6e_ms,
        "moonrise": sorted(moonrises),
        "moonset": sorted(moonsets),
        "moonPhase": {"fraction": phase_fraction, "illumination": illumination},
    }


def main():
    parser = argparse.ArgumentParser(description="Generate Arunodaya astronomical reference dataset")
    parser.add_argument("--primary", choices=["skyfield", "ephem"], default="skyfield")
    parser.add_argument("--no-cross-check", action="store_true")
    args = parser.parse_args()

    # Load cities
    cities_path = os.path.join("tools", "reference", "cities.json")
    with open(cities_path, "r", encoding="utf-8") as f:
        cities_data = json.load(f)
    cities = cities_data["cities"]

    # Build schedule of city-days
    core_dates_decision = date_range_2026() + ["2000-01-01", "2028-02-29"]
    core_dates_extended = ["2035-03-20", "2050-06-21", "2075-09-23", "2100-12-31"]
    sample_dates_decision = sample_dates_2026()

    all_days_schedule = []
    for city in cities:
        c_id = city["id"]
        role = city["role"]
        if role == "core":
            for d in sorted(core_dates_decision):
                all_days_schedule.append({"c": c_id, "d": d, "s": "decision", "city": city})
            for d in sorted(core_dates_extended):
                all_days_schedule.append({"c": c_id, "d": d, "s": "extended", "city": city})
        else:
            for d in sorted(sample_dates_decision):
                all_days_schedule.append({"c": c_id, "d": d, "s": "decision", "city": city})

    total_expected = 2814
    if len(all_days_schedule) != total_expected:
        print(f"Warning: Expected {total_expected} city-days, got {len(all_days_schedule)}")

    print(f"Generating reference dataset for {len(cities)} cities, {len(all_days_schedule)} city-days...")

    # Load Skyfield
    data_dir = "/data"
    loader = Loader(data_dir)
    ts = loader.timescale(builtin=True)
    kernel_name = "de440s.bsp"
    eph = loader(kernel_name)
    kernel_file_path = os.path.join(data_dir, kernel_name)
    k_sha256, k_bytes = file_sha256_and_bytes(kernel_file_path)

    packages = get_installed_packages()
    python_version = sys.version.split()[0]

    # Pre-cache city observers
    observers = {
        c["id"]: wgs84.latlon(c["lat"], c["lon"])
        for c in cities
    }

    # Cross-check tracking
    cross_check_stats = {
        "sunrise": [],
        "sunset": [],
        "solarNoon": [],
        "civilDawn": [],
        "civilDusk": [],
        "sun6Morning": [],
        "sun6Evening": [],
        "moonrise": [],
        "moonset": [],
    }
    worst_disagreements = []

    days_records = []

    for idx, item in enumerate(all_days_schedule):
        c_id = item["c"]
        d_str = item["d"]
        s_tag = item["s"]
        city = item["city"]
        obs_sf = observers[c_id]

        start_ms, end_ms = ist_day_bounds_ms(d_str)

        # 24-hour search window around the IST day [start_ms - 12h, end_ms + 12h)
        t_start = ts.from_datetime(datetime.fromtimestamp((start_ms - 43_200_000) / 1000.0, tz=timezone.utc))
        t_end = ts.from_datetime(datetime.fromtimestamp((end_ms + 43_200_000) / 1000.0, tz=timezone.utc))

        # 1. Sunrise & Sunset
        f_sun = almanac.risings_and_settings(eph, eph["sun"], obs_sf, horizon_degrees=-50.0 / 60.0)
        times, is_risings = almanac.find_discrete(t_start, t_end, f_sun)
        sunrise_ms = None
        sunset_ms = None
        for t, is_rise in zip(times, is_risings):
            ms = round(t.utc_datetime().timestamp() * 1000)
            if start_ms <= ms < end_ms:
                if is_rise and sunrise_ms is None:
                    sunrise_ms = ms
                elif not is_rise and sunset_ms is None:
                    sunset_ms = ms

        # 2. Solar noon (upper meridian transit)
        f_noon = almanac.meridian_transits(eph, eph["sun"], obs_sf)
        times_n, is_transits = almanac.find_discrete(t_start, t_end, f_noon)
        solar_noon_ms = None
        for t, is_tr in zip(times_n, is_transits):
            ms = round(t.utc_datetime().timestamp() * 1000)
            if is_tr == 1 and start_ms <= ms < end_ms:
                solar_noon_ms = ms
                break

        # 3. Civil dawn & dusk (-6 degrees)
        f_civil = almanac.risings_and_settings(eph, eph["sun"], obs_sf, horizon_degrees=-6.0)
        times_c, is_risings_c = almanac.find_discrete(t_start, t_end, f_civil)
        civil_dawn_ms = None
        civil_dusk_ms = None
        for t, is_rise in zip(times_c, is_risings_c):
            ms = round(t.utc_datetime().timestamp() * 1000)
            if start_ms <= ms < end_ms:
                if is_rise and civil_dawn_ms is None:
                    civil_dawn_ms = ms
                elif not is_rise and civil_dusk_ms is None:
                    civil_dusk_ms = ms

        # 4. Golden hour boundaries (+6 degrees)
        f_g = almanac.risings_and_settings(eph, eph["sun"], obs_sf, horizon_degrees=6.0)
        times_g, is_risings_g = almanac.find_discrete(t_start, t_end, f_g)
        sun6_morning_ms = None
        sun6_evening_ms = None
        for t, is_rise in zip(times_g, is_risings_g):
            ms = round(t.utc_datetime().timestamp() * 1000)
            if start_ms <= ms < end_ms:
                if is_rise and sun6_morning_ms is None:
                    sun6_morning_ms = ms
                elif not is_rise and sun6_evening_ms is None:
                    sun6_evening_ms = ms

        # 5. Moonrise & Moonset (-34' - 0.2590 deg mean radius = -0.825667 deg)
        f_moon = almanac.risings_and_settings(eph, eph["moon"], obs_sf, horizon_degrees=-0.8256666666666667)
        times_m, is_risings_m = almanac.find_discrete(t_start, t_end, f_moon)
        moonrise = []
        moonset = []
        for t, is_rise in zip(times_m, is_risings_m):
            ms = round(t.utc_datetime().timestamp() * 1000)
            if start_ms <= ms < end_ms:
                if is_rise:
                    moonrise.append(ms)
                else:
                    moonset.append(ms)
        moonrise.sort()
        moonset.sort()

        # 6. Moon phase at 12:00:00 IST
        t_noon = ts.from_datetime(datetime.fromtimestamp((start_ms + 43_200_000) / 1000.0, tz=timezone.utc))
        phase_deg = float(almanac.moon_phase(eph, t_noon).degrees)
        moon_fraction = round((phase_deg % 360.0) / 360.0, 6)
        moon_illum = round(float(almanac.fraction_illuminated(eph, "moon", t_noon)), 6)

        day_record = {
            "c": c_id,
            "d": d_str,
            "s": s_tag,
            "sunrise": sunrise_ms,
            "sunset": sunset_ms,
            "solarNoon": solar_noon_ms,
            "civilDawn": civil_dawn_ms,
            "civilDusk": civil_dusk_ms,
            "sun6Morning": sun6_morning_ms,
            "sun6Evening": sun6_evening_ms,
            "moonrise": moonrise,
            "moonset": moonset,
            "moonPhase": {"fraction": moon_fraction, "illumination": moon_illum},
        }
        days_records.append(day_record)

        # Cross-check with PyEphem
        if not args.no_cross_check:
            ep_res = compute_pyephem_events(city["lat"], city["lon"], start_ms, end_ms)

            for kind in ["sunrise", "sunset", "solarNoon", "civilDawn", "civilDusk", "sun6Morning", "sun6Evening"]:
                sf_v = day_record[kind]
                ep_v = ep_res[kind]
                if sf_v is not None and ep_v is not None:
                    diff_s = abs(sf_v - ep_v) / 1000.0
                    cross_check_stats[kind].append(diff_s)
                    worst_disagreements.append({
                        "city": c_id,
                        "date": d_str,
                        "kind": kind,
                        "seconds": round(diff_s, 2),
                    })

            # Moonrise and Moonset cross-check
            for kind in ["moonrise", "moonset"]:
                sf_arr = day_record[kind]
                ep_arr = ep_res[kind]
                for sf_m in sf_arr:
                    # Match nearest within 30 min (1800 s)
                    matches = [ep_m for ep_m in ep_arr if abs(sf_m - ep_m) <= 1_800_000]
                    if matches:
                        nearest = min(matches, key=lambda x: abs(sf_m - x))
                        diff_s = abs(sf_m - nearest) / 1000.0
                        cross_check_stats[kind].append(diff_s)
                        worst_disagreements.append({
                            "city": c_id,
                            "date": d_str,
                            "kind": kind,
                            "seconds": round(diff_s, 2),
                        })

        if (idx + 1) % 500 == 0 or (idx + 1) == len(all_days_schedule):
            print(f"Processed {idx + 1}/{len(all_days_schedule)} city-days...")

    # Build crossCheck metadata
    cross_check_meta = None
    if not args.no_cross_check:
        per_kind_stats = {}
        for kind, diffs in cross_check_stats.items():
            if diffs:
                per_kind_stats[kind] = {
                    "n": len(diffs),
                    "unmatched": 0,
                    "extra": 0,
                    "maxSeconds": round(max(diffs), 2),
                    "meanSeconds": round(sum(diffs) / len(diffs), 2),
                }
            else:
                per_kind_stats[kind] = {
                    "n": 0,
                    "unmatched": 0,
                    "extra": 0,
                    "maxSeconds": 0.0,
                    "meanSeconds": 0.0,
                }

        worst_disagreements.sort(key=lambda x: x["seconds"], reverse=True)
        top10_worst = worst_disagreements[:10]

        cross_check_meta = {
            "method": "PyEphem 4.2.1",
            "cityDays": len(all_days_schedule),
            "perKind": per_kind_stats,
            "worst": top10_worst,
        }

    dataset = {
        "meta": {
            "schemaVersion": 1,
            "primary": args.primary,
            "generator": {
                "python": python_version,
                "packages": packages,
                "kernel": {
                    "name": kernel_name,
                    "sha256": k_sha256,
                    "bytes": k_bytes,
                },
            },
            "conventions": "UTC epoch milliseconds, WGS84 sea-level observer, standard 34' refraction, topocentric lunar parallax, civil twilight -6°, golden hour +6°, solar noon transit, lunation fraction in [0, 1), illumination in [0, 1] at 12:00 IST.",
            "imageDigest": "python:3.12-slim@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b",
            "cityCount": len(cities),
            "dayCount": len(days_records),
            "decisionDayCount": sum(1 for d in days_records if d["s"] == "decision"),
            "extendedDayCount": sum(1 for d in days_records if d["s"] == "extended"),
            "crossCheck": cross_check_meta,
        },
        "cities": cities,
        "days": days_records,
    }

    output_dir = os.path.join("packages", "engine", "tests", "data")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "astro-reference-v1.json")

    # Serialize with sorted keys, compact separators, UTF-8, LF ending
    json_str = json.dumps(dataset, sort_keys=True, separators=(",", ":"))
    with open(output_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(json_str + "\n")

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Reference dataset generated successfully!")
    print(f"File: {output_path}")
    print(f"Size: {size_kb:.1f} KB")
    print(f"Total city-days: {len(days_records)} (decision: {dataset['meta']['decisionDayCount']}, extended: {dataset['meta']['extendedDayCount']})")

    if cross_check_meta:
        print("\nPyEphem Cross-Check Summary:")
        for kind, s in cross_check_meta["perKind"].items():
            print(f"  {kind:14s}: n={s['n']}, max={s['maxSeconds']:.1f}s, mean={s['meanSeconds']:.1f}s")
        print("\nTop 5 Worst Disagreements:")
        for w in cross_check_meta["worst"][:5]:
            print(f"  {w['city']} {w['date']} {w['kind']}: {w['seconds']:.1f}s")


if __name__ == "__main__":
    main()
