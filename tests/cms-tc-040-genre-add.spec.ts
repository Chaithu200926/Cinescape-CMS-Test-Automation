// CMS-TC-040 Configurations › Genre – Add: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-040 Genre – Add', sheet('CMS-TC-040'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.genre);
  const record = records.newRecord('CMS-TC-040');
  // The CMS cannot delete Genre records, so the form is checked up to Submit and not saved (nothing is left behind).
  await step('Open Configurations › Genre', () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());
  const before = await step('Press Submit with the required fields empty', () => records.pressSubmit());
  await step('Check the form is refused and the required fields are flagged', () => records.expectRefused(before, 'Required fields empty'));
  await step(`Fill the form with valid data for "${record.name}"`, () => records.fill(records.values(record)));
  await step('Check the form accepts the data (all required fields valid)', () => records.expectFormValid());
  expectNoCmsErrors(cms);
});
