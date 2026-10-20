// CMS-TC-048 Configurations › Email/SMS Template – Add: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes / Text editor needed here instead of adding HTML template for admin to add easily
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-048 Email/SMS Template – Add', sheet('CMS-TC-048'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.emailSmsTemplate);
  const record = records.newRecord('CMS-TC-048');
  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());
  await step('Open Configurations › Email/SMS Template', () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());
  const before = await step('Press Submit with the required fields empty', () => records.pressSubmit());
  await step('Check the form is refused and the required fields are flagged', () => records.expectRefused(before, 'Required fields empty'));
  try {
    await step(`Fill the form with valid data for "${record.name}"`, () => records.fill(records.values(record)));
    await step('Press Submit: the CMS saves the record and leaves the form', () => records.submit());
    await step('Search the new record in the list: it is listed once', () => records.expectInList(record.token));
  } finally {
    await step('Clean up: delete the test record', () => records.remove(record.token));
    await step('Check the test record is no longer listed', () => records.expectNotInList(record.token));
  }
  expectNoCmsErrors(cms);
});
