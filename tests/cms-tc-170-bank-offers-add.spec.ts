// CMS-TC-170 Offers and Banners › Bank Offers – Add: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-170 Bank Offers – Add', sheet('CMS-TC-170'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.bankOffers);
  const record = records.newRecord('CMS-TC-170');
  // The CMS cannot delete Bank Offers records, so the form is checked up to Submit and not saved (nothing is left behind).
  await step('Open Offers and Banners › Bank Offers', () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  const before = await step('Press Submit with the required fields empty', () => records.pressSubmit());
  await step('Check the form is refused and the required fields are flagged', () => records.expectRefused(before, 'Required fields empty'));
  await step(`Fill the form with valid data for "${record.name}"`, () => records.fill(records.values(record)));
  await step('Check the form accepts the data (all required fields valid)', () => records.expectFormValid());
  expectNoCmsErrors(cms);
});
