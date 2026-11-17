import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestHarness } from './helpers.mjs';

describe('Rolling Digits Real-Browser Tests', () => {
  let harness;

  beforeAll(async () => {
    harness = await createTestHarness({ target: 'pages' });
    await harness.goto('components.html');
    await harness.waitForFonts();
  });

  afterAll(async () => {
    if (harness) {
      await harness.close();
    }
  });

  it('rolling lab mounts with initial static text', async () => {
    const lab = await harness.page.$('#rolling-lab');
    expect(lab).not.toBeNull();

    const text = await harness.page.$eval('#rolling-lab .ar-countdown', (el) => el.textContent);
    expect(text).toContain('02h 48m');

    const entering = await harness.page.$('#rolling-lab .ar-roll-enter');
    const exiting = await harness.page.$('#rolling-lab .ar-roll-exit');
    expect(entering).toBeNull();
    expect(exiting).toBeNull();

    await harness.captureScreenshot('rolling-lab-settled.png');
  });

  it('single minute decrement rolls down', async () => {
    await harness.page.click('#step-down-1m');
    const rollingDown = await harness.page.waitForSelector(
      '#rolling-lab .ar-roll-slot[data-dir="down"]',
      { timeout: 1000 },
    );
    expect(rollingDown).not.toBeNull();
    await harness.captureScreenshot('rolling-lab-mid-transition.png');
  });

  it('single minute increment rolls up', async () => {
    // Wait for settle
    await harness.page.waitForTimeout(500);
    await harness.page.click('#step-up-1m');
    const rollingUp = await harness.page.waitForSelector(
      '#rolling-lab .ar-roll-slot[data-dir="up"]',
      { timeout: 1000 },
    );
    expect(rollingUp).not.toBeNull();
  });

  it('hour rollover 03h 00m to 02h 59m rolls all changing digits down', async () => {
    await harness.page.click('#set-rollover-3h');
    await harness.page.waitForTimeout(500);

    await harness.page.click('#set-rollover-2h59');
    await harness.page.waitForSelector('#rolling-lab .ar-countdown-shade .ar-roll-slot[data-dir]', {
      timeout: 1000,
    });
    const changingSlots = await harness.page.$$eval(
      '#rolling-lab .ar-countdown-shade .ar-roll-slot[data-dir]',
      (elements) =>
        elements.map((el) => ({
          slot: el.getAttribute('data-slot'),
          dir: el.getAttribute('data-dir'),
        })),
    );

    expect(changingSlots.length).toBeGreaterThanOrEqual(2);
    for (const s of changingSlots) {
      expect(s.dir).toBe('down');
    }
  });

  it('multi-digit rollover 10h 00m to 09h 59m rolls all changing digits down', async () => {
    await harness.page.click('#set-rollover-10h');
    await harness.page.waitForTimeout(500);

    await harness.page.click('#set-rollover-9h59');
    await harness.page.waitForSelector('#rolling-lab .ar-countdown-shade .ar-roll-slot[data-dir]', {
      timeout: 1000,
    });
    const changingSlots = await harness.page.$$eval(
      '#rolling-lab .ar-countdown-shade .ar-roll-slot[data-dir]',
      (elements) => elements.map((el) => el.getAttribute('data-dir')),
    );

    expect(changingSlots.length).toBeGreaterThanOrEqual(3);
    for (const dir of changingSlots) {
      expect(dir).toBe('down');
    }
  });

  it('rapid consecutive clicks maintain consistent animation state', async () => {
    await harness.page.waitForTimeout(500);
    // Rapidly click 4 times
    await harness.page.click('#step-down-1m');
    await harness.page.click('#step-down-1m');
    await harness.page.click('#step-down-1m');
    await harness.page.click('#step-down-1m');

    // Confirm countdown is still well-formed in DOM
    const countdown = await harness.page.$('#rolling-lab .ar-countdown');
    expect(countdown).not.toBeNull();
  });

  it('digits settle completely to static state after animation', async () => {
    // Wait for animation safety timeout (400ms + buffer)
    await harness.page.waitForTimeout(600);

    const exiting = await harness.page.$$('#rolling-lab .ar-roll-exit');
    expect(exiting.length).toBe(0);

    const activeSlots = await harness.page.$$('#rolling-lab .ar-roll-slot[data-dir]');
    expect(activeSlots.length).toBe(0);
  });

  it('digit width accommodates all lining digits without clipping', async () => {
    const isAccommodated = await harness.page.evaluate(() => {
      const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const slot = document.querySelector('#rolling-lab .ar-roll-slot[data-digit="true"]');
      if (!slot) return false;
      const slotWidth = slot.getBoundingClientRect().width;
      const computed = window.getComputedStyle(slot);

      // Ensure every digit fits within slotWidth
      const temp = document.createElement('span');
      temp.style.position = 'absolute';
      temp.style.visibility = 'hidden';
      temp.style.display = 'inline-block';
      temp.style.fontFamily = "'Playfair Display', Georgia, serif";
      temp.style.fontSize = computed.fontSize;
      temp.style.fontWeight = computed.fontWeight;
      temp.style.fontFeatureSettings = "'lnum' 1";
      document.body.appendChild(temp);

      let allFit = true;
      for (const d of digits) {
        temp.textContent = d;
        if (temp.getBoundingClientRect().width > slotWidth + 0.5) {
          allFit = false;
        }
      }
      document.body.removeChild(temp);
      return allFit;
    });

    expect(isAccommodated).toBe(true);
  });

  it('reduced motion disables transform transitions', async () => {
    await harness.page.emulateMedia({ reducedMotion: 'reduce' });
    await harness.page.click('#step-down-1m');

    const exitCount = await harness.page.$$eval(
      '#rolling-lab .ar-roll-exit',
      (els) => els.filter((el) => window.getComputedStyle(el).display !== 'none').length,
    );
    expect(exitCount).toBe(0);

    // Reset emulation
    await harness.page.emulateMedia({ reducedMotion: 'no-preference' });
  });
});
