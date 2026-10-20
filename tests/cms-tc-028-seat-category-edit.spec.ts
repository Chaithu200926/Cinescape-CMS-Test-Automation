// CMS-TC-028 Configurations › Seat Category – Edit: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes / Retest: Yes / But the images selected not showing during edit / Retest: NA / No Option to delete or deactivate a seat category
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-028 Seat Category – Edit', sheet('CMS-TC-028'), async ({ cms, step }) => {
  // Seat Category has no Add / Delete: an existing record is edited and its original value is always put back.
  const records = new RecordPage(cms, pages.seatCategory);
  const url = await step('Open Configurations › Seat Category and take the first record\'s Edit link', () => records.firstEditUrl());
  const original = await step('Open its Edit form and note the current Seat Type Alt', () => records.readField(url, 'subcatalt'));
  await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());
  const changed = `${original} AUTOTEST`;
  await test.info().attach('record edited', { body: `${url}\nsubcatalt = "${original}" (put back afterwards)`, contentType: 'text/plain' });
  try {
    await step(`Change Seat Type Alt to "${changed}"`, async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
      await records.setFields({ subcatalt: changed });
    });
    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit('subcatalt'));
    await step('Reopen the record', async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
    });
    await step(`Check Seat Type Alt kept "${changed}"`, async () => {
      await expect(records.field('subcatalt')).toHaveValue(changed);
    });
  } finally {
    await step(`Put Seat Type Alt back to "${original}" and save`, () => records.saveField(url, 'subcatalt', original));
  }
  expectNoCmsErrors(cms);
});
