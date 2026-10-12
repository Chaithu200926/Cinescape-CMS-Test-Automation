// CMS-TC-060 Configurations › Payment Modes – View image: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-060 Payment Modes – View image', sheet('CMS-TC-060'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.paymentModes);
  await step('Open Configurations › Payment Modes', () => list.open());
  const src = await step('Find the first record\'s image (View Image link or picture)', async () => {
    const link = list.table.rows.locator('a').filter({ hasText: /view image/i }).first();
    const img = list.table.rows.locator('img').first();
    const url = (await link.count()) ? await link.getAttribute('href') : await img.getAttribute('src');
    expect(url, 'an image in the list').toBeTruthy();
    return url!;
  });
  await step('Open the image: the file loads and is an image', async () => {
    const res = await cms.request.get(new URL(src, cms.url()).href);
    expect(res.ok(), `image loads: ${src}`).toBe(true);
    expect(res.headers()['content-type'], 'it is an image').toMatch(/^image\//);
  });
  expectNoCmsErrors(cms);
});
