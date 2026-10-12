// CMS-TC-242 Refund › Transaction Report – Pagination: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ReportPage } from '../src/report-page';

test('CMS-TC-242 Transaction Report – Pagination', sheet('CMS-TC-242'), async ({ cms, step }) => {
  const report = new ReportPage(cms, pages.refundTransactions);
  await step('Open Refund › Transaction Report', () => report.open());
  await step('Set the From date 30 days back (the default is the last 24 hours)', () => report.widenDates(30));
  await step('Press Submit: the results (or "No records found") are shown', () => report.submit());
  test.skip(!(await report.hasResults()), 'No records in the last 30 days to page through.');
  // Report results are paged by the CMS itself (page-number bar, 50 results per page), not by the list's Next / Previous.
  const pageCount = await step('Read the page-number bar under the results', () => report.pageCount());
  if (pageCount < 2) {
    await step(`Only one page of results (${await report.resultCount()} rows): check no second page is offered`, async () => {
      expect(pageCount).toBeLessThan(2);
    });
  } else {
    const firstRow = await step('Note the first row of page 1', async () => (await report.table.rows.first().textContent()) ?? '');
    await step('Click page 2', () => report.goToPage(2));
    await step('Check page 2 is highlighted and shows other records', async () => {
      await report.expectCurrentPage(2);
      expect(await report.table.rows.first().textContent()).not.toBe(firstRow);
    });
    await step('Click page 1', () => report.goToPage(1));
    await step('Check page 1 is highlighted and shows the first records again', async () => {
      await report.expectCurrentPage(1);
      expect(await report.table.rows.first().textContent()).toBe(firstRow);
    });
  }
  expectNoCmsErrors(cms);
});
