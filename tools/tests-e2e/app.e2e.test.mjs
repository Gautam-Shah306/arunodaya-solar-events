import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestHarness } from './helpers.mjs';

describe('Application Real-Browser Tests', () => {
  let harness;
  const consoleErrors = [];

  beforeAll(async () => {
    harness = await createTestHarness({ target: 'pages' });
    harness.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  afterAll(async () => {
    if (harness) {
      await harness.close();
    }
  });

  it('e2e: the serif font loads from the bundled file and is applied to countdown digits', async () => {
    await harness.goto('index.html');
    await harness.page.waitForSelector('.ar-countdown', { timeout: 10000 });
    await harness.waitForFonts();

    const isFontLoaded = await harness.page.evaluate(() => {
      return document.fonts.check('24px "Playfair Display"');
    });
    expect(isFontLoaded).toBe(true);

    const countdownFont = await harness.page.$eval('.ar-countdown', (el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    expect(countdownFont).toContain('Playfair Display');
  });

  it('e2e: the snapshot worker starts under the content security policy and the app leaves the loading state', async () => {
    let violationFound = false;
    await harness.page.exposeFunction('onCspViolation', () => {
      violationFound = true;
    });

    await harness.page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', () => {
        // @ts-expect-error test bridge
        window.onCspViolation?.();
      });
    });

    const response = await harness.goto('index.html');
    expect(response?.status()).toBe(200);

    const headers = response?.headers() ?? {};
    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("worker-src 'self'");
    expect(csp).not.toContain('blob:');

    // Wait for worker computation to complete and leave loading state
    const card = await harness.page.waitForSelector('.ar-countdown', { timeout: 10000 });
    expect(card).not.toBeNull();

    expect(violationFound).toBe(false);
    expect(consoleErrors).toEqual([]);
  });

  it('e2e: the home countdown rolls down when the minute changes', async () => {
    // Start live offset clock 3 seconds before a minute boundary (06:40:57 -> 06:41:00)
    await harness.goto('index.html?now=2026-11-17T06:40:57');
    await harness.page.waitForSelector('.ar-countdown', { timeout: 10000 });
    await harness.waitForFonts();

    const initialLabel = await harness.page.$eval(
      '[data-testid="event-card-sunrise"] .ar-countdown-sr',
      (el) => el.textContent?.trim() ?? '',
    );

    // Observe DOM synchronously so we never miss the 260ms animation window
    const sawRollDown = await harness.page.evaluate(() => {
      return new Promise((resolve) => {
        if (document.querySelector('.ar-roll-slot[data-dir="down"]')) {
          resolve(true);
          return;
        }
        const timer = setTimeout(() => {
          observer.disconnect();
          resolve(false);
        }, 5000);
        const observer = new window.MutationObserver(() => {
          if (document.querySelector('.ar-roll-slot[data-dir="down"]')) {
            clearTimeout(timer);
            observer.disconnect();
            resolve(true);
          }
        });
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['data-dir'],
        });
      });
    });

    expect(sawRollDown).toBe(true);

    const updatedLabel = await harness.page.$eval(
      '[data-testid="event-card-sunrise"] .ar-countdown-sr',
      (el) => el.textContent?.trim() ?? '',
    );
    expect(updatedLabel).not.toBe(initialLabel);
  });

  it('e2e: every theme renders the components page without console errors', async () => {
    const themes = [
      'light',
      'dark',
      'pure-dark',
      'darker',
      'pack-navy',
      'pack-burgundy',
      'pack-porcelain',
      'pack-sandstone',
    ];

    for (const theme of themes) {
      consoleErrors.length = 0;
      await harness.goto(`components.html?theme=${theme}`);
      await harness.page.waitForSelector('.ar-countdown', { timeout: 10000 });
      await harness.waitForFonts();

      const applied = await harness.page.evaluate(() => document.documentElement.dataset.theme);
      expect(applied).toBe(theme);
      expect(consoleErrors).toEqual([]);
    }
  });

  it('e2e: the themes page shows eight themes and no horizontal scrolling at 390 pixels', async () => {
    await harness.page.setViewportSize({ width: 390, height: 844 });
    await harness.goto('themes.html');
    await harness.page.waitForSelector('.theme-section', { timeout: 10000 });
    await harness.waitForFonts();

    const cards = await harness.page.$$('.theme-section');
    expect(cards.length).toBe(8);

    const hasNoHorizontalScroll = await harness.page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth;
    });
    expect(hasNoHorizontalScroll).toBe(true);

    await harness.captureScreenshot('themes-390.png');
  });

  it('e2e: the removed theme ids fall back to the system theme', async () => {
    // Light scheme emulation -> removed theme ids should resolve to light
    await harness.page.emulateMedia({ colorScheme: 'light' });
    await harness.goto('index.html?theme=pack-aubergine');
    let theme = await harness.page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('light');

    await harness.goto('index.html?theme=pack-midnight-teal');
    theme = await harness.page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('light');

    // Dark scheme emulation -> removed theme ids should resolve to pure-dark
    await harness.page.emulateMedia({ colorScheme: 'dark' });
    await harness.goto('index.html?theme=pack-aubergine');
    theme = await harness.page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('pure-dark');

    await harness.goto('index.html?theme=pack-midnight-teal');
    theme = await harness.page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('pure-dark');
  });
});
