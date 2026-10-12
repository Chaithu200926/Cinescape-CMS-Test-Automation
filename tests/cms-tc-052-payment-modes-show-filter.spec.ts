// CMS-TC-052 Configurations › Payment Modes – Show filter: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-052 Payment Modes – Show filter', sheet('CMS-TC-052'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.paymentModes);
  await step('Open Configurations › Payment Modes', () => list.open());
  const total = await step('Note the number of entries ("of z entries")', () => list.table.total());
  const sizes = await step('Read the "Show N entries" options', () => list.entrySizes());
  for (const size of sizes) {
    await step(`Choose "Show ${size} entries"`, () => list.showEntries(size));
    await step(`Check ${Math.min(size, total)} rows are shown`, () => list.expectRowCount(Math.min(size, total)));
  }
  expectNoCmsErrors(cms);
});
