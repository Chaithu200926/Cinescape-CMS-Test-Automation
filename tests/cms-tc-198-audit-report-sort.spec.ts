// CMS-TC-198 Reports › Audit Report – Sort: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes / Sort icon not showing
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ReportPage } from '../src/report-page';

test('CMS-TC-198 Audit Report – Sort', sheet('CMS-TC-198'), async ({ cms, step }) => {
  const report = new ReportPage(cms, pages.auditReport);
  await step('Open Reports › Audit Report', () => report.open());
  await step('Set the From date 30 days back (the default is the last 24 hours)', () => report.widenDates(30));
  await step('Press Submit: the results (or "No records found") are shown', () => report.submit());
  test.skip((await report.resultCount()) < 2, 'Fewer than 2 records in the last 30 days: nothing to sort.');
  const column = await step('Find the first sortable column', () => report.sortableColumn());
  await step('Check every sortable column shows a sort icon (manual checklist: "Sort icon not showing")', () => report.expectSortIcons());
  await step(`Click the "${column.name}" header to sort A→Z`, () => report.sortBy(column, 'asc'));
  await step(`Check "${column.name}" is in A→Z order`, () => report.expectColumnOrder(column, 'asc'));
  await step(`Click the "${column.name}" header again to sort Z→A`, () => report.sortBy(column, 'desc'));
  await step(`Check "${column.name}" is in Z→A order`, () => report.expectColumnOrder(column, 'desc'));
  expectNoCmsErrors(cms);
});
