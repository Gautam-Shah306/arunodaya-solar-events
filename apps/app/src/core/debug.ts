import { istDateToStartMs } from '@arunodaya/engine';
import { isThemeId, type ThemeId } from '@arunodaya/themes';

export interface DebugParams {
  readonly themeId?: ThemeId;
  readonly nowMs?: number;
  readonly freeze?: boolean;
  readonly clockFormat?: '12h' | '24h';
}

const NOW_PARAM_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parses developer and test URL query parameters.
 * Only active when debug is explicitly enabled (Pages target and local dev server).
 * In production Android builds, debug is disabled and returns an empty record.
 *
 * @param search Query string (with or without leading '?')
 * @param enabled Whether debug features are permitted for the current target
 */
export function parseDebugParams(search: string, enabled: boolean): DebugParams {
  if (!enabled || !search) {
    return {};
  }

  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const result: {
    themeId?: ThemeId;
    nowMs?: number;
    freeze?: boolean;
    clockFormat?: '12h' | '24h';
  } = {};

  // 1. Theme override (?theme=pack-navy)
  const themeParam = params.get('theme');
  if (themeParam && isThemeId(themeParam)) {
    result.themeId = themeParam;
  }

  // 2. Simulated time instant (?now=2026-11-17T06:40 or ?now=2026-11-17T06:40:00)
  // Read strictly as Indian Standard Time (+05:30) using integer arithmetic; zero Date allocations.
  const nowParam = params.get('now');
  if (nowParam) {
    const match = NOW_PARAM_RE.exec(nowParam);
    if (match) {
      const [, datePart = '', hStr = '', mStr = '', sStr] = match;
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);
      const second = sStr ? parseInt(sStr, 10) : 0;

      if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60 && second >= 0 && second < 60) {
        const startRes = istDateToStartMs(datePart);
        if (startRes.ok) {
          result.nowMs = startRes.value + (hour * 3600 + minute * 60 + second) * 1000;
        }
      }
    }
  }

  // 3. Freeze clock flag (?freeze=1)
  const freezeParam = params.get('freeze');
  if (freezeParam === '1' || freezeParam === 'true') {
    result.freeze = true;
  }

  // 4. Clock format override (?clock=12h or ?clock=24h)
  const clockParam = params.get('clock');
  if (clockParam === '12h' || clockParam === '24h') {
    result.clockFormat = clockParam;
  }

  return result;
}
