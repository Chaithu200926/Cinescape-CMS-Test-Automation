// CMS-TC-008 User Management › Users – Add user: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes / Better to select role also while adding a user
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-008 Users – Add user', sheet('CMS-TC-008'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.users);
  const record = records.newRecord('CMS-TC-008');
  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());
  await step('Open User Management › Users', () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  const before = await step('Press Submit with the required fields empty', () => records.pressSubmit());
  await step('Check the form is refused and the required fields are flagged', () => records.expectRefused(before, 'Required fields empty'));
  try {
    const badEmail = `autotest-${record.token.toLowerCase()}-no-at-sign`;
    await step(`Fill the form with an e-mail without @ ("${badEmail}")`, () => records.fill({ ...records.values(record), email: badEmail }));
    await step('Press Submit', () => records.pressSubmit());
    await step('Check no user with that e-mail was saved', () => records.expectNotInList(badEmail));
    await step('Open the Add form again', () => records.openAddForm());
    await step(`Fill the form with valid data for "${record.name}"`, () => records.fill(records.values(record)));
    await step('Press Submit: the CMS saves the record and leaves the form', () => records.submit());
    await step('Search the new record in the list: it is listed once', () => records.expectInList(record.token));
  } finally {
    await step('Clean up: delete the test record', () => records.remove(record.token));
    await step('Check the test record is no longer listed', () => records.expectNotInList(record.token));
  }
  expectNoCmsErrors(cms);
});
