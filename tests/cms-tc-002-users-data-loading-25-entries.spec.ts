// CMS-TC-002 User Management › Users – Data Loading 25 entries: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes / Initial load taking time and hence UI is not proper. Performance optimization needed
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-002 Users – Data Loading 25 entries', sheet('CMS-TC-002'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.users);
  await step('Open User Management › Users', () => list.open());
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
