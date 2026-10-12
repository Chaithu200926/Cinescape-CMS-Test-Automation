// CMS-TC-142 Movies/Cinemas › Food – Sort grid: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-142 Food – Sort grid', sheet('CMS-TC-142'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.food);
  await step('Open Movies/Cinemas › Food', () => list.open());
  const column = await step('Find the first sortable column', () => list.sortableColumn());
  await step(`Click the "${column.name}" header to sort A→Z`, () => list.sortBy(column, 'asc'));
  await step(`Check "${column.name}" is in A→Z order`, () => list.expectColumnOrder(column, 'asc'));
  await step(`Click the "${column.name}" header again to sort Z→A`, () => list.sortBy(column, 'desc'));
  await step(`Check "${column.name}" is in Z→A order`, () => list.expectColumnOrder(column, 'desc'));
  expectNoCmsErrors(cms);
});
