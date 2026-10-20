// CMS-TC-092 Configurations › Privacy Policy – Add: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes / Retest: Yes / The dropdown More type should be defaulted to Privacy Policy, other 2 options not needed here
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-092 Privacy Policy – Add', sheet('CMS-TC-092'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.privacyPolicy);
  const record = records.newRecord('CMS-TC-092');
  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());
  await step('Open Configurations › Privacy Policy', () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  await step('Check every multi-line box shows at least 8 lines of text', () => records.expectTextBoxesReadable(8));
  await step('Check More type is preselected as PRIVACY (manual checklist)', async () => {
    await expect.soft(records.field('moreType')).toHaveValue('PRIVACY');
  });
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
