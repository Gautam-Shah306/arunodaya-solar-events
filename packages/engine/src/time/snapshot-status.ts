import type { SnapshotV1 } from '@arunodaya/contracts';
import { SNAPSHOT_POLICY } from '../config.js';
import { istDateToStartMs, MS_PER_DAY } from './ist.js';

export type SnapshotStatus = 'not_started' | 'ready' | 'expiring' | 'expired';

/**
 * Computes snapshot lifecycle status for the current instant.
 * - 'not_started': nowMs is strictly before the first record's IST day start.
 * - 'expired': nowMs is at or after the IST end of the last record.
 * - 'expiring': at most SNAPSHOT_POLICY.expiringWithinDays whole days remain before expiration.
 * - 'ready': healthy snapshot with more than expiring threshold days remaining.
 * @param snapshot Multi-day snapshot
 * @param nowMs Current epoch instant in milliseconds
 */
export function getSnapshotStatus(snapshot: SnapshotV1, nowMs: number): SnapshotStatus {
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
    throw new RangeError(`nowMs must be a finite number, got: ${String(nowMs)}`);
  }

  if (snapshot.days.length === 0) {
    return 'expired';
  }

  const firstDay = snapshot.days[0];
  const lastDay = snapshot.days[snapshot.days.length - 1];

  if (!firstDay || !lastDay) {
    return 'expired';
  }

  const firstDayStartRes = istDateToStartMs(firstDay.istDate);
  const lastDayStartRes = istDateToStartMs(lastDay.istDate);

  if (!firstDayStartRes.ok || !lastDayStartRes.ok) {
    return 'expired';
  }

  const firstDayStartMs = firstDayStartRes.value;
  const lastDayEndMs = lastDayStartRes.value + MS_PER_DAY;

  if (nowMs < firstDayStartMs) {
    return 'not_started';
  }

  if (nowMs >= lastDayEndMs) {
    return 'expired';
  }

  const remainingWholeDays = Math.floor((lastDayEndMs - nowMs) / MS_PER_DAY);

  if (remainingWholeDays <= SNAPSHOT_POLICY.expiringWithinDays) {
    return 'expiring';
  }

  return 'ready';
}
