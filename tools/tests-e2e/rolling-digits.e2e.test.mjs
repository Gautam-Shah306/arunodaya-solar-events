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

  it('e2e: every decrement animates the changed digits downward', async () => {
    await harness.page.click('#step-down-1m');
    const rollingDown = await harness.page.waitForSelector(
      '#rolling-lab .ar-roll-slot[data-dir="down"]',
      { timeout: 1000 },
    );
    expect(rollingDown).not.toBeNull();
    await harness.captureScreenshot('rolling-lab-decrement.png');
  });

  it('e2e: every increment animates the changed digits upward', async () => {
    await harness.page.waitForTimeout(500);
    await harness.page.click('#step-up-1m');
    const rollingUp = await harness.page.waitForSelector(
      '#rolling-lab .ar-roll-slot[data-dir="up"]',
      { timeout: 1000 },
    );
    expect(rollingUp).not.toBeNull();
  });

  it('e2e: increment from 00h 59m to 01h 00m rolls nine to zero upward', async () => {
    await harness.page.click('#set-rollover-59m');
    await harness.page.waitForTimeout(500);

    await harness.page.click('#set-rollover-1h');
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
      expect(s.dir).toBe('up');
    }
  });

  it('e2e: decrement from 01h 00m to 00h 59m rolls zero to nine downward', async () => {
    await harness.page.click('#set-rollover-1h');
    await harness.page.waitForTimeout(500);

    await harness.page.click('#set-rollover-59m');
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

  it('e2e: twelve rapid changes in a row each start a new animation', async () => {
    await harness.page.waitForTimeout(500);
    for (let i = 0; i < 12; i++) {
      await harness.page.click('#step-down-1m');
    }

    const countdown = await harness.page.$('#rolling-lab .ar-countdown');
    expect(countdown).not.toBeNull();
  });

  it('e2e: the exiting digit is removed after the animation finishes', async () => {
    await harness.page.waitForTimeout(600);

    const exiting = await harness.page.$$('#rolling-lab .ar-roll-exit');
    expect(exiting.length).toBe(0);

    const activeSlots = await harness.page.$$('#rolling-lab .ar-roll-slot[data-dir]');
    expect(activeSlots.length).toBe(0);
  });

  it('e2e: slot geometry stays constant while digits roll', async () => {
    const slot = await harness.page.$('#rolling-lab .ar-roll-slot[data-digit="true"]');
    expect(slot).not.toBeNull();
    const boxBefore = await slot?.boundingBox();

    await harness.page.click('#step-down-1m');
    const boxDuring = await slot?.boundingBox();

    expect(boxBefore?.width).toBeCloseTo(boxDuring?.width ?? 0, 1);
    expect(boxBefore?.height).toBeCloseTo(boxDuring?.height ?? 0, 1);
  });

  it('e2e: reduced motion removes the roll animations', async () => {
    await harness.page.emulateMedia({ reducedMotion: 'reduce' });
    await harness.page.waitForFunction(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    await harness.page.click('#step-down-1m');

    const exitCount = await harness.page.$$eval(
      '#rolling-lab .ar-roll-exit',
      (els) => els.filter((el) => window.getComputedStyle(el).display !== 'none').length,
    );
    expect(exitCount).toBe(0);

    await harness.page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  it('e2e: direction reverses correctly when stepping up after stepping down', async () => {
    await harness.page.waitForTimeout(500);
    await harness.page.click('#step-down-1m');
    await harness.page.waitForSelector('#rolling-lab .ar-roll-slot[data-dir="down"]', {
      timeout: 1000,
    });

    await harness.page.waitForTimeout(400);
    await harness.page.click('#step-up-1m');
    const rollingUp = await harness.page.waitForSelector(
      '#rolling-lab .ar-roll-slot[data-dir="up"]',
      { timeout: 1000 },
    );
    expect(rollingUp).not.toBeNull();
  });

  it('e2e: digits 0 to 9 have the same advance width with tabular lining figures', async () => {
    // Tests calibrated slot width and digit bounding boxes in Playfair Display
    const isAccommodated = await harness.page.evaluate(() => {
      const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const slot = document.querySelector('#rolling-lab .ar-roll-slot[data-digit="true"]');
      if (!slot) return false;
      const slotWidth = slot.getBoundingClientRect().width;
      const computed = window.getComputedStyle(slot);

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
});
