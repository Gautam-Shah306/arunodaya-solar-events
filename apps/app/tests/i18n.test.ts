import { describe, expect, it } from 'vitest';
import {
  countdownSrLabel,
  en,
  format,
  formatDateLabel,
  greetingText,
  t,
} from '../src/i18n/index.js';

describe('i18n and English strings', () => {
  it('format replaces placeholders and reports unresolved ones', () => {
    const res = format('Hello {name}, score {score}', { name: 'Gautam', score: 42 });
    expect(res).toBe('Hello Gautam, score 42');

    expect(() => format('Missing {unresolved}', {})).toThrow(TypeError);
    expect(() => format('Missing {unresolved}', {})).toThrow(/unresolved placeholder/i);
  });

  it('greetingText returns the English text for every greeting', () => {
    expect(greetingText('morning')).toBe('Good morning');
    expect(greetingText('afternoon')).toBe('Good afternoon');
    expect(greetingText('evening')).toBe('Good evening');
    expect(greetingText('night')).toBe('Good night');
  });

  it('countdownSrLabel pluralises hours and minutes', () => {
    expect(countdownSrLabel('Navkarshi', 168)).toBe('Navkarshi in 2 hours 48 minutes');
    expect(countdownSrLabel('Sunset', 125)).toBe('Sunset in 2 hours 5 minutes');
  });

  it('countdownSrLabel omits zero hours and zero minutes', () => {
    expect(countdownSrLabel('Sunset', 60)).toBe('Sunset in 1 hour');
    expect(countdownSrLabel('Sunset', 120)).toBe('Sunset in 2 hours');
    expect(countdownSrLabel('Sunset', 45)).toBe('Sunset in 45 minutes');
  });

  it('countdownSrLabel reads one minute as singular', () => {
    expect(countdownSrLabel('Sunrise', 1)).toBe('Sunrise in 1 minute');
  });

  it('countdownSrLabel reads zero minutes as now', () => {
    expect(countdownSrLabel('Sunrise', 0)).toBe('Sunrise now');
    expect(countdownSrLabel('Navkarshi', 0)).toBe('Navkarshi now');
  });

  it('formatDateLabel formats weekday day and month in IST', () => {
    // 2026-11-16 12:00:00 IST = Monday 16 November 2026
    const instant = 1794793200000;
    const label = formatDateLabel(instant);
    expect(label).toBe('Mon 16 November');
  });

  it('formatDateLabel uses the IST date after 18:30 UTC', () => {
    // 2026-11-16 18:35:00 UTC = 2026-11-17 00:05:00 IST
    // UTC 18:30 is exact midnight IST; at 18:35 UTC it is Tuesday 17 November in IST
    const instantUtc = Date.UTC(2026, 10, 16, 18, 35, 0);
    const label = formatDateLabel(instantUtc);
    expect(label).toBe('Tue 17 November');
  });

  it('every English string key has a non-empty value', () => {
    function walk(obj: unknown, path = ''): void {
      if (typeof obj === 'string') {
        expect(obj.trim().length, `String at ${path} is empty`).toBeGreaterThan(0);
      } else if (Array.isArray(obj)) {
        expect(obj.length, `Array at ${path} is empty`).toBeGreaterThan(0);
        obj.forEach((item, idx) => {
          walk(item, `${path}[${String(idx)}]`);
        });
      } else if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          walk(v, path ? `${path}.${k}` : k);
        }
      }
    }
    walk(en);

    // Verify t(key) resolution
    expect(t('appName')).toBe('Arunodaya');
    expect(t('tagline')).toBe('A little closer to the sun.');
    expect(t('status.loading')).toBe('Calculating the sky');
    expect(() => t('non.existent.key')).toThrow();
  });
});
