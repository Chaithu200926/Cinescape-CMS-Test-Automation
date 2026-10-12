// CMS-TC-140 Movies/Cinemas › Food – Edit: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / Retest: Yes / 500 Internal server error
import fs from 'node:fs';
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage, saveImage } from '../src/record-page';
import { config } from '../src/config';
import { testImage } from '../src/test-image';

test('CMS-TC-140 Food – Edit', sheet('CMS-TC-140'), async ({ cms, step }) => {
  // The Food edit form only has the item and pop-up images: the current item image is replaced and then
  // uploaded back, and the test checks the original image is shown again.
  const records = new RecordPage(cms, pages.food);
  const image = 'td:nth-child(5) a[href], td:nth-child(5) img[src]'; // "Item Image" column
  await step('Open Movies/Cinemas › Food', () => records.open());
  const { foodId, editUrl } = await step('Pick a food item that has an item image', async () => {
    const row = records.table.rows.filter({ has: cms.locator(image) }).filter({ has: cms.locator('a[href*="edit?id="]:not([href$="id="])') }).first();
    await expect(row, 'a food item with an item image').toBeVisible();
    const href = (await records.rowAction(row, /^\s*edit\s*$/i).getAttribute('href')) ?? '';
    return { foodId: decodeURIComponent(href.match(/id=([^&]+)/)?.[1] ?? ''), editUrl: config.baseUrl + href };
  });
  const imageUrl = async () => (await records.rowsWith(foodId)).first().locator(image).first().evaluate((e) => e.getAttribute('href') || e.getAttribute('src') || '');
  const shownImage = async () => (await cms.request.get(new URL(await imageUrl(), config.baseUrl).href)).body();
  const original = await step(`Save a copy of the current item image of food ${foodId}`, async () => saveImage(cms, await imageUrl(), 'original-item-image'));
  await test.info().attach(`original item image of food ${foodId}`, { path: original });
  try {
    await step('Open the food item\'s Edit form', async () => {
      await cms.goto(editUrl, { waitUntil: 'networkidle' });
    });
    await step('Choose a new item image', () => cms.locator('input[type="file"][name="itemImage"]').setInputFiles(testImage(300, 300)));
    await step('Press Submit: the CMS saves it and leaves the form', () => records.submit('itemImage'));
    await step('Check the list shows the new item image', async () => {
      expect((await shownImage()).equals(fs.readFileSync(original)), 'item image changed').toBe(false);
    });
  } finally {
    await step('Put the original item image back: open Edit, choose it and Submit', async () => {
      await cms.goto(editUrl, { waitUntil: 'networkidle' });
      await cms.locator('input[type="file"][name="itemImage"]').setInputFiles(original);
      await records.submit('itemImage');
    });
    await step('Check the list shows the original item image again', async () => {
      expect((await shownImage()).equals(fs.readFileSync(original)), 'original image shown').toBe(true);
    });
  }
  expectNoCmsErrors(cms);
});
