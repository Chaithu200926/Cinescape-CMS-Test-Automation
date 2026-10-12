// CMS-TC-185 Reports › Customer Details – Search with email: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / Searching with Email address or OTP, few fields are coming as empty:
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ReportPage } from '../src/report-page';
import { config } from '../src/config';

test('CMS-TC-185 Customer Details – Search with email', sheet('CMS-TC-185'), async ({ cms, step }) => {
  const value = config.customerEmail;
  test.skip(!value, 'Set CMS_CUSTOMER_EMAIL in .env to run this case.');
  const report = new ReportPage(cms, pages.customerDetails);
  await step('Open Reports › Customer Details', () => report.open());
  await step(`Enter the customer's email "${value}"`, () => report.filters().locator('[name="email"]').fill(value));
  await step('Press Submit: the results table is shown', () => report.submit());
  await step('Check the customer is found', async () => {
    await expect(report.table.rows.first()).toContainText(value);
  });
  await step('Check the customer\'s details are filled in (manual checklist: "few fields are coming as empty")', () => report.expectFieldsFilled());
  expectNoCmsErrors(cms);
});
