// Cases from the manual checklist (C:\softwares\KNCC testing\cms test.xlsx) that CMS_Test_Cases.xlsx does not have:
// Reports › Kiosk Transaction Report (menu "Kiosk Booking Report"). Numbered after the sheet's last case.
import { cmsCases, type CmsCase } from './test-cases';

const kiosk = (n: number, feature: string, steps: string, expected: string): CmsCase => ({
  id: `CMS-TC-${n}`,
  menu: 'Reports',
  submenu: 'Kiosk Transaction Report',
  feature,
  steps: `1. Open Reports > Kiosk Transaction Report.\n${steps}`,
  expected,
});

export const kioskReportCases: CmsCase[] = [
  kiosk(245, 'List', "2. Submit with the default filters.\n3. Verify the results load and the fields are filled in.", 'Results load without an error; no empty fields in the listed transactions.'),
  kiosk(246, 'Sort', '2. Submit, then click a column header once and again.', 'Results sort ascending, then descending.'),
  kiosk(247, 'Search', '2. Submit, search a value from the results, then a value with no match.', 'Matching rows only; no match shows an empty result.'),
  kiosk(248, 'Download', '2. Press Download.', 'A non-empty export file is downloaded.'),
  kiosk(249, 'Pagination', '2. Submit and use Next / Previous.', 'Next shows the next page, Previous goes back.'),
  kiosk(250, 'Reset', '2. Fill a filter and press Reset.', 'The filters are cleared (checklist: NA, no Reset button; suggestion given).'),
];

/** Every automated case: the sheet's 244 and the checklist-only ones. */
export const allCases: CmsCase[] = [...cmsCases, ...kioskReportCases];
