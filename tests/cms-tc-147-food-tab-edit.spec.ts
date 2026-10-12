// CMS-TC-147 Movies/Cinemas › Food Tab – Edit: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / Uploaded image is not showing after edit and if image is not uploaded for editing old image also not showing in list after update
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-147 Food Tab – Edit', sheet('CMS-TC-147'), async ({ cms, step }) => {
  // Food Tab has no Add / Delete: an existing record is edited and its original value is always put back.
  const records = new RecordPage(cms, pages.foodTab);
  const url = await step('Open Movies/Cinemas › Food Tab and take the first record\'s Edit link', () => records.firstEditUrl());
  const original = await step('Open its Edit form and note the current Name Alt', () => records.readField(url, 'nameAlt'));
  const changed = `${original} AUTOTEST`;
  await test.info().attach('record edited', { body: `${url}\nnameAlt = "${original}" (put back afterwards)`, contentType: 'text/plain' });
  const imagesBefore = await step('Note the tab images shown in the list', () => records.rowImagesLoaded(url));
  try {
    await step(`Change Name Alt to "${changed}"`, async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
      await records.setFields({ nameAlt: changed });
    });
    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit('nameAlt'));
    await step('Reopen the record', async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
    });
    await step(`Check Name Alt kept "${changed}"`, async () => {
      await expect(records.field('nameAlt')).toHaveValue(changed);
    });
    await step('Check the tab image still shows in the list (manual checklist: "old image also not showing")', async () => {
      expect.soft(await records.rowImagesLoaded(url)).toBe(imagesBefore);
    });
  } finally {
    await step(`Put Name Alt back to "${original}" and save`, () => records.saveField(url, 'nameAlt', original));
  }
  expectNoCmsErrors(cms);
});
