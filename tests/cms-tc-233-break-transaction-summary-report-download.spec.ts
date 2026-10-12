// CMS-TC-233 Reports › Break Transaction Summary Report – Download: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: Yes
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { ReportPage } from '../src/report-page';

test('CMS-TC-233 Break Transaction Summary Report – Download', sheet('CMS-TC-233'), async ({ cms, step }) => {
  const report = new ReportPage(cms, pages.breakTransactionSummary);
  await step('Open Reports › Break Transaction Summary Report', () => report.open());
  await step('Set the From date 30 days back (the default is the last 24 hours)', () => report.widenDates(30));
  const file = await step('Press Download', () => report.download());
  await step(`Check the export "${file.name}" is an .xlsx / .csv / .pdf file and not empty`, async () => report.expectExportFile(file));
  if (/\.(xlsx|csv)$/i.test(file.name)) {
    const table = await step('Open the export and read its columns', () => report.readExport(file));
    await step(`Check the export has a header row and ${table.rows.length} data rows`, async () => {
      expect(table.headers.length, 'columns in the export').toBeGreaterThan(1);
    });
  }
  expectNoCmsErrors(cms);
});
