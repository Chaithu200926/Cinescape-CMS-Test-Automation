// CMS-TC-130 Movies/Cinemas › Experiences – Add: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-130 Experiences – Add', sheet('CMS-TC-130'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.experiences);
  const record = records.newRecord('CMS-TC-130');
  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());
  await step('Open Movies/Cinemas › Experiences', () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  await step('Check every multi-line box shows at least 8 lines of text', () => records.expectTextBoxesReadable(8));
  const before = await step('Press Submit with the required fields empty', () => records.pressSubmit());
  await step('Check the form is refused and the required fields are flagged', () => records.expectRefused(before, 'Required fields empty'));
  try {
    await step(`Fill the form with valid data for "${record.name}"`, () => records.fill(records.values(record)));
    await step('Press Submit: the CMS saves the record and leaves the form', () => records.submit());
    await step('Search the new record in the list: it is listed once', () => records.expectInList(record.token));
    await step('Check its uploaded images show in the list and load (manual checklist)', () => records.expectRowImagesShown(record));
  } finally {
    await step('Clean up: delete the test record', () => records.remove(record.token));
    await step('Check the test record is no longer listed', () => records.expectNotInList(record.token));
  }
  expectNoCmsErrors(cms);
});
