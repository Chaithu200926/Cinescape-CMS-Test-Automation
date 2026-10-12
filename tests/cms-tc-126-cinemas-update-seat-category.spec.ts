// CMS-TC-126 Movies/Cinemas › Cinemas – Update Seat category: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-126 Cinemas – Update Seat category', sheet('CMS-TC-126'), async ({ cms, step }) => {
  // A real seat-category update for the first cinema on UAT (approved 11 Oct 2026).
  const list = new ListPage(cms, pages.cinemas);
  await step('Open Movies/Cinemas › Cinemas', () => list.open());
  const cinema = await step('Note the first cinema', async () => (await list.table.rows.first().locator('td').nth(2).textContent())?.trim());
  await step(`Click Update SeatCat for ${cinema}`, async () => {
    await list.click(list.rowAction(list.table.rows.first(), /update seatcat/i));
    await cms.waitForLoadState('networkidle');
  });
  await step('Check the CMS confirms the update ("Updated")', async () => {
    await expect(cms.locator('.alert, .msg, #msg, body').filter({ hasText: /updated/i }).first()).toBeVisible();
  });
  expectNoCmsErrors(cms);
});
