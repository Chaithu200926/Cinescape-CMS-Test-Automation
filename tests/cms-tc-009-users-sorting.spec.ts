// CMS-TC-009 User Management › Users – Sorting: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-009 Users – Sorting', sheet('CMS-TC-009'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.users);
  await step('Open User Management › Users', () => list.open());
  const column = await step('Find the first sortable column', () => list.sortableColumn());
  await step(`Click the "${column.name}" header to sort A→Z`, () => list.sortBy(column, 'asc'));
  await step(`Check "${column.name}" is in A→Z order`, () => list.expectColumnOrder(column, 'asc'));
  await step(`Click the "${column.name}" header again to sort Z→A`, () => list.sortBy(column, 'desc'));
  await step(`Check "${column.name}" is in Z→A order`, () => list.expectColumnOrder(column, 'desc'));
  expectNoCmsErrors(cms);
});
