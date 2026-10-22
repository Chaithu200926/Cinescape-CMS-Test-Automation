// CMS-TC-018 Configurations › Configuration – Import data: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Retest: Yes / Not checked
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';
import { realActions, notApproved } from '../src/config';

test('CMS-TC-018 Configuration – Import data', sheet('CMS-TC-018'), async ({ cms, step }) => {
  test.skip(!realActions.sync, notApproved);
  // A real Import Data on UAT (approved 11 Oct 2026). The CMS answers the request when the sync has finished.
  test.setTimeout(600_000);
  const list = new ListPage(cms, pages.configuration);
  await step('Open Configurations › Configuration', () => list.open());
  const button = cms.locator('a').filter({ hasText: /^\s*Import\s+Data\s*$/i }).first();
  await step('Check the Import Data button is shown', async () => {
    await expect(button).toBeVisible();
  });
  await step('Press Import Data and wait until the CMS has finished', async () => {
    const href = (await button.getAttribute('href')) ?? '';
    // The click does not wait for the page to load: the import / sync can take minutes, the response is awaited instead.
    await Promise.all([cms.waitForResponse((r) => new URL(r.url()).pathname === href, { timeout: 540_000 }), button.click({ noWaitAfter: true })]);
    // The CMS may redirect once more after answering: wait for the page that stays, then read its message.
    await cms.waitForLoadState('load', { timeout: 120_000 }).catch(() => {});
    await cms.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => {});
    const message = await cms.locator('.alert, .msg, #msg').allTextContents().catch(() => ['(page still loading)']);
    await test.info().attach('after Import Data', { body: `${cms.url()}\n${message.join('\n')}`, contentType: 'text/plain' });
  });
  await step('Check no error page is shown and the session is still signed in', async () => {
    await expect(cms.locator('body')).not.toContainText(/whitelabel error page|exception|internal server error/i);
    expect(cms.url()).not.toMatch(/\/login/);
  });
  await step('Open the list again: it loads with records', async () => {
    await list.open();
    expect(await list.table.total()).toBeGreaterThan(0);
  });
  expectNoCmsErrors(cms);
});
