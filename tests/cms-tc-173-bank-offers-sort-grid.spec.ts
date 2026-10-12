// CMS-TC-173 Offers and Banners › Bank Offers – Sort grid: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ListPage } from '../src/list-page';

test('CMS-TC-173 Bank Offers – Sort grid', sheet('CMS-TC-173'), async ({ cms, step }) => {
  const list = new ListPage(cms, pages.bankOffers);
  await step('Open Offers and Banners › Bank Offers', () => list.open());
  const column = await step('Find the first sortable column', () => list.sortableColumn());
  await step(`Click the "${column.name}" header to sort A→Z`, () => list.sortBy(column, 'asc'));
  await step(`Check "${column.name}" is in A→Z order`, () => list.expectColumnOrder(column, 'asc'));
  await step(`Click the "${column.name}" header again to sort Z→A`, () => list.sortBy(column, 'desc'));
  await step(`Check "${column.name}" is in Z→A order`, () => list.expectColumnOrder(column, 'desc'));
  expectNoCmsErrors(cms);
});
