# Cinescape CMS Automation

End-to-end browser tests for the **Cinescape CMS** (back office) on UAT, `http://10.35.1.66:8092`, written with
[Playwright](https://playwright.dev) and TypeScript. This is a separate project, the same as the web, kiosk and
Android projects next to it.

The CMS is reachable from the **office network only**, so the tests run on the QA PC, not on GitHub's cloud runners.

## What is tested

Every case of `C:\softwares\KNCC testing\CMS_Test_Cases.xlsx` (sheet "Test Cases"), **CMS-TC-001 to CMS-TC-244**,
is one Playwright test titled with its ID, submenu and feature, e.g. `CMS-TC-003 Users – Search`. The sheet's
steps and expected result are attached to each test in the report.

| Spec | Menu | Cases |
|---|---|---|
| [`cms-01-dashboard.spec.ts`](tests/cms-01-dashboard.spec.ts) | Dashboard | CMS-TC-001 |
| [`cms-02-user-management.spec.ts`](tests/cms-02-user-management.spec.ts) | User Management (Users, Role access) | CMS-TC-002..015 |
| [`cms-03-configurations.spec.ts`](tests/cms-03-configurations.spec.ts) | Configurations (Configuration, Seat Category, Language, Genre, Prepare food, Email/SMS Template, Payment Modes, FAQ, Ratings, T & C, Privacy Policy, Countries) | CMS-TC-016..105 |
| [`cms-04-movies-cinemas.spec.ts`](tests/cms-04-movies-cinemas.spec.ts) | Movies/Cinemas (Movies, Movies Person, Cinemas, Experiences, Food, Food Tab, Tags) | CMS-TC-106..157 |
| [`cms-05-offers-banners.spec.ts`](tests/cms-05-offers-banners.spec.ts) | Offers and Banners (Offers, Bank Offers, Banners) | CMS-TC-158..183 |
| [`cms-06-reports.spec.ts`](tests/cms-06-reports.spec.ts) | Reports (13 reports) | CMS-TC-184..238 |
| [`cms-07-refund.spec.ts`](tests/cms-07-refund.spec.ts) | Refund › Transaction Report | CMS-TC-239..244 |

What each feature checks ([`src/case-steps.ts`](src/case-steps.ts)):

- **List / Data loading**: the table loads without an endless spinner; rows shown match "Showing x to y of z entries".
- **Search**: a value from the first row finds only matching rows; a value with no match shows "No matching records
  found"; clearing the search shows all entries again.
- **Show entries filter**: every "Show N entries" option shows N rows (or all, if fewer).
- **Pagination**: Next shows the next page, Previous goes back; with one page, Next is disabled.
- **Sorting**: a column sorts A→Z then Z→A, and the cells really are in that order.
- **Theme Dark / Light**: the toggle switches the theme, it survives a reload, and is switched back.
- **View / View image**: the record or image opens; the image file loads.
- **Reports**: Submit with the default filters shows results; Search, Sort and Pagination on the results;
  Download saves a non-empty export file (attached to the report); Reset clears the filters; Customer Details
  looks up `CMS_CUSTOMER_MOBILE` / `CMS_CUSTOMER_EMAIL`.
- Every test also fails on any server error (5xx) or missing script/style file while the page is open.

**Write cases** (Add, Edit, Delete, Deactivate, Sync, Import, Assign role, Re-send password, Update seat category,
Initiate refund; 75 cases) are in the run as `fixme` until their forms are mapped. Plan: each creates its own record
named `AUTOTEST CMS-TC-NNN <time>`, edits / deactivates / deletes only that record, and pages without Add (Movies,
Cinemas, Users) put the original value back after editing. CMS-TC-044 (Prepare food) is deferred in the sheet and
skipped.

## Setup (QA PC)

```bash
cd CinescapeCMS-Automation
npm ci
npx playwright install chromium
copy .env.example .env      # then fill in CMS_USERNAME / CMS_PASSWORD
```

## Run

```bash
npm test                                          # all 244 cases
npx playwright test tests/cms-06-reports.spec.ts  # one menu
npx playwright test -g "CMS-TC-003"               # one case
npm run report                                    # HTML report (steps, screenshots, video on failure)
npm run dashboard                                 # dashboard/index.html
npm run probe                                     # save every page and Add form to inspect/ (for new specs)
```

The run signs in **once** ([`src/global-setup.ts`](src/global-setup.ts)) and reuses the session, so the admin
account is not locked by many sign-ins. If the sign-in is refused it stops at once and does not retry.

## Layout

| Path | What |
|---|---|
| [`src/test-cases.ts`](src/test-cases.ts) | The 244 cases, generated from the sheet (do not edit by hand). |
| [`src/cms-pages.ts`](src/cms-pages.ts) | Menu › Submenu → CMS page URL, heading and Add button. |
| [`src/case-steps.ts`](src/case-steps.ts) | What each feature does; declares one test per case. |
| [`src/datatable.ts`](src/datatable.ts) | Helpers for the DataTables lists (search, entries, pages, sorting). |
| [`src/fixtures.ts`](src/fixtures.ts) | Signed-in page that records server errors; final screenshot per test. |
| [`src/config.ts`](src/config.ts) | Settings from `.env`. |
| [`scripts/probe.spec.ts`](scripts/probe.spec.ts) | Probe: saves every page and Add form to `inspect/` (never presses Save). |
| [`scripts/generate-dashboard.js`](scripts/generate-dashboard.js) | Builds the HTML dashboard from the last run. |
