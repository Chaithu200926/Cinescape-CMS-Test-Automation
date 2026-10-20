// CMS-TC-074 Configurations › Ratings – Add: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / Retest: Yes / Description text editor icons are not displaying. Have to hover mouse to understand what it is
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-074 Ratings – Add', sheet('CMS-TC-074'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.ratings);
  const record = records.newRecord('CMS-TC-074');
  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());
  await step('Open Configurations › Ratings', () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  await step('Check every multi-line box is big enough to read (8 lines; 3 for short fields)', () => records.expectTextBoxesReadable());
  await step('Check More type is preselected as RATING (manual checklist)', async () => {
    await expect.soft(records.field('moreType')).toHaveValue('RATING');
  });
  await step('Check the description editor shows its toolbar icons (manual checklist: "icons are not displaying")', () => records.expectEditorIconsShown());
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
