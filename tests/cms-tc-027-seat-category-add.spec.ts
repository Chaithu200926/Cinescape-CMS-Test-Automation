// CMS-TC-027 Configurations › Seat Category – Add: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-027 Seat Category – Add', sheet('CMS-TC-027'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.seatCategory);
  const record = records.newRecord('CMS-TC-027');
  // The CMS cannot delete Seat Category records, so the form is checked up to Submit and not saved (nothing is left behind).
  await step('Open Configurations › Seat Category', () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  await step('Check every multi-line box is big enough to read (8 lines; 3 for short fields)', () => records.expectTextBoxesReadable());
  const before = await step('Press Submit with the required fields empty', () => records.pressSubmit());
  await step('Check the form is refused and the required fields are flagged', () => records.expectRefused(before, 'Required fields empty'));
  await step(`Fill the form with valid data for "${record.name}"`, () => records.fill(records.values(record)));
  await step('Check the form accepts the data (all required fields valid)', () => records.expectFormValid());
  expectNoCmsErrors(cms);
});
