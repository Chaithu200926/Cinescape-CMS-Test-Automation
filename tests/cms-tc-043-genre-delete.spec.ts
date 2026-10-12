// CMS-TC-043 Configurations › Genre – Delete: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-043 Genre – Delete', sheet('CMS-TC-043'), async ({ cms, step }) => {
  // The Genre list has no Delete button and its page script's delete URL answers 404 (11 Oct 2026),
  // so the test does not create a record (it could not be removed); it checks Delete is offered on the list.
  const list = new ListPage(cms, pages.genre);
  await step('Open Configurations › Genre', () => list.open());
  await step('Check Delete is offered on the first record', async () => {
    await expect(list.rowAction(list.table.rows.first(), /^\s*delete\s*$/i), 'Delete button in the row').toBeAttached({ timeout: 5_000 });
  });
  expectNoCmsErrors(cms);
});
