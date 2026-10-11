// Shared test fixture: a signed-in CMS page that records server errors and broken files, and a screenshot of the
// final screen attached to every test (the dashboard shows it).
import { test as base, expect, type Page } from '@playwright/test';
import { config } from './config';

interface CmsFixtures {
  /** Signed-in page; problems the CMS reports while it is open are collected in `problems`. */
  cms: Page & { problems: string[] };
}

export const test = base.extend<CmsFixtures>({
  cms: async ({ page }, use, testInfo) => {
    const problems: string[] = [];
    page.on('response', (r) => {
      // 4xx on page files (scripts, styles) and any 5xx are CMS defects worth reporting.
      if (r.status() >= 500 || (r.status() === 404 && /\.(js|css)(\?|$)/.test(r.url()))) {
        problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(config.baseUrl, '')}`);
      }
    });
    page.on('pageerror', (e) => problems.push(`script error: ${e.message}`));
    await use(Object.assign(page, { problems }));
    await testInfo.attach('final screen', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' }).catch(() => {});
    if (problems.length) await testInfo.attach('CMS errors', { body: problems.join('\n'), contentType: 'text/plain' });
  },
});

export { expect };

/** Opens a CMS page and checks the session is still signed in. */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(config.baseUrl + path, { waitUntil: 'networkidle' });
  expect(page.url(), 'still signed in (not sent back to the sign-in page)').not.toMatch(/\/login(\?|$)/);
}
