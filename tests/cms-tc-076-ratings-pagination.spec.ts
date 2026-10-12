// CMS-TC-076 Configurations › Ratings – Pagination: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-076 Ratings – Pagination', sheet('CMS-TC-076'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.ratings);
  await step('Open Configurations › Ratings', () => list.open());
  const total = await step('Note the number of entries ("of z entries")', () => list.table.total());
  const [, lastRow] = await step('Note the rows on the first page ("Showing 1 to y")', () => list.table.range());
  if (total <= lastRow) {
    await step(`All ${total} entries fit on one page: check Next is disabled`, async () => {
      await expect(list.table.next).toHaveClass(/disabled/);
    });
  } else {
    const firstRow = await step('Note the first row of page 1', async () => (await list.table.rows.first().textContent()) ?? '');
    await step('Click Next', () => list.clickPager(list.table.next));
    await step(`Check page 2 starts at row ${lastRow + 1} with other records`, async () => {
      await list.expectFirstRowNumber(lastRow + 1);
      expect(await list.table.rows.first().textContent()).not.toBe(firstRow);
    });
    await step('Click Previous', () => list.clickPager(list.previous));
    await step('Check page 1 is shown again (starts at row 1)', () => list.expectFirstRowNumber(1));
  }
  expectNoCmsErrors(cms);
});
