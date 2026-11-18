import { describe, expect, it } from 'vitest';
import {
  countdownSrLabel,
  en,
  format,
  formatDateLabel,
  formatShortDateLabel,
  formatTime24,
  formatTimeDisplay,
  greetingText,
  moonPhaseLabel,
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

  it('phase names exist for all eight moon phases', () => {
    const phases = [
      'new_moon',
      'waxing_crescent',
      'first_quarter',
      'waxing_gibbous',
      'full_moon',
      'waning_gibbous',
      'third_quarter',
      'waning_crescent',
    ] as const;
    for (const phase of phases) {
      const label = moonPhaseLabel(phase);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('formatShortDateLabel formats weekday day and short month in IST', () => {
    // 2026-11-16 12:00:00 IST = Monday 16 Nov 2026
    const instant = 1794793200000;
    const label = formatShortDateLabel(instant);
    expect(label).toBe('Mon 16 Nov');
  });

  it('event details texts contain no seconds', () => {
    const detailsTexts = [
      en.dialog.sunriseDefinition,
      en.dialog.sunriseRounding,
      en.dialog.navkarshiDefinition,
      en.dialog.navkarshiRounding,
      en.dialog.sunsetDefinition,
      en.dialog.sunsetRounding,
      en.dialog.accuracyStandard,
      en.dialog.accuracyApproximate,
    ];
    for (const text of detailsTexts) {
      expect(text).not.toMatch(/\bseconds?\b/i);
      expect(text).not.toMatch(/:\d{2}:\d{2}\b/);
    }
  });

  it('formatTime24 and formatTimeDisplay handle midnight, noon, and non-string keys', () => {
    // 2026-11-16 18:35 UTC = 2026-11-17 00:05 IST
    const midnightIst = Date.UTC(2026, 10, 16, 18, 35, 0);
    expect(formatTime24(midnightIst)).toBe('00:05');
    expect(formatTimeDisplay(midnightIst, '12h')).toBe('12:05 AM');
    expect(formatTimeDisplay(midnightIst, '24h')).toBe('00:05');

    // 2026-11-17 06:35 UTC = 2026-11-17 12:05 IST
    const noonIst = Date.UTC(2026, 10, 17, 6, 35, 0);
    expect(formatTimeDisplay(noonIst, '12h')).toBe('12:05 PM');

    expect(() => t('events')).toThrow(/not a string/i);
    expect(greetingText('unknown' as unknown as Parameters<typeof greetingText>[0])).toBe(
      'Good morning',
    );
  });
});
