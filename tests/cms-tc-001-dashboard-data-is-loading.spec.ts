// CMS-TC-001 Dashboard – Data is loading: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes / Retest: Yes / Date is not accurate. Some schedulers date is old dates
import { test, expect, sheet, expectNoCmsErrors, openPage } from '../src/fixtures';
import { pages } from '../src/cms-pages';

test('CMS-TC-001 Dashboard – Data is loading', sheet('CMS-TC-001'), async ({ cms, step }) => {
  await step('Open the Dashboard', () => openPage(cms, pages.dashboard.path));
  await step('Check no error page is shown', async () => {
    await expect(cms.locator('body')).not.toContainText(/whitelabel error|exception|404|not found/i);
  });
  await step('Check no loading indicator is left on the page', async () => {
    await expect(cms.locator('.loading:visible, .spinner:visible')).toHaveCount(0, { timeout: 30_000 });
  });
  const jobs = await step('Check the scheduler table lists the jobs', async () => {
    const rows = cms.locator('table tbody tr').filter({ has: cms.locator('td') });
    expect(await rows.count(), 'scheduler jobs listed').toBeGreaterThan(0);
    return rows.evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.textContent ?? '').trim())));
  });
  await step('Check every job ran successfully in the last 24 hours (manual checklist: "some schedulers date is old")', async () => {
    // "Last Success Run" is shown as dd/mm/yyyy, hh:mm:ss AM (Kuwait time, same as the QA PC).
    const parse = (s: string) => {
      const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
      if (!m) return NaN;
      const h = (Number(m[4]) % 12) + (/pm/i.test(m[7]) ? 12 : 0);
      return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h, Number(m[5]), Number(m[6])).getTime();
    };
    for (const [job, , , , lastSuccess] of jobs) {
      expect.soft((Date.now() - parse(lastSuccess)) / 3_600_000, `${job}: last success ${lastSuccess} (hours ago)`).toBeLessThan(24);
    }
  });
  expectNoCmsErrors(cms);
});
