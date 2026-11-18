import type { SnapshotV1 } from '@arunodaya/contracts';
import { istDateToStartMs } from '../time/ist.js';

export type MoonPhaseKey =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'third_quarter'
  | 'waning_crescent';

const PHASE_KEYS: readonly MoonPhaseKey[] = [
  'new_moon',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full_moon',
  'waning_gibbous',
  'third_quarter',
  'waning_crescent',
];

const MS_PER_HOUR = 3600_000;
const NOON_OFFSET_MS = 12 * MS_PER_HOUR;

/**
 * Maps a continuous moon phase fraction [0, 1) to one of the eight canonical phase keys.
 * Uses 8 equal bins of width 1/8 (0.125), centred on 0, 1/8, 2/8, ..., 7/8 with boundary offset +1/16.
 *
 * @param fraction Continuous phase fraction [0, 1)
 * @returns MoonPhaseKey
 */
export function phaseName(fraction: number): MoonPhaseKey {
  const normalized = ((fraction % 1) + 1) % 1;
  const binIndex = Math.floor((normalized + 1 / 16) * 8) % 8;
  const key = PHASE_KEYS[binIndex];
  return key ?? 'new_moon';
}

/**
 * Linearly interpolates phase fraction and illumination between two noon records.
 * Moon phase fraction wraps at 1 using the shortest circular path.
 * Illumination interpolates linearly clamped to [0, 1].
 *
 * @param a Start phase and illumination at noon A
 * @param b End phase and illumination at noon B
 * @param t Progress factor in [0, 1]
 */
export function interpolatePhase(
  a: { readonly phase: number; readonly illumination: number },
  b: { readonly phase: number; readonly illumination: number },
  t: number,
): { fraction: number; illumination: number } {
  const safeT = Math.max(0, Math.min(1, t));

  // Shortest circular path on unit circle [0, 1)
  const delta = ((b.phase - a.phase + 1.5) % 1) - 0.5;
  const rawFraction = a.phase + safeT * delta;
  const fraction = ((rawFraction % 1) + 1) % 1;

  const rawIllumination = (1 - safeT) * a.illumination + safeT * b.illumination;
  const illumination = Math.max(0, Math.min(1, rawIllumination));

  return {
    fraction,
    illumination,
  };
}

export interface LivePhaseResult {
  readonly fraction: number;
  readonly illumination: number;
  readonly phaseKey: MoonPhaseKey;
  readonly isApproximate: boolean;
}

/**
 * Computes live moon phase fraction, illumination, and canonical phase name
 * for any given wall-clock epoch millisecond instant by interpolating between
 * adjacent noon records in the snapshot.
 *
 * Does not import or execute astronomy calculation code.
 *
 * @param snapshot Precomputed snapshot containing daily moon records
 * @param nowMs Current epoch millisecond instant
 */
export function livePhase(snapshot: SnapshotV1, nowMs: number): LivePhaseResult {
  if (snapshot.days.length === 0) {
    return {
      fraction: 0,
      illumination: 0,
      phaseKey: 'new_moon',
      isApproximate: true,
    };
  }

  // Pre-calculate 12:00 IST noon instant for each day record
  interface DayNoon {
    readonly noonMs: number;
    readonly phase: number;
    readonly illumination: number;
  }

  const noons: DayNoon[] = [];
  for (const day of snapshot.days) {
    const startRes = istDateToStartMs(day.istDate);
    if (startRes.ok) {
      noons.push({
        noonMs: startRes.value + NOON_OFFSET_MS,
        phase: day.moonPhaseAtNoon.phase,
        illumination: day.moonPhaseAtNoon.illumination,
      });
    }
  }

  const first = noons[0];
  if (!first) {
    return {
      fraction: 0,
      illumination: 0,
      phaseKey: 'new_moon',
      isApproximate: true,
    };
  }

  if (noons.length === 1) {
    return {
      fraction: first.phase,
      illumination: first.illumination,
      phaseKey: phaseName(first.phase),
      isApproximate: true,
    };
  }

  // Find adjacent pair (dayA, dayB) such that noonA <= nowMs <= noonB
  const last = noons[noons.length - 1] ?? first;

  if (nowMs <= first.noonMs) {
    // Before first noon in snapshot: use first noon as fallback, marked approximate
    return {
      fraction: first.phase,
      illumination: first.illumination,
      phaseKey: phaseName(first.phase),
      isApproximate: true,
    };
  }

  if (nowMs >= last.noonMs) {
    // Beyond last noon in snapshot: use last noon as fallback, marked approximate
    return {
      fraction: last.phase,
      illumination: last.illumination,
      phaseKey: phaseName(last.phase),
      isApproximate: true,
    };
  }

  let a = first;
  let b = noons[1] ?? last;
  for (let i = 0; i < noons.length - 1; i++) {
    const current = noons[i];
    const next = noons[i + 1];
    if (current && next && nowMs >= current.noonMs && nowMs <= next.noonMs) {
      a = current;
      b = next;
      break;
    }
  }

  const span = b.noonMs - a.noonMs;
  const t = span > 0 ? (nowMs - a.noonMs) / span : 0;

  const { fraction, illumination } = interpolatePhase(a, b, t);
  const key = phaseName(fraction);

  return {
    fraction,
    illumination,
    phaseKey: key,
    isApproximate: false,
  };
}
