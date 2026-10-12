// CMS-TC-116 Movies/Cinemas › Movies Person – List: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-116 Movies Person – List', sheet('CMS-TC-116'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.moviesPerson);
  await step('Open Movies/Cinemas › Movies Person', () => list.open());
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
