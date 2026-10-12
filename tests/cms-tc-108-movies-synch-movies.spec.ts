// CMS-TC-108 Movies/Cinemas › Movies – Synch Movies: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / But once we click synch movies navigation is going to coniguration menu > Synch page. It should be stayed in same menu/sub menu
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-108 Movies – Synch Movies', sheet('CMS-TC-108'), async ({ cms, step }) => {
  // A real Sync Movies on UAT (approved 11 Oct 2026). The CMS answers the request when the sync has finished.
  test.setTimeout(600_000);
  const list = new ListPage(cms, pages.movies);
  await step('Open Movies/Cinemas › Movies', () => list.open());
  const button = cms.locator('a').filter({ hasText: /^\s*Sync\s+Movies\s*$/i }).first();
  await step('Check the Sync Movies button is shown', async () => {
    await expect(button).toBeVisible();
  });
  await step('Press Sync Movies and wait until the CMS has finished', async () => {
    const href = (await button.getAttribute('href')) ?? '';
    // The click does not wait for the page to load: the import / sync can take minutes, the response is awaited instead.
    await Promise.all([cms.waitForResponse((r) => new URL(r.url()).pathname === href, { timeout: 540_000 }), button.click({ noWaitAfter: true })]);
    // The CMS may redirect once more after answering: wait for the page that stays, then read its message.
    await cms.waitForLoadState('load', { timeout: 120_000 }).catch(() => {});
    await cms.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => {});
    const message = await cms.locator('.alert, .msg, #msg').allTextContents().catch(() => ['(page still loading)']);
    await test.info().attach('after Sync Movies', { body: `${cms.url()}\n${message.join('\n')}`, contentType: 'text/plain' });
  });
  await step('Check no error page is shown and the session is still signed in', async () => {
    await expect(cms.locator('body')).not.toContainText(/whitelabel error page|exception|internal server error/i);
    expect(cms.url()).not.toMatch(/\/login/);
  });
  await step('Check it stays in Movies/Cinemas › Movies (manual checklist: it moves to the Configurations menu)', async () => {
    expect.soft(new URL(cms.url()).pathname).toBe('/admin/movie/list');
  });
  await step('Open the list again: it loads with records', async () => {
    await list.open();
    expect(await list.table.total()).toBeGreaterThan(0);
  });
  expectNoCmsErrors(cms);
});
