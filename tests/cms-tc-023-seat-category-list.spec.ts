// CMS-TC-023 Configurations › Seat Category – List: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes / Retest: Yes / English Font size is big
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-023 Seat Category – List', sheet('CMS-TC-023'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.seatCategory);
  await step('Open Configurations › Seat Category', () => list.open());
  const [from, to] = await step('Read "Showing x to y of z entries"', () => list.table.range());
  await step('Check no loading indicator is left on the page', async () => {
    await expect(cms.locator('.dataTables_processing:visible')).toHaveCount(0);
  });
  await step('Check the list has records', async () => {
    expect(await list.table.total()).toBeGreaterThan(0);
  });
  await step(`Check ${to - from + 1} rows are shown, as "Showing ${from} to ${to}" says`, () => list.expectRowCount(to - from + 1));
  await step('Check every column uses the same font size (manual checklist: "English Font size is big")', async () => {
    const sizes = await list.columnFontSizes();
    await test.info().attach('font sizes (px)', { body: JSON.stringify(sizes, null, 1), contentType: 'application/json' });
    expect.soft(new Set(Object.values(sizes)).size, `one font size in all columns: ${JSON.stringify(sizes)}`).toBe(1);
  });
  expectNoCmsErrors(cms);
});
