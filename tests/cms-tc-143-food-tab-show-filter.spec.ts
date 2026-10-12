// CMS-TC-143 Movies/Cinemas › Food Tab – Show filter: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-143 Food Tab – Show filter', sheet('CMS-TC-143'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.foodTab);
  await step('Open Movies/Cinemas › Food Tab', () => list.open());
  const total = await step('Note the number of entries ("of z entries")', () => list.table.total());
  const sizes = await step('Read the "Show N entries" options', () => list.entrySizes());
  for (const size of sizes) {
    await step(`Choose "Show ${size} entries"`, () => list.showEntries(size));
    await step(`Check ${Math.min(size, total)} rows are shown`, () => list.expectRowCount(Math.min(size, total)));
  }
  expectNoCmsErrors(cms);
});
