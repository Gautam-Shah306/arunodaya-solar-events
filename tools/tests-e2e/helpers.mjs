import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startPreviewServer } from '../lib/preview.mjs';

export const SCREENSHOTS_DIR = path.resolve('.scratch/e2e');

/**
 * Ensures the screenshot output directory exists.
 */
export function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * Launches a headless Chromium browser instance.
 * @param {import('playwright-core').LaunchOptions} [options]
 * @returns {Promise<import('playwright-core').Browser>}
 */
export async function launchBrowser(options = {}) {
  return await chromium.launch({
    headless: true,
    ...options,
  });
}

/**
 * Sets up an end-to-end test harness with preview server and headless browser.
 *
 * @param {object} [options]
 * @param {'pages' | 'android'} [options.target='pages']
 * @param {number} [options.viewportWidth=390]
 * @param {number} [options.viewportHeight=844]
 * @returns {Promise<{
 *   server: { url: string, close(): Promise<void> },
 *   browser: import('playwright-core').Browser,
 *   context: import('playwright-core').BrowserContext,
 *   page: import('playwright-core').Page,
 *   goto(route?: string): Promise<import('playwright-core').Response | null>,
 *   waitForFonts(): Promise<void>,
 *   captureScreenshot(filename: string): Promise<string>,
 *   close(): Promise<void>
 * }>}
 */
export async function createTestHarness(options = {}) {
  const target = options.target ?? 'pages';
  const server = await startPreviewServer({ target });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: {
      width: options.viewportWidth ?? 390,
      height: options.viewportHeight ?? 844,
    },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  async function goto(route = '') {
    const cleanRoute = route.startsWith('/') ? route.slice(1) : route;
    const dest = `${server.url}${cleanRoute}`;
    return await page.goto(dest, { waitUntil: 'domcontentloaded' });
  }

  async function waitForFonts() {
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  }

  async function captureScreenshot(filename) {
    ensureScreenshotDir();
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filePath, fullPage: false });
    return filePath;
  }

  return {
    server,
    browser,
    context,
    page,
    goto,
    waitForFonts,
    captureScreenshot,
    async close() {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
      await server.close().catch(() => {});
    },
  };
}
