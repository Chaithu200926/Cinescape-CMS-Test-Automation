// CMS-TC-007 User Management › Users – Delete: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-007 Users – Delete', sheet('CMS-TC-007'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.users);
  const record = records.newRecord('CMS-TC-007');
  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());
  try {
    await step(`Create the test record "${record.name}" with the Add form`, () => records.create(record));
    await step('Check the test record is in the list', () => records.expectInList(record.token));
    const deleteButton = async () => records.rowAction(await records.expectInList(record.token), /^\s*delete\s*$/i);
    await step('Check Delete is offered on the test record', async () => {
      await expect(await deleteButton(), 'Delete button in the row').toBeAttached({ timeout: 5_000 });
    });
    await step('Click Delete and press Cancel on the confirmation', () => records.delete(record.token, 'cancel'));
    await step('Check the confirmation asked "Are you sure you want to delete"', async () => records.expectLastDialog(/^confirm: .*delete/i));
    await step('Check the test record is still listed', () => records.expectInList(record.token));
    await step('Click Delete and press OK on the confirmation', () => records.delete(record.token, 'confirm'));
    await step('Check the test record is no longer listed', () => records.expectNotInList(record.token));
  } finally {
    await step('Clean up: delete the test record', () => records.remove(record.token));
    await step('Check the test record is no longer listed', () => records.expectNotInList(record.token));
  }
  expectNoCmsErrors(cms);
});
