// Playwright settings for the Cinescape CMS (back office) tests on UAT (http://10.35.1.66:8092).
// The same tests run on UAT (internal) and Pre-UAT with playwright.uat-internal.config.ts / playwright.pre-uat.config.ts.
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { config } from './src/config';

export default defineConfig({
  // Test files live in tests/, one per CMS-TC case.
  testDir: './tests',
  // Sign in once and reuse the session in every test.
  globalSetup: './src/global-setup.ts',
  outputDir: path.join(config.resultsDir, 'artifacts'),
  // One admin account: tests run one at a time so they never edit the same page together.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The UAT CMS is slow on large reports.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: config.reportDir }],
    ['json', { outputFile: path.join(config.resultsDir, 'results.json') }],
    ['junit', { outputFile: path.join(config.resultsDir, 'results.xml') }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1600, height: 900 },
    baseURL: config.baseUrl,
    storageState: config.storageState,
    acceptDownloads: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    screenshot: 'on',
    // Only failed tests keep their video; the dashboard plays it. Passed tests have their step screenshots.
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
