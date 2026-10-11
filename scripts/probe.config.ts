// Settings for `npm run probe` (scripts/probe.spec.ts): same sign-in as the tests, no report.
import { defineConfig, devices } from '@playwright/test';
import { config } from '../src/config';

export default defineConfig({
  testDir: '.',
  testMatch: /probe\.spec\.ts$/,
  globalSetup: '../src/global-setup.ts',
  timeout: 900_000,
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 }, storageState: config.storageState, actionTimeout: 30_000 },
});
