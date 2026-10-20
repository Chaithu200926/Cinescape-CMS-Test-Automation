// CMS-TC-111 Movies/Cinemas › Movies – Edit: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-111 Movies – Edit', sheet('CMS-TC-111'), async ({ cms, step }) => {
  // Movies has no Add: an existing record is edited and its original value is always put back.
  const records = new RecordPage(cms, pages.movies);
  const url = await step('Open Movies/Cinemas › Movies and take the first record\'s Edit link', () => records.firstEditUrl());
  const original = await step('Open its Edit form and note the current Priority', () => records.readField(url, 'priority'));
  await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());
  const changed = original === '98' ? '97' : '98';
  await test.info().attach('record edited', { body: `${url}\npriority = "${original}" (put back afterwards)`, contentType: 'text/plain' });
  try {
    await step(`Change Priority to "${changed}"`, async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
      await records.setFields({ priority: changed });
    });
    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit('priority'));
    await step('Reopen the record', async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
    });
    await step(`Check Priority kept "${changed}"`, async () => {
      await expect(records.field('priority')).toHaveValue(changed);
    });
  } finally {
    await step(`Put Priority back to "${original}" and save`, () => records.saveField(url, 'priority', original));
  }
  expectNoCmsErrors(cms);
});
