// Playwright settings for the Cinescape CMS (back office) tests.
import { defineConfig, devices } from '@playwright/test';
import { config } from './src/config';

export default defineConfig({
  // Test files live in tests/, one per CMS menu.
  testDir: './tests',
  // Sign in once and reuse the session in every test.
  globalSetup: './src/global-setup.ts',
  outputDir: 'test-results/artifacts',
  // One admin account: tests run one at a time so they never edit the same page together.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The UAT CMS is slow on large reports.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
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
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
