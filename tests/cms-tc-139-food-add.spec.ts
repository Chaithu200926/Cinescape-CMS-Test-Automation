// CMS-TC-139 Movies/Cinemas › Food – Add: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / Retest: Yes - add food removed / 500 Internal server error - 500 issue resolved and new ticket logged for images not appearing in edit screen and expanded listing view
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-139 Food – Add', sheet('CMS-TC-139'), async ({ cms, step }) => {
  // Manual checklist: "Yes - add food removed": Add Food was taken out of the CMS on purpose.
  const list = new ListPage(cms, pages.food);
  await step('Open Movies/Cinemas › Food', () => list.open());
  await step('Check Add Food is not offered (removed on purpose)', async () => {
    await expect(cms.locator('a, button').filter({ hasText: /^\s*add food\s*$/i })).toHaveCount(0);
  });
  expectNoCmsErrors(cms);
});
