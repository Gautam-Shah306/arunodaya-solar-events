import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

try {
  const execPath = chromium.executablePath();
  if (fs.existsSync(execPath)) {
    console.log('Playwright Chromium browser already installed at:', execPath);
    process.exit(0);
  }
} catch {
  // Executable path not found, proceed to install
}

console.log('Installing Playwright Chromium browser...');
try {
  execSync('npx playwright-core install chromium', { stdio: 'inherit' });
  console.log('Chromium installed at:', chromium.executablePath());
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Failed to install Chromium:', msg);
  process.exit(1);
}
