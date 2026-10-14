// Signs in to the CMS with CMS_USERNAME / CMS_PASSWORD and saves the session (.auth/state.json) for the tests.
// One attempt only: a refused sign-in stops at once, so the admin account is never locked by retries.
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { config } from './config';

export async function signIn(page: Page): Promise<void> {
  if (!config.username || !config.password) throw new Error('CMS_USERNAME and CMS_PASSWORD must be set in .env (see .env.example).');
  await page.goto(`${config.baseUrl}/login`, { timeout: 30_000 }).catch((e: Error) => {
    throw new Error(`CMS not reachable at ${config.baseUrl} (office network only): ${e.message}`);
  });
  await page.locator('#username').fill(config.username);
  await page.locator('#password').fill(config.password);
  // "Sign in" on UAT and Pre-UAT; "Login" on UAT (internal), which still has the older sign-in page.
  await page.locator('form').filter({ has: page.locator('#password') }).getByRole('button', { name: /^\s*(sign in|login)\s*$/i }).click();
  await page.waitForLoadState('networkidle');
  // A failed sign-in stays on /login and shows "Sign-in did not work ... Bad credentials".
  if (/\/login/.test(page.url())) {
    const message = (await page.locator('#errorMsg, .alert-danger').first().textContent({ timeout: 5_000 }).catch(() => ''))?.trim().replace(/\s+/g, ' ');
    throw new Error(`CMS sign-in failed on ${config.envName} (${config.baseUrl}) for the username in .env: ${message || page.url()}. Not retrying, so the account is not locked.`);
  }
  fs.mkdirSync(path.dirname(config.storageState), { recursive: true });
  await page.context().storageState({ path: config.storageState });
}
