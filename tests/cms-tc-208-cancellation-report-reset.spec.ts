// CMS-TC-208 Reports › Cancellation Report – Reset: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: NA / Suggestion added to add a reset filter button
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ReportPage } from '../src/report-page';

test('CMS-TC-208 Cancellation Report – Reset', sheet('CMS-TC-208'), async ({ cms, step }) => {
  const report = new ReportPage(cms, pages.cancellationReport);
  await step('Open Reports › Cancellation Report', () => report.open());
  // The manual checklist marks Reset "NA" on reports without a Reset button (suggestion given to add one).
  test.skip(!(await report.resetButton().isVisible()), 'This report has no Reset button (manual checklist: NA, suggestion given).');
  await step('Type "RESET-CHECK" in a filter field', () => report.textFilter().fill('RESET-CHECK'));
  await step('Press Reset', () => report.resetButton().click());
  await step('Check the filter field is empty again', async () => {
    await expect(report.textFilter()).toHaveValue('');
  });
  expectNoCmsErrors(cms);
});
