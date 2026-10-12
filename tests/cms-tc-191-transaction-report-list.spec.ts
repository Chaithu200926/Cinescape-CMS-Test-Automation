// CMS-TC-191 Reports › Transaction Report – List: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ReportPage } from '../src/report-page';

test('CMS-TC-191 Transaction Report – List', sheet('CMS-TC-191'), async ({ cms, step }) => {
  const report = new ReportPage(cms, pages.transactionReport);
  await step('Open Reports › Transaction Report', () => report.open());
  await step('Check the filter form is shown', async () => {
    await expect(report.filters()).toBeVisible();
  });
  await step('Set the From date 30 days back (the default is the last 24 hours)', () => report.widenDates(30));
  await step('Press Submit: the results (or "No records found") are shown', () => report.submit());
  if (await report.hasResults()) {
    await step('Check the results table lists records', async () => {
      expect(await report.resultCount()).toBeGreaterThan(0);
      await test.info().attach('results', { body: `${await report.resultCount()} rows on page 1, ${await report.pageCount() || 1} page(s)`, contentType: 'text/plain' });
    });
    await step('Check the fields of the results are filled in (manual checklist)', () => report.expectFieldsFilled());
  } else {
    await step('No records in the last 30 days: check "No records found" is shown', async () => {
      await expect(report.noRecords()).toBeVisible();
    });
  }
  expectNoCmsErrors(cms);
});
