// CMS-TC-171 Offers and Banners › Bank Offers – Edit: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-171 Bank Offers – Edit', sheet('CMS-TC-171'), async ({ cms, step }) => {
  // Bank Offers has no Add / Delete: an existing record is edited and its original value is always put back.
  const records = new RecordPage(cms, pages.bankOffers);
  const url = await step('Open Offers and Banners › Bank Offers and take the first record\'s Edit link', () => records.firstEditUrl());
  const original = await step('Open its Edit form and note the current Header', () => records.readField(url, 'header'));
  const changed = `${original} AUTOTEST`;
  await test.info().attach('record edited', { body: `${url}\nheader = "${original}" (put back afterwards)`, contentType: 'text/plain' });
  try {
    await step(`Change Header to "${changed}"`, async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
      await records.setFields({ header: changed });
    });
    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit('header'));
    await step('Reopen the record', async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
    });
    await step(`Check Header kept "${changed}"`, async () => {
      await expect(records.field('header')).toHaveValue(changed);
    });
  } finally {
    await step(`Put Header back to "${original}" and save`, () => records.saveField(url, 'header', original));
  }
  expectNoCmsErrors(cms);
});
