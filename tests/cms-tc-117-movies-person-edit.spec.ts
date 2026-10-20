// CMS-TC-117 Movies/Cinemas › Movies Person – Edit: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-117 Movies Person – Edit', sheet('CMS-TC-117'), async ({ cms, step }) => {
  // Movies Person has no Add: an existing record is edited and its original value is always put back.
  const records = new RecordPage(cms, pages.moviesPerson);
  const url = await step('Open Movies/Cinemas › Movies Person and take the first record\'s Edit link', () => records.firstEditUrl());
  const original = await step('Open its Edit form and note the current Url To Details', () => records.readField(url, 'urlToDetails'));
  await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());
  const changed = `${original} AUTOTEST`;
  await test.info().attach('record edited', { body: `${url}\nurlToDetails = "${original}" (put back afterwards)`, contentType: 'text/plain' });
  try {
    await step(`Change Url To Details to "${changed}"`, async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
      await records.setFields({ urlToDetails: changed });
    });
    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit('urlToDetails'));
    await step('Reopen the record', async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
    });
    await step(`Check Url To Details kept "${changed}"`, async () => {
      await expect(records.field('urlToDetails')).toHaveValue(changed);
    });
  } finally {
    await step(`Put Url To Details back to "${original}" and save`, () => records.saveField(url, 'urlToDetails', original));
  }
  expectNoCmsErrors(cms);
});
