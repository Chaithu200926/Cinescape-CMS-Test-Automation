// CMS-TC-240 Refund › Transaction Report – Sort: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ReportPage } from '../src/report-page';

test('CMS-TC-240 Transaction Report – Sort', sheet('CMS-TC-240'), async ({ cms, step }) => {
  const report = new ReportPage(cms, pages.refundTransactions);
  await step('Open Refund › Transaction Report', () => report.open());
  await step('Set the From date 30 days back (the default is the last 24 hours)', () => report.widenDates(30));
  await step('Press Submit: the results (or "No records found") are shown', () => report.submit());
  test.skip((await report.resultCount()) < 2, 'Fewer than 2 records in the last 30 days: nothing to sort.');
  const column = await step('Find the first sortable column', () => report.sortableColumn());
  await step(`Click the "${column.name}" header to sort A→Z`, () => report.sortBy(column, 'asc'));
  await step(`Check "${column.name}" is in A→Z order`, () => report.expectColumnOrder(column, 'asc'));
  await step(`Click the "${column.name}" header again to sort Z→A`, () => report.sortBy(column, 'desc'));
  await step(`Check "${column.name}" is in Z→A order`, () => report.expectColumnOrder(column, 'desc'));
  expectNoCmsErrors(cms);
});
