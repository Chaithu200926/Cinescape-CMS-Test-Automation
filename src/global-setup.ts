// Signs in to the CMS once before the run and saves the session (.auth/state.json) for every test.
// Signing in once also keeps the admin account from being locked by many sign-ins.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { config } from './config';

export default async function globalSetup(): Promise<void> {
  if (!config.username || !config.password) {
    throw new Error('CMS_USERNAME and CMS_PASSWORD must be set in .env (see .env.example).');
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${config.baseUrl}/login`, { timeout: 30_000 }).catch((e: Error) => {
      throw new Error(`CMS not reachable at ${config.baseUrl} (office network only): ${e.message}`);
    });
    await page.locator('#username').fill(config.username);
    await page.locator('#password').fill(config.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForLoadState('networkidle');
    // A failed sign-in stays on /login and shows "Sign-in did not work ... Bad credentials".
    if (/\/login/.test(page.url())) {
      const message = (await page.locator('#errorMsg').textContent().catch(() => ''))?.trim().replace(/\s+/g, ' ');
      throw new Error(`CMS sign-in failed for CMS_USERNAME in .env: ${message || page.url()}. Not retrying, so the account is not locked.`);
    }
    fs.mkdirSync(path.dirname(config.storageState), { recursive: true });
    await page.context().storageState({ path: config.storageState });
  } finally {
    await browser.close();
  }
}
