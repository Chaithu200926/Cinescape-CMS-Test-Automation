// CMS-TC-177 Offers and Banners › Banners – Add: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-177 Banners – Add', sheet('CMS-TC-177'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.banners);
  const record = records.newRecord('CMS-TC-177');
  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());
  await step('Open Offers and Banners › Banners', () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  await step('Check every multi-line box is big enough to read (8 lines; 3 for short fields)', () => records.expectTextBoxesReadable());
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
