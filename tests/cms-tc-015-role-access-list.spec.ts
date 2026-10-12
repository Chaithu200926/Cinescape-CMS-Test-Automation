// CMS-TC-015 User Management › Role access – List: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Before page loads, roles are listing in grid and UI is not proper after page load roles are not listing
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-015 Role access – List', sheet('CMS-TC-015'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.roleAccess);
  await step('Open User Management › Role access', () => list.open());
  const [from, to] = await step('Read "Showing x to y of z entries"', () => list.table.range());
  await step('Check no loading indicator is left on the page', async () => {
    await expect(cms.locator('.dataTables_processing:visible')).toHaveCount(0);
  });
  await step('Check the list has records', async () => {
    expect(await list.table.total()).toBeGreaterThan(0);
  });
  await step(`Check ${to - from + 1} rows are shown, as "Showing ${from} to ${to}" says`, () => list.expectRowCount(to - from + 1));
  expectNoCmsErrors(cms);
});
