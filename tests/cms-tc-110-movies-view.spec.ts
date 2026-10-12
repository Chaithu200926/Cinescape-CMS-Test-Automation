// CMS-TC-110 Movies/Cinemas › Movies – View: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-110 Movies – View', sheet('CMS-TC-110'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.movies);
  await step('Open Movies/Cinemas › Movies', () => list.open());
  await step('Click View on the first record', async () => {
    const row = list.table.rows.first();
    await list.click(row.locator('a, button').filter({ hasText: /view/i }).or(row.locator('[title*="View" i]')).first());
  });
  await step('Check the record details open', async () => {
    await expect(cms.locator('.modal.in, .modal.show').first()).toBeVisible();
  });
  expectNoCmsErrors(cms);
});
