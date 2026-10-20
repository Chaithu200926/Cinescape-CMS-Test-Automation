// CMS-TC-123 Movies/Cinemas › Cinemas – Edit: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / UI issues in alignment - 303
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-123 Cinemas – Edit', sheet('CMS-TC-123'), async ({ cms, step }) => {
  // Cinemas has no Add: an existing record is edited and its original value is always put back.
  const records = new RecordPage(cms, pages.cinemas);
  const url = await step('Open Movies/Cinemas › Cinemas and take the first record\'s Edit link', () => records.firstEditUrl());
  const original = await step('Open its Edit form and note the current Working Hours Alt', () => records.readField(url, 'workingHoursAlt'));
  await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());
  const changed = `${original} AUTOTEST`;
  await test.info().attach('record edited', { body: `${url}\nworkingHoursAlt = "${original}" (put back afterwards)`, contentType: 'text/plain' });
  try {
    await step(`Change Working Hours Alt to "${changed}"`, async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
      await records.setFields({ workingHoursAlt: changed });
    });
    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit('workingHoursAlt'));
    await step('Reopen the record', async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
    });
    await step(`Check Working Hours Alt kept "${changed}"`, async () => {
      await expect(records.field('workingHoursAlt')).toHaveValue(changed);
    });
  } finally {
    await step(`Put Working Hours Alt back to "${original}" and save`, () => records.saveField(url, 'workingHoursAlt', original));
  }
  expectNoCmsErrors(cms);
});
