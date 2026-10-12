// CMS-TC-218 Reports › Refund report – Download: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes / Refund IP address not showing - not logged
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ReportPage } from '../src/report-page';

test('CMS-TC-218 Refund report – Download', sheet('CMS-TC-218'), async ({ cms, step }) => {
  const report = new ReportPage(cms, pages.refundReport);
  await step('Open Reports › Refund report', () => report.open());
  await step('Set the From date 30 days back (the default is the last 24 hours)', () => report.widenDates(30));
  const file = await step('Press Download', () => report.download());
  await step(`Check the export "${file.name}" is an .xlsx / .csv / .pdf file and not empty`, async () => report.expectExportFile(file));
  if (/\.(xlsx|csv)$/i.test(file.name)) {
    const table = await step('Open the export and read its columns', () => report.readExport(file));
    await step(`Check the export has a header row and ${table.rows.length} data rows`, async () => {
      expect(table.headers.length, 'columns in the export').toBeGreaterThan(1);
    });
    await step('Check the export has a "IP Address" column filled in every row (manual checklist)', async () => report.expectExportColumnFilled(table, /ip\s*address/i, 'IP Address'));
  }
  expectNoCmsErrors(cms);
});
