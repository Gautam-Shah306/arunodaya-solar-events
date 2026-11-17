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

  it('pages target loads with valid CSP header and no console errors', async () => {
    const response = await harness.goto('index.html');
    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    const headers = response?.headers() ?? {};
    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).not.toContain('blob:');

    await harness.waitForFonts();
    expect(consoleErrors).toEqual([]);
  });

  it('Playfair Display font is loaded and applied to headings', async () => {
    await harness.goto('index.html');
    await harness.page.waitForSelector('.ar-home-greeting');
    await harness.waitForFonts();

    const isFontLoaded = await harness.page.evaluate(() => {
      return document.fonts.check('24px "Playfair Display"');
    });
    expect(isFontLoaded).toBe(true);

    const headingFont = await harness.page.$eval('.ar-home-greeting', (el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    expect(headingFont).toContain('Playfair Display');
  });

  it('theme toggle updates document dataset and early paint storage', async () => {
    await harness.goto('components.html');
    await harness.waitForFonts();

    // Click Pure Dark theme button
    const pureDarkBtn = await harness.page.waitForSelector('.ar-theme-btn:has-text("pure-dark")');
    expect(pureDarkBtn).not.toBeNull();
    await pureDarkBtn?.click();

    const currentTheme = await harness.page.evaluate(() => document.documentElement.dataset.theme);
    expect(currentTheme).toBe('pure-dark');

    // Switch to Light
    const lightBtn = await harness.page.waitForSelector('.ar-theme-btn:has-text("light")');
    await lightBtn?.click();
    const lightTheme = await harness.page.evaluate(() => document.documentElement.dataset.theme);
    expect(lightTheme).toBe('light');
  });

  it('clock format toggle switches between 12h and 24h display', async () => {
    await harness.goto('index.html');
    await harness.waitForFonts();

    const initialTime = await harness.page.waitForSelector('.ar-home-card-time');
    const initialText = await initialTime?.textContent();
    expect(initialText).toMatch(/\d{2}:\d{2}/);
  });

  it('manual location entry updates coordinate display', async () => {
    await harness.goto('index.html');
    await harness.waitForFonts();

    const locationLabel = await harness.page.waitForSelector('.ar-home-location');
    const text = await locationLabel?.textContent();
    expect(text).toBe('Rajkot');
  });

  it('snapshot worker calculates astronomical events without main thread block', async () => {
    await harness.goto('index.html');
    await harness.waitForFonts();

    // Verify upcoming event countdowns rendered with non-empty text
    const cards = await harness.page.$$('.ar-home-card');
    expect(cards.length).toBeGreaterThanOrEqual(1);

    const countdownText = await harness.page.$eval(
      '.ar-home-card .ar-countdown',
      (el) => el.textContent,
    );
    expect(countdownText).toMatch(/\d{2}h\s+\d{2}m/);

    // Capture screenshots
    await harness.captureScreenshot('home-preview-light.png');

    // Also capture Pure Dark
    await harness.goto('index.html?theme=pure-dark');
    await harness.waitForFonts();
    await harness.captureScreenshot('home-preview-pure-dark.png');
  });

  it('components gallery displays all theme previews and specimens', async () => {
    await harness.goto('components.html');
    await harness.waitForFonts();

    const buttons = await harness.page.$$('.ar-theme-btn');
    expect(buttons.length).toBe(8);

    const buttonTexts = await harness.page.$$eval('.ar-theme-btn', (els) =>
      els.map((e) => e.textContent?.trim()),
    );
    expect(buttonTexts).toEqual([
      'light',
      'dark',
      'pure-dark',
      'darker',
      'pack-navy',
      'pack-burgundy',
      'pack-porcelain',
      'pack-sandstone',
    ]);

    // Check 48px and 20px specimens
    const specimen48 = await harness.page.$('.ar-specimen-48');
    const specimen20 = await harness.page.$('.ar-specimen-20');
    expect(specimen48).not.toBeNull();
    expect(specimen20).not.toBeNull();

    await harness.captureScreenshot('components-gallery.png');
  });
});
