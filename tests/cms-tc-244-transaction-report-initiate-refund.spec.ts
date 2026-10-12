// CMS-TC-244 Refund › Transaction Report – Initiate refund: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Need to test again - error showing
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ReportPage } from '../src/report-page';

test('CMS-TC-244 Transaction Report – Initiate refund', sheet('CMS-TC-244'), async ({ cms, step }) => {
  // A real refund through the payment gateway on UAT (approved 11 Oct 2026); it cannot be undone.
  const report = new ReportPage(cms, pages.refundTransactions);
  await step('Open Refund › Transaction Report', () => report.open());
  await step('Press Submit with the default filters: the break transactions are listed', () => report.submit());
  const statusColumn = await step('Find the "Refund Status" column', async () => {
    const head = (await report.table.table.locator('thead th').allTextContents()).map((t) => t.trim());
    expect(head).toContain('Refund Status');
    return head.indexOf('Refund Status') + 1;
  });
  const index = await step('Find a transaction that has no refund yet', async () => {
    const statuses = await report.table.rows.locator(`td:nth-child(${statusColumn})`).allTextContents();
    return statuses.findIndex((s) => /^\s*(null)?\s*$/.test(s));
  });
  test.skip(index < 0, 'No break transaction waiting for a refund.');
  const row = report.table.rows.nth(index);
  const id = await row.locator('input[type="checkbox"]').getAttribute('value');
  await test.info().attach('refunded transaction', { body: `${id}: ${(await row.textContent())?.replace(/\s+/g, ' ')}`, contentType: 'text/plain' });
  await step(`Tick transaction ${id}`, () => row.locator('input[type="checkbox"]').check());
  await step('Click Initiate Refund: the comment box opens', async () => {
    await cms.locator('#btn').filter({ hasText: /initiate refund/i }).click();
    await expect(cms.locator('#userCommentmodal')).toBeVisible();
  });
  await step('Enter the comment "AUTOTEST CMS-TC-244"', () => cms.locator('#userCommentmodal').locator('textarea, input[type="text"]').first().fill('AUTOTEST CMS-TC-244'));
  await step('Press Save and wait for the CMS\'s answer', async () => {
    await cms.locator('#userCommentmodal').getByRole('button', { name: /^save$/i }).click();
    await expect.poll(() => cms.dialogs.messages.length, { message: 'the CMS answers the refund', timeout: 120_000 }).toBeGreaterThan(0);
    await cms.waitForLoadState('networkidle').catch(() => {});
  });
  await step('Check the answer is not an error (manual checklist: "error showing")', async () => {
    expect(cms.dialogs.messages.at(-1)).not.toMatch(/error|fail|not refunded|try again/i);
  });
  await step('Press Submit again', () => report.submit());
  await step(`Check transaction ${id} shows a refund status`, async () => {
    const same = report.table.rows.filter({ has: cms.locator(`input[value="${id}"]`) });
    if (await same.count()) await expect(same.locator(`td:nth-child(${statusColumn})`)).not.toHaveText(/^\s*(null)?\s*$/);
  });
  expectNoCmsErrors(cms);
});
