import { useEffect, useState } from 'react';
import type { Clock } from '@arunodaya/engine';

function getNowMs(clock: Clock): number {
  if (typeof clock.nowMs === 'function') {
    return clock.nowMs();
  }
  if (typeof clock.now === 'function') {
    return clock.now();
  }
  return Date.now();
}

/**
 * Hook providing current epoch ms synchronized to clock and minute boundaries.
 * Refreshes automatically at the next minute boundary + 20ms, as well as on
 * document visibility changes and window focus.
 */
export function useNow(clock: Clock): number {
  const [nowMs, setNowMs] = useState<number>(() => getNowMs(clock));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function scheduleNextTick(): void {
      if (disposed) return;
      const current = getNowMs(clock);
      setNowMs(current);

      const msIntoMinute = current % 60_000;
      const delayMs = 60_000 - msIntoMinute + 20;

      timer = setTimeout(() => {
        scheduleNextTick();
      }, delayMs);
    }

    function handleVisibilityOrFocus(): void {
      if (timer !== null) {
        clearTimeout(timer);
      }
      scheduleNextTick();
    }

    scheduleNextTick();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleVisibilityOrFocus);
    }

    return () => {
      disposed = true;
      if (timer !== null) {
        clearTimeout(timer);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleVisibilityOrFocus);
      }
    };
  }, [clock]);

  return nowMs;
}
