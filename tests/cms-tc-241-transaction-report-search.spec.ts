// CMS-TC-241 Refund › Transaction Report – Search: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';
import { ReportPage } from '../src/report-page';

test('CMS-TC-241 Transaction Report – Search', sheet('CMS-TC-241'), async ({ cms, step }) => {
  const report = new ReportPage(cms, pages.refundTransactions);
  await step('Open Refund › Transaction Report', () => report.open());
  await step('Set the From date 30 days back (the default is the last 24 hours)', () => report.widenDates(30));
  await step('Press Submit: the results (or "No records found") are shown', () => report.submit());
  test.skip(!(await report.hasResults()), 'No records in the last 30 days to search in.');
  const total = await step('Note the number of entries ("of z entries")', () => report.table.total());
  const value = await step('Take a value from the first row to search for', () => report.valueFromFirstRow());
  await step(`Type "${value}" in the Search box`, () => report.table.searchFor(value));
  await step('Check every row shown contains the value', () => report.expectRowsContain(value));
  await step('Check the entry count is not higher than before', async () => {
    expect(await report.table.total()).toBeLessThanOrEqual(total);
  });
  await step('Type text that no record has in the Search box', () => report.table.searchFor(ListPage.noSuchRecord));
  await step('Check "No matching records found" is shown', () => report.expectNoMatchShown());
  await step('Clear the Search box', () => report.table.searchFor(''));
  await step('Check all entries are shown again', async () => {
    expect(await report.table.total()).toBe(total);
  });
  expectNoCmsErrors(cms);
});
