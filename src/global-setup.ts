// Signs in to the CMS once before the run and saves the session (.auth/state.json) for every test.
// Signing in once also keeps the admin account from being locked by many sign-ins.
import { chromium } from '@playwright/test';
import { signIn } from './sign-in';

export default async function globalSetup(): Promise<void> {
  const browser = await chromium.launch();
  try {
    await signIn(await browser.newPage());
  } finally {
    await browser.close();
  }
}
