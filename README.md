# Cinescape CMS Automation

End-to-end browser tests for the **Cinescape CMS** (back office), written with [Playwright](https://playwright.dev)
and TypeScript. The **same 250 tests** run on three environments:

| Environment | Address | Run | Results / report / dashboard |
|---|---|---|---|
| UAT | `http://10.35.1.66:8092` | `npm test` (or `npm run test:uat`) | `test-results/`, `playwright-report/`, `dashboard/` |
| UAT (internal) | `http://10.35.1.66:8102` | `npm run test:uat-internal` | `test-results-uat-internal/`, `playwright-report-uat-internal/`, `dashboard-uat-internal/` |
| Pre-UAT | `http://10.35.1.66:8122` | `npm run test:pre-uat` | `test-results-pre-uat/`, `playwright-report-pre-uat/`, `dashboard-pre-uat/` |

The environment comes from `CMS_ENV` ([`src/config.ts`](src/config.ts)), set by `playwright.uat-internal.config.ts` /
`playwright.pre-uat.config.ts`. Each environment has its own sign-in session (`.auth/state-<env>.json`) and may have
its own account in `.env` (`CMS_USERNAME_UAT_INTERNAL`, `CMS_USERNAME_PRE_UAT`, ...; otherwise the UAT one is used).
UAT (internal) still has the older CMS pages (Login button, no Light / Dark switch, Summernote editors): the tests
handle both. This is a separate project, set up like the Web, Kiosk and
Android projects next to it.

The CMS is reachable from the **office network only**, so the tests run on the QA PC, not on GitHub's cloud runners.

## What is tested

Every case of `C:\softwares\KNCC testing\CMS_Test_Cases.xlsx` (sheet "Test Cases") has its own spec file in
[`tests/`](tests/), named by its ID, submenu and feature, e.g.
[`tests/cms-tc-033-language-add.spec.ts`](tests/cms-tc-033-language-add.spec.ts) with the test
`CMS-TC-033 Language – Add`. Each spec writes out its own steps, one `step()` per action or check, and the sheet's
**Test Steps / Expected Result** columns list the same steps (column J names the spec). Each spec's header quotes the
manual checklist's remark for the case (`C:\softwares\KNCC testing\cms test.xlsx`).

| Cases | Menu |
|---|---|
| CMS-TC-001 | Dashboard |
| CMS-TC-002..015 | User Management (Users, Role access) |
| CMS-TC-016..105 | Configurations (Configuration, Seat Category, Language, Genre, Prepare food, Email/SMS Template, Payment Modes, FAQ, Ratings, T & C, Privacy Policy, Countries) |
| CMS-TC-106..157 | Movies/Cinemas (Movies, Movies Person, Cinemas, Experiences, Food, Food Tab, Tags) |
| CMS-TC-158..183 | Offers and Banners (Offers, Bank Offers, Banners) |
| CMS-TC-184..238 | Reports (13 reports) |
| CMS-TC-239..244 | Refund › Transaction Report |
| CMS-TC-245..250 | Reports › Kiosk Transaction Report (from the manual checklist; not in the original sheet) |

Checks besides the steps of the sheet, taken from the manual checklist's remarks: scheduler "Last Success Run"
within 24 hours, Edit forms show the saved data, no 404 page after Delete / Deactivate, More type preselected on
T&C / Privacy, Sync Movies stays on Movies, uploaded images show in the list, Food Tab image kept after editing, Offer
platform saved, report fields filled in (Wallet Recharge, Customer Details, Kiosk), the role shown on Assign Role
Access, downloaded exports with their columns filled (Cancellation "User Name" and date, Wallet "Member ID", Refund "IP
Address"), one font size per column (Seat Category), sort icons (Audit Report) and text-editor icons (Ratings).
Every test also fails on any server error (5xx), missing script/style file or script error while the page is open.
CMS issues that do not break the case (e.g. the delete script's `#delkey` error) are recorded as a **finding**.

## Old data is always put back

Write cases clean up in `finally`, so also when a check fails:

- **Add / Edit / Delete / Deactivate** work on the test's own record `AUTOTEST T033-<time>`, created **inactive** where
  the form allows (it never shows in the apps), and delete it afterwards. Each test first removes AUTOTEST records
  left by an earlier run that was stopped before its clean-up.
- **Pages whose records cannot be deleted** (Seat Category, Food Tab, Genre, Bank Offers): Add is checked up to Submit
  and not saved; Edit changes one field of an existing record and **puts the original value back**. The same for
  pages without Add (Movies, Movies Person, Cinemas). Food: the item image is replaced and the original image
  uploaded back (the test checks the original bytes are shown again).
- **Real actions on UAT** (approved 11 Oct 2026): Sync Config, Import Data, Sync Data, Sync Movies, Update SeatCat,
  Re-send password (only to the test's own AUTOTEST user) and **Initiate refund** (CMS-TC-244 refunds the first break
  transaction without a refund; this cannot be undone).

CMS-TC-044 (Prepare food) is deferred in the sheet and skipped.

## Setup (QA PC)

```bash
cd CinescapeCMS-Automation
npm ci
npx playwright install chromium
copy .env.example .env      # then fill in CMS_USERNAME / CMS_PASSWORD (and the _UAT_INTERNAL / _PRE_UAT ones)
```

## Run

```bash
npm test                                          # all 250 cases
npx playwright test tests/cms-tc-003              # one case
npx playwright test --grep @Reports               # one menu (tags: @Dashboard @User-Management @Configurations
                                                  #   @Movies-Cinemas @Offers-and-Banners @Reports @Refund)
npm run test:pre-uat -- tests/cms-tc-003          # one case on another environment
npm run dashboard                                 # dashboard/index.html: filter Passed / Failed, screenshots, videos
npm run dashboard:pre-uat                         # dashboard-pre-uat/index.html (also dashboard:uat-internal)
npm run report                                    # Playwright HTML report (also report:pre-uat, report:uat-internal)
npm run probe                                     # save every page and Add form to inspect/uat (CMS_ENV=pre-uat ... for others)
```

Every test is **recorded on video** and every step has a **screenshot** (taken at the end of the step, also when it
fails). The dashboard ([`scripts/generate-dashboard.js`](scripts/generate-dashboard.js), same as the Web project)
shows them per test, with **All / Failed / Passed / Skipped** filters, a search box and the last 10 runs.

The run signs in **once** ([`src/global-setup.ts`](src/global-setup.ts)) and reuses the session, so the admin
account is not locked by many sign-ins. If the CMS ends the session during the run (timeout, or the same account
signed in elsewhere: avoid using the test account in the browser during a run) the tests sign in again, at most 5
times. A refused sign-in stops at once and is not retried.

## Layout

| Path | What |
|---|---|
| [`tests/cms-tc-NNN-*.spec.ts`](tests/) | One spec per case, with its steps written out. |
| [`src/list-page.ts`](src/list-page.ts) | Page object of a CMS list: open, search, entries, pages, sorting, theme, row actions. |
| [`src/record-page.ts`](src/record-page.ts) | Add / Edit / Delete / Activate on the test's own AUTOTEST records, clean-up, edits of existing records. |
| [`src/report-page.ts`](src/report-page.ts) | Reports: Submit, results, empty fields, Download and reading the export, Reset. |
| [`src/cms-forms.ts`](src/cms-forms.ts) | Add/Edit form fields per page, and whether its records can be deleted. |
| [`src/cms-pages.ts`](src/cms-pages.ts) | Every CMS page by name: URL, heading, report columns that must be filled. |
| [`src/test-cases.ts`](src/test-cases.ts) | The 250 cases of the sheet, with its detailed steps (generated from it; do not edit by hand). |
| [`src/fixtures.ts`](src/fixtures.ts) | `cms` (signed-in page, server/script errors, confirm boxes), `step()` with screenshot, `finding()`. |
| [`src/sign-in.ts`](src/sign-in.ts), [`src/global-setup.ts`](src/global-setup.ts) | Sign-in (one attempt) and the session reused by all tests. |
| [`src/datatable.ts`](src/datatable.ts), [`src/test-image.ts`](src/test-image.ts), [`src/config.ts`](src/config.ts) | DataTables helpers, PNG files for uploads, settings from `.env`. |
| [`scripts/probe.spec.ts`](scripts/probe.spec.ts) | Probe: saves every page and Add form to `inspect/` (never presses Save). |
| [`scripts/generate-dashboard.js`](scripts/generate-dashboard.js) | Builds the HTML dashboard from the last run. |
