// CMS-TC-102 Configurations › Countries – Edit: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-102 Countries – Edit', sheet('CMS-TC-102'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.countries);
  const record = records.newRecord('CMS-TC-102');
  const { field } = records.form.edit;
  const newValue = records.form.edit.value(record);
  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());
  try {
    await step(`Create the test record "${record.name}" with the Add form`, () => records.create(record));
    await step('Check the test record is in the list', () => records.expectInList(record.token));
    const editUrl = await step('Click Edit on the test record', () => records.openEdit(record.token));
    await step('Check the Edit form shows the saved data (manual checklist: "No data populating in edit")', () => records.expectEditShows(records.values(record)));
    await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());
    await step(`Clear the required field "${field}"`, () => records.setFields({ [field]: '' }));
    const before = await step('Press Submit', () => records.pressSubmit());
    await step('Check the form is refused', () => records.expectRefused(before, `"${field}" empty`));
    await step('Reload the Edit form', async () => {
      await cms.goto(editUrl, { waitUntil: 'networkidle' });
    });
    await step(`Change "${field}" to "${newValue}"`, () => records.setFields({ [field]: newValue }));
    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit());
    await step('Check the list shows the new value', async () => {
      await expect(await records.expectInList(record.token)).toContainText(newValue);
    });
    await step('Reopen the record', async () => {
      await cms.goto(editUrl, { waitUntil: 'networkidle' });
    });
    await step(`Check "${field}" kept the new value`, async () => {
      await expect(records.field(field)).toHaveValue(newValue);
    });
  } finally {
    await step('Clean up: delete the test record', () => records.remove(record.token));
    await step('Check the test record is no longer listed', () => records.expectNotInList(record.token));
  }
  expectNoCmsErrors(cms);
});
