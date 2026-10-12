// CMS-TC-041 Configurations › Genre – Edit: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / Retest: Yes / No data populating in edit for new entries. Empty fields. Old entries data is coming
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-041 Genre – Edit', sheet('CMS-TC-041'), async ({ cms, step }) => {
  // Genre has no Add / Delete: an existing record is edited and its original value is always put back.
  const records = new RecordPage(cms, pages.genre);
  const url = await step('Open Configurations › Genre and take the first record\'s Edit link', () => records.firstEditUrl());
  const original = await step('Open its Edit form and note the current Description', () => records.readField(url, 'description'));
  const changed = `${original} AUTOTEST`;
  await test.info().attach('record edited', { body: `${url}\ndescription = "${original}" (put back afterwards)`, contentType: 'text/plain' });
  try {
    await step(`Change Description to "${changed}"`, async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
      await records.setFields({ description: changed });
    });
    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit('description'));
    await step('Reopen the record', async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
    });
    await step(`Check Description kept "${changed}"`, async () => {
      await expect(records.field('description')).toHaveValue(changed);
    });
  } finally {
    await step(`Put Description back to "${original}" and save`, () => records.saveField(url, 'description', original));
  }
  expectNoCmsErrors(cms);
});
