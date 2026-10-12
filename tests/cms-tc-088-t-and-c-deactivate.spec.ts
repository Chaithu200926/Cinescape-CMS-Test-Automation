// CMS-TC-088 Configurations › T & C – Deactivate: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / Retest: Yes / Error 404 is coming. On refresh the status is changing to deactivated
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-088 T & C – Deactivate', sheet('CMS-TC-088'), async ({ cms, step }) => {
  const records = new RecordPage(cms, pages.termsAndConditions);
  const record = records.newRecord('CMS-TC-088');
  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());
  try {
    // Created inactive, so it never shows in the apps; activated for a moment so it can be deactivated.
    await step(`Create the test record "${record.name}" with the Add form`, () => records.create(record));
    await step('Check the test record is in the list', () => records.expectInList(record.token));
    await step('Check it is inactive: Activate is offered', () => records.expectActive(record.token, false));
    await step('Click Activate', () => records.setActive(record.token, true));
    await step('Check it is active: Deactivate is offered', () => records.expectActive(record.token, true));
    await step('Click Deactivate', () => records.setActive(record.token, false));
    await step('Check it is inactive again: Activate is offered', () => records.expectActive(record.token, false));
  } finally {
    await step('Clean up: delete the test record', () => records.remove(record.token));
    await step('Check the test record is no longer listed', () => records.expectNotInList(record.token));
  }
  expectNoCmsErrors(cms);
});
