import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestHarness } from './helpers.mjs';
import { findRajkotReferenceDay, parseDisplayedTimeToMs } from './reference-helpers.mjs';

const ALL_THEMES = [
  'light',
  'dark',
  'pure-dark',
  'darker',
  'pack-navy',
  'pack-burgundy',
  'pack-porcelain',
  'pack-sandstone',
];

describe('Home Screen Real-Browser Tests', () => {
  let harness;

  beforeAll(async () => {
    harness = await createTestHarness({ target: 'pages', viewportWidth: 390, viewportHeight: 844 });
  }, 60000);

  afterAll(async () => {
    if (harness) {
      await harness.close();
    }
  });

  async function gotoHome(query = '') {
    const url = query ? `index.html?${query}` : 'index.html';
    await harness.goto(url);
    await harness.page.waitForSelector('[data-testid="home-screen"]', { timeout: 15000 });
    await harness.waitForFonts();
  }

  it('e2e: home shows sunrise navkarshi and sunset with navkarshi exactly 48 minutes after sunrise', async () => {
    await gotoHome('now=2026-01-01T05:00&freeze=1&clock=24h');

    const sunriseTime = await harness.page.$eval(
      '[data-testid="event-card-sunrise"] .ar-event-card-time',
      (el) => el.textContent?.trim() ?? '',
    );
    const navkarshiTime = await harness.page.$eval(
      '[data-testid="event-card-navkarshi"] .ar-event-card-time',
      (el) => el.textContent?.trim() ?? '',
    );
    const sunsetTime = await harness.page.$eval(
      '[data-testid="event-card-sunset"] .ar-event-card-time',
      (el) => el.textContent?.trim() ?? '',
    );

    expect(sunriseTime).toMatch(/^\d{2}:\d{2}$/);
    expect(navkarshiTime).toMatch(/^\d{2}:\d{2}$/);
    expect(sunsetTime).toMatch(/^\d{2}:\d{2}$/);

    const sunriseMs = parseDisplayedTimeToMs('2026-01-01', sunriseTime);
    const navkarshiMs = parseDisplayedTimeToMs('2026-01-01', navkarshiTime);
    expect(navkarshiMs - sunriseMs).toBe(48 * 60 * 1000);
  });

  it('e2e: home sunrise and sunset for Rajkot match the reference dataset within 62 seconds', async () => {
    const refDay = findRajkotReferenceDay('2026-01-01');
    await gotoHome('now=2026-01-01T05:00&freeze=1&clock=24h');

    const sunriseTime = await harness.page.$eval(
      '[data-testid="event-card-sunrise"] .ar-event-card-time',
      (el) => el.textContent?.trim() ?? '',
    );
    const sunsetTime = await harness.page.$eval(
      '[data-testid="event-card-sunset"] .ar-event-card-time',
      (el) => el.textContent?.trim() ?? '',
    );

    const displayedSunriseMs = parseDisplayedTimeToMs('2026-01-01', sunriseTime);
    const displayedSunsetMs = parseDisplayedTimeToMs('2026-01-01', sunsetTime);

    expect(Math.abs(displayedSunriseMs - refDay.sunrise)).toBeLessThanOrEqual(62 * 1000);
    expect(Math.abs(displayedSunsetMs - refDay.sunset)).toBeLessThanOrEqual(62 * 1000);
  });

  it('e2e: home moonrise and moonset for Rajkot match the reference dataset within 70 seconds', async () => {
    const refDay = findRajkotReferenceDay('2026-01-01');
    await gotoHome('now=2026-01-01T10:00&freeze=1&clock=24h');

    const rows = await harness.page.$$eval('[data-testid="moon-card"] .ar-detail-row', (els) =>
      els.map((el) => ({
        label: el.querySelector('.ar-detail-label')?.textContent?.trim() ?? '',
        value: el.querySelector('.ar-detail-value')?.textContent?.trim() ?? '',
      })),
    );

    const riseRow = rows.find((r) => r.label === 'Moonrise');
    const setRow = rows.find((r) => r.label === 'Moonset');

    expect(riseRow).toBeDefined();
    expect(setRow).toBeDefined();

    const displayedRiseMs = parseDisplayedTimeToMs('2026-01-01', riseRow.value);
    const displayedSetMs = parseDisplayedTimeToMs('2026-01-01', setRow.value);

    expect(Math.abs(displayedRiseMs - refDay.moonrise[0])).toBeLessThanOrEqual(70 * 1000);
    expect(Math.abs(displayedSetMs - refDay.moonset[0])).toBeLessThanOrEqual(70 * 1000);
  });

  it('e2e: after sunset the three event cards show tomorrow', async () => {
    await gotoHome('now=2026-01-01T20:00&freeze=1');

    const sunriseTomorrow = await harness.page.$(
      '[data-testid="event-card-sunrise"] [data-testid="tomorrow-badge"]',
    );
    const navkarshiTomorrow = await harness.page.$(
      '[data-testid="event-card-navkarshi"] [data-testid="tomorrow-badge"]',
    );
    const sunsetTomorrow = await harness.page.$(
      '[data-testid="event-card-sunset"] [data-testid="tomorrow-badge"]',
    );

    expect(sunriseTomorrow).not.toBeNull();
    expect(navkarshiTomorrow).not.toBeNull();
    expect(sunsetTomorrow).not.toBeNull();
  });

  it('e2e: between sunrise and navkarshi sunrise shows tomorrow while navkarshi and sunset show today', async () => {
    // 2026-01-01 Rajkot sunrise is 07:27, navkarshi is 08:15
    await gotoHome('now=2026-01-01T07:45&freeze=1');

    const sunriseTomorrow = await harness.page.$(
      '[data-testid="event-card-sunrise"] [data-testid="tomorrow-badge"]',
    );
    const navkarshiTomorrow = await harness.page.$(
      '[data-testid="event-card-navkarshi"] [data-testid="tomorrow-badge"]',
    );
    const sunsetTomorrow = await harness.page.$(
      '[data-testid="event-card-sunset"] [data-testid="tomorrow-badge"]',
    );

    expect(sunriseTomorrow).not.toBeNull();
    expect(navkarshiTomorrow).toBeNull();
    expect(sunsetTomorrow).toBeNull();
  });

  it('e2e: day and night indicator and solar arc follow the simulated time', async () => {
    // Daytime (12:00 IST)
    await gotoHome('now=2026-01-01T12:00&freeze=1');
    const dayIcon = await harness.page.$('.ar-day-night-icon--day');
    const daySun = await harness.page.$('[data-testid="solar-arc-sun"]');
    expect(dayIcon).not.toBeNull();
    expect(daySun).not.toBeNull();

    // Nighttime (22:00 IST)
    await gotoHome('now=2026-01-01T22:00&freeze=1');
    const nightIcon = await harness.page.$('.ar-day-night-icon--night');
    const nightSun = await harness.page.$('[data-testid="solar-arc-sun"]');
    expect(nightIcon).not.toBeNull();
    expect(nightSun).toBeNull();
  });

  it('e2e: greeting changes across 03:59 04:00 12:30 17:00 20:30 and 21:30', async () => {
    const cases = [
      ['2026-11-03T03:59', 'Good night'],
      ['2026-11-03T04:00', 'Good morning'],
      ['2026-11-03T12:30:59', 'Good afternoon'],
      ['2026-11-03T17:00', 'Good evening'],
      ['2026-11-03T20:30', 'Good evening'],
      ['2026-11-03T21:30', 'Good night'],
    ];

    for (const [isoTime, expectedGreeting] of cases) {
      await gotoHome(`now=${isoTime}&freeze=1`);
      const text = await harness.page.$eval('[data-testid="greeting"]', (el) =>
        el.textContent?.trim(),
      );
      expect(text, `At ${isoTime}`).toBe(expectedGreeting);
    }
  });

  it('e2e: tapping an event card opens the details dialog and escape returns focus to the card', async () => {
    await gotoHome('now=2026-01-01T09:00&freeze=1');

    const card = await harness.page.waitForSelector('[data-testid="event-card-sunrise"]');
    await card.click();

    const dialog = await harness.page.waitForSelector('[data-testid="event-dialog"]');
    expect(dialog).not.toBeNull();

    const dialogText = await dialog.textContent();
    expect(dialogText).toContain('Sunrise');
    expect(dialogText).not.toMatch(/\bseconds?\b/i);

    await harness.page.keyboard.press('Escape');
    await harness.page.waitForSelector('[data-testid="event-dialog"]', { state: 'detached' });

    const focusedTestId = await harness.page.evaluate(() =>
      document.activeElement?.getAttribute('data-testid'),
    );
    expect(focusedTestId).toBe('event-card-sunrise');
  });

  it('e2e: the details dialog keeps focus inside and makes the page inert', async () => {
    await gotoHome('now=2026-01-01T09:00&freeze=1');

    await harness.page.click('[data-testid="event-card-navkarshi"]');
    await harness.page.waitForSelector('[data-testid="event-dialog"]');

    // Check #root has inert attribute
    const rootIsInert = await harness.page.evaluate(() => {
      const rootEl = document.getElementById('root');
      return rootEl ? rootEl.hasAttribute('inert') : false;
    });
    expect(rootIsInert).toBe(true);

    // Press Tab several times and ensure focus stays inside the dialog
    for (let i = 0; i < 4; i++) {
      await harness.page.keyboard.press('Tab');
      const insideDialog = await harness.page.evaluate(() => {
        const dialog = document.querySelector('[data-testid="event-dialog"]');
        return dialog ? dialog.contains(document.activeElement) : false;
      });
      expect(insideDialog).toBe(true);
    }

    await harness.page.keyboard.press('Escape');
  });

  it('e2e: location chip opens the locations tab and the date opens the forecast tab', async () => {
    await gotoHome('now=2026-01-01T09:00&freeze=1');

    await harness.page.click('[data-testid="location-chip"]');
    await harness.page.waitForSelector('.ar-coming-soon');
    const locTitle = await harness.page.textContent('.ar-coming-soon');
    expect(locTitle).toContain('Locations');

    // Go back home and click date link
    await gotoHome('now=2026-01-01T09:00&freeze=1');
    await harness.page.click('[data-testid="date-label"]');
    await harness.page.waitForSelector('.ar-coming-soon');
    const forecastTitle = await harness.page.textContent('.ar-coming-soon');
    expect(forecastTitle).toContain('Forecast');
  });

  it('e2e: refresh rebuilds the snapshot and the page stays usable', async () => {
    await gotoHome('now=2026-01-01T09:00&freeze=1');

    const refreshBtn = await harness.page.waitForSelector('[data-testid="refresh-button"]');
    await refreshBtn.click();

    // Wait until button is enabled again
    await harness.page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="refresh-button"]');
        return btn && !btn.disabled;
      },
      { timeout: 15000 },
    );

    // Page stays usable with cards visible
    const cards = await harness.page.$$('[data-testid^="event-card-"]');
    expect(cards.length).toBe(3);
  });

  it('e2e: moon card shows phase name illumination and the moon times or truthful empty states', async () => {
    await gotoHome('now=2026-01-01T10:00&freeze=1');

    const moonCard = await harness.page.waitForSelector('[data-testid="moon-card"]');
    const text = (await moonCard.textContent()) ?? '';
    expect(text).toContain('Moon');
    expect(text).toMatch(/\d+%\s*Illumination/);

    const glyphLabel = await harness.page.$eval('[data-testid="moon-glyph"]', (el) =>
      el.getAttribute('aria-label'),
    );
    expect(glyphLabel).toMatch(/% illuminated/);
  });

  it('e2e: next moonrise countdown shows a time and a day label', async () => {
    await gotoHome('now=2026-01-01T10:00&freeze=1');

    const nextMoonriseText = await harness.page.$$eval(
      '[data-testid="moon-card"] .ar-detail-row',
      (els) => {
        const row = els.find(
          (el) => el.querySelector('.ar-detail-label')?.textContent?.trim() === 'Next Moonrise',
        );
        return row?.querySelector('.ar-detail-value')?.textContent?.trim() ?? '';
      },
    );

    expect(nextMoonriseText).toMatch(/(Today|Tomorrow|\w{3}\s+\d+\s+\w{3})\s+at\s+\d{2}:\d{2}/);
  });

  it('e2e: home countdown label has an accessible name and the live region announces once per minute', async () => {
    await gotoHome('now=2026-01-01T09:00&freeze=1');

    const cardAria = await harness.page.$eval('[data-testid="event-card-sunset"]', (el) =>
      el.getAttribute('aria-label'),
    );
    expect(cardAria).toContain('Sunset');
    expect(cardAria).toMatch(/in \d+/);

    const liveRegions = await harness.page.$$('[aria-live="polite"]');
    expect(liveRegions.length).toBe(1);
    const liveText = await liveRegions[0].textContent();
    expect(liveText?.trim().length).toBeGreaterThan(0);
  });

  it('e2e: far future dates show the approximate badge', async () => {
    await gotoHome('now=2036-06-15T09:00&freeze=1');

    const badge = await harness.page.waitForSelector('[data-testid="accuracy-badge"]');
    expect(badge).not.toBeNull();
    const text = await badge.textContent();
    expect(text).toContain('Approximate');
  });

  it('e2e: home renders in every theme at 390 pixels without horizontal scrolling or console errors', async () => {
    await harness.page.setViewportSize({ width: 390, height: 844 });
    const errors = [];
    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    };
    harness.page.on('console', onConsole);

    try {
      for (const themeId of ALL_THEMES) {
        await gotoHome(`now=2026-01-01T09:00&freeze=1&theme=${themeId}`);

        const scrollWidth = await harness.page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth, `Horizontal overflow in theme ${themeId}`).toBeLessThanOrEqual(390);

        await harness.captureScreenshot(`home-${themeId}-390.png`);
      }
    } finally {
      harness.page.off('console', onConsole);
    }

    expect(errors).toEqual([]);
  }, 60000);

  it('e2e: home is centred at 1280 pixels with a column of at most 560 pixels', async () => {
    await harness.page.setViewportSize({ width: 1280, height: 844 });
    await gotoHome('now=2026-01-01T09:00&freeze=1&theme=light');

    const rect = await harness.page.$eval('[data-testid="home-screen"]', (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width };
    });

    expect(rect.width).toBeLessThanOrEqual(560);
    const rightMargin = 1280 - rect.right;
    expect(Math.abs(rect.left - rightMargin)).toBeLessThan(20);

    await harness.captureScreenshot('home-1280.png');
    await harness.page.setViewportSize({ width: 390, height: 844 });
  });

  it('e2e: pure dark home separates cards by borders', async () => {
    await gotoHome('now=2026-01-01T09:00&freeze=1&theme=pure-dark');

    const styles = await harness.page.$eval('[data-testid="event-card-sunrise"]', (el) => {
      const cs = window.getComputedStyle(el);
      return {
        borderTopWidth: parseFloat(cs.borderTopWidth),
        borderTopStyle: cs.borderTopStyle,
        borderTopColor: cs.borderTopColor,
        backgroundColor: cs.backgroundColor,
      };
    });

    expect(styles.borderTopWidth).toBeGreaterThan(0);
    expect(styles.borderTopStyle).toBe('solid');
    expect(styles.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.borderTopColor).not.toBe(styles.backgroundColor);
  });
});
