// CMS-TC-150 Movies/Cinemas › Tags – Show filter: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-150 Tags – Show filter', sheet('CMS-TC-150'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.tags);
  await step('Open Movies/Cinemas › Tags', () => list.open());
  const total = await step('Note the number of entries ("of z entries")', () => list.table.total());
  const sizes = await step('Read the "Show N entries" options', () => list.entrySizes());
  for (const size of sizes) {
    await step(`Choose "Show ${size} entries"`, () => list.showEntries(size));
    await step(`Check ${Math.min(size, total)} rows are shown`, () => list.expectRowCount(Math.min(size, total)));
  }
  expectNoCmsErrors(cms);
});
