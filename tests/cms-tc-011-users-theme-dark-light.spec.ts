// CMS-TC-011 User Management › Users – Theme Dark / Light: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-011 Users – Theme Dark / Light', sheet('CMS-TC-011'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.users);
  await step('Open User Management › Users', () => list.open());
  const start = await step('Note the current theme', () => list.theme());
  const other = start === 'dark' ? 'light' : 'dark';
  await step(`Click the Light / Dark switch: the theme changes to ${other}`, () => list.switchTheme(other));
  await step('Reload the page', async () => {
    await cms.reload({ waitUntil: 'networkidle' });
  });
  await step(`Check the theme is still ${other}`, async () => {
    await expect(cms.locator('html')).toHaveAttribute('data-theme', other);
  });
  await step(`Click the switch again: the theme is back to ${start}`, () => list.switchTheme(start));
  expectNoCmsErrors(cms);
});
