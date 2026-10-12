// CMS-TC-063 Configurations › FAQ – Search: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-063 FAQ – Search', sheet('CMS-TC-063'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.faq);
  await step('Open Configurations › FAQ', () => list.open());
  const total = await step('Note the number of entries ("of z entries")', () => list.table.total());
  const value = await step('Take a value from the first row to search for', () => list.valueFromFirstRow());
  await step(`Type "${value}" in the Search box`, () => list.table.searchFor(value));
  await step('Check every row shown contains the value', () => list.expectRowsContain(value));
  await step('Check the entry count is not higher than before', async () => {
    expect(await list.table.total()).toBeLessThanOrEqual(total);
  });
  await step('Type text that no record has in the Search box', () => list.table.searchFor(ListPage.noSuchRecord));
  await step('Check "No matching records found" is shown', () => list.expectNoMatchShown());
  await step('Clear the Search box', () => list.table.searchFor(''));
  await step('Check all entries are shown again', async () => {
    expect(await list.table.total()).toBe(total);
  });
  expectNoCmsErrors(cms);
});
