// What each "Test / Feature" of the sheet does in the browser. Every CMS-TC case is one of these actions on the
// page of its Menu › Submenu (src/cms-pages.ts). Tests are generated from the sheet by tests/*.spec.ts.
import fs from 'node:fs';
import { test, expect, openPage } from './fixtures';
import type { Page } from '@playwright/test';
import { pageFor, type CmsPage } from './cms-pages';
import { DataTable, isSorted, sortKey } from './datatable';
import { config } from './config';
import type { CmsCase } from './test-cases';

type Cms = Page & { problems: string[] };

/** Actions that read data only. */
const readActions = {
  load: /^(data is loading|list|data loading.*)$/i,
  search: /^search$/i,
  pageLength: /^show (entries )?filter$/i,
  pagination: /^pagination$/i,
  sort: /^(sorting|sort grid|grid sorting|sort)$/i,
  theme: /^theme dark \/ light$/i,
  view: /^view$/i,
  viewImage: /^view image$/i,
  download: /^download$/i,
  reset: /^reset$/i,
  customerByMobile: /^search with mobile$/i,
  customerByEmail: /^search with email$/i,
};

/** Actions that change CMS data: Add / Edit / Delete / Deactivate / Sync / Import / refunds / role access. */
const writeAction = /add|edit|delete|deactivate|sync|synch|syn data|import|assign role|resend password|update seat category|initiate refund/i;

export type CaseAction = keyof typeof readActions | 'write' | 'deferred';

export function actionOf(c: CmsCase): CaseAction {
  if (/will test later|deferred/i.test(c.feature + c.steps)) return 'deferred';
  for (const [name, re] of Object.entries(readActions)) if (re.test(c.feature.trim())) return name as CaseAction;
  if (writeAction.test(c.feature)) return 'write';
  throw new Error(`${c.id}: no action for feature "${c.feature}" (add it to src/case-steps.ts).`);
}

/** Declares one Playwright test per case, titled "CMS-TC-003 Users – Search". */
export function declareCases(menu: string, cases: CmsCase[]): void {
  test.describe(menu, () => declareEach(cases));
}

function declareEach(cases: CmsCase[]): void {
  for (const c of cases) {
    const title = `${c.id} ${c.submenu || c.menu} – ${c.feature}`;
    const action = actionOf(c);
    test(title, { annotation: [{ type: 'steps', description: c.steps }, { type: 'expected', description: c.expected }] }, async ({ cms }) => {
      test.skip(action === 'deferred', `Deferred in the sheet: ${c.steps}`);
      // Add / Edit / Delete forms are mapped after the first successful sign-in with the new CMS (see README).
      test.fixme(action === 'write', 'Write case: Add/Edit form not mapped yet. Runs on its own AUTOTEST record once mapped.');
      await runRead(action, c, pageFor(c.menu, c.submenu), cms);
      expect(cms.problems, 'no server errors or missing page files').toEqual([]);
    });
  }
}

async function runRead(action: CaseAction, c: CmsCase, target: CmsPage, page: Cms): Promise<void> {
  await test.step(`Open ${c.menu} › ${c.submenu || c.menu}`, async () => {
    await openPage(page, target.path);
    await expect(page.locator('h1, h2, h3, h4, .page-title, .x_title').filter({ hasText: target.heading }).first(), 'page heading').toBeVisible();
  });
  if (target.kind === 'dashboard') return checkDashboard(page);
  if (target.kind === 'report') return runReport(action, c, page);
  const dt = new DataTable(page);
  await test.step('List loads', () => dt.expectLoaded());

  switch (action) {
    case 'load':
      return test.step('Rows and entry count agree', async () => {
        const total = await dt.total();
        const [from, to] = await dt.range();
        expect(await dt.rows.count(), 'rows shown = "Showing x to y"').toBe(total ? to - from + 1 : 0);
        expect(total, 'list has records').toBeGreaterThan(0);
      });
    case 'search':
      return searchList(dt);
    case 'pageLength':
      return pageLength(dt);
    case 'pagination':
      return paginate(dt);
    case 'sort':
      return sortList(dt);
    case 'theme':
      return toggleTheme(page);
    case 'view':
      return test.step('View the first record', async () => {
        const view = dt.rows.first().locator('a, button').filter({ hasText: /view/i }).or(dt.rows.first().locator('[title*="View" i]')).first();
        await view.click();
        await expect(page.locator('.modal.in, .modal.show, form, .x_content').first(), 'record details shown').toBeVisible();
      });
    case 'viewImage':
      return test.step('Open the first image', async () => {
        const img = dt.rows.locator('img').first();
        await expect(img, 'image in the list').toBeVisible();
        expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth), 'image file loads').toBeGreaterThan(0);
        await img.click();
      });
    default:
      throw new Error(`${c.id}: action "${action}" does not apply to a list page.`);
  }
}

async function checkDashboard(page: Cms): Promise<void> {
  await test.step('Dashboard content loads', async () => {
    await expect(page.locator('body')).not.toContainText(/whitelabel error|exception|404|not found/i);
    await expect(page.locator('.loading:visible, .spinner:visible')).toHaveCount(0, { timeout: 30_000 });
  });
}

async function searchList(dt: DataTable): Promise<void> {
  const before = await dt.total();
  const value = await test.step('Search for a value from the first row', async () => {
    const cells = await dt.cellTexts(1).then((t) => t.filter((x) => x.length >= 3));
    const v = cells[0] ?? (await dt.cellTexts(0))[0];
    expect(v, 'a value to search for').toBeTruthy();
    await dt.searchFor(v);
    expect(await dt.rows.count(), 'matching rows').toBeGreaterThan(0);
    for (const row of await dt.rows.allTextContents()) expect(row.toLowerCase()).toContain(v.toLowerCase());
    expect(await dt.total()).toBeLessThanOrEqual(before);
    return v;
  });
  await test.step(`No match shows an empty result (searched "${value}" first)`, async () => {
    await dt.searchFor('zzqx-no-such-record-9876');
    expect(await dt.rows.count()).toBe(0);
    await expect(dt.table.locator('td.dataTables_empty'), '"No matching records found"').toBeVisible();
    await dt.searchFor('');
    expect(await dt.total(), 'clearing the search shows all again').toBe(before);
  });
}

async function pageLength(dt: DataTable): Promise<void> {
  const total = await dt.total();
  const sizes = (await dt.length.locator('option').allTextContents()).map(Number).filter((n) => n > 0);
  expect(sizes.length, '"Show N entries" options').toBeGreaterThan(1);
  for (const size of sizes) {
    await test.step(`Show ${size} entries`, async () => {
      await dt.length.selectOption(String(size));
      await expect.poll(() => dt.rows.count()).toBe(Math.min(size, total));
    });
  }
}

async function paginate(dt: DataTable): Promise<void> {
  const total = await dt.total();
  const [, to] = await dt.range();
  if (total <= to) {
    await test.step(`All ${total} entries fit on one page: Next is disabled`, async () => {
      await expect(dt.next).toHaveClass(/disabled/);
    });
    return;
  }
  await test.step('Next shows the next page', async () => {
    const firstRow = await dt.rows.first().textContent();
    await dt.next.click();
    await expect.poll(() => dt.range().then((r) => r[0])).toBe(to + 1);
    expect(await dt.rows.first().textContent()).not.toBe(firstRow);
  });
  await test.step('Previous goes back to page 1', async () => {
    await dt.wrapper.locator('.paginate_button.previous, li.previous').first().click();
    await expect.poll(() => dt.range().then((r) => r[0])).toBe(1);
  });
}

async function sortList(dt: DataTable): Promise<void> {
  const headers = dt.sortableHeaders();
  expect(await headers.count(), 'sortable columns').toBeGreaterThan(0);
  // Sort by the first sortable column that has text in its cells.
  const index = await headers.first().evaluate((th) => Array.from(th.parentElement!.children).indexOf(th));
  const header = dt.table.locator('thead th').nth(index);
  for (const direction of ['asc', 'desc'] as const) {
    await test.step(`Sort "${(await header.textContent())?.trim()}" ${direction === 'asc' ? 'A→Z' : 'Z→A'}`, async () => {
      await header.click();
      // The first click may already be the opposite direction if the column was the default sort.
      if (!(await header.getAttribute('class'))?.includes(`sorting_${direction}`)) await header.click();
      await expect(header).toHaveClass(new RegExp(`sorting_${direction}`));
      expect(isSorted((await dt.cellTexts(index)).map(sortKey), direction), `column sorted ${direction}`).toBe(true);
    });
  }
}

async function toggleTheme(page: Cms): Promise<void> {
  const html = page.locator('html');
  const toggle = page.locator('.cs-theme-toggle').first();
  const start = (await html.getAttribute('data-theme')) ?? 'light';
  const other = start === 'dark' ? 'light' : 'dark';
  await test.step(`Switch to ${other}`, async () => {
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', other);
  });
  await test.step('Theme kept after reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await expect(html).toHaveAttribute('data-theme', other);
  });
  await test.step(`Switch back to ${start}`, async () => {
    await page.locator('.cs-theme-toggle').first().click();
    await expect(html).toHaveAttribute('data-theme', start);
  });
}

// ---------- reports: filters + Submit, results table, Download, Reset ----------

async function submitReport(page: Cms): Promise<DataTable> {
  await page.getByRole('button', { name: /^submit$/i }).first().click();
  await page.waitForLoadState('networkidle');
  const results = new DataTable(page);
  await expect(results.table, 'results table').toBeVisible({ timeout: 60_000 });
  return results;
}

async function runReport(action: CaseAction, c: CmsCase, page: Cms): Promise<void> {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: /^submit$/i }) }).first();
  switch (action) {
    case 'load':
      return test.step('Submit with the default filters shows the results', async () => {
        await expect(form, 'filter form').toBeVisible();
        const dt = await submitReport(page);
        await expect(dt.info).toContainText(/entries/i);
      });
    case 'search':
      return test.step('Narrow the results with the search', async () => {
        const dt = await submitReport(page);
        test.skip((await dt.total()) === 0, 'No records in the default date range to search in.');
        await searchList(dt);
      });
    case 'sort':
      return test.step('Sort the results', async () => {
        const dt = await submitReport(page);
        test.skip((await dt.rows.count()) < 2, 'Fewer than 2 records in the default date range: nothing to sort.');
        await sortList(dt);
      });
    case 'pagination':
      return test.step('Page through the results', async () => {
        await paginate(await submitReport(page));
      });
    case 'download':
      return test.step('Download exports a file', async () => {
        const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByRole('button', { name: /download/i }).first().click()]);
        const file = await download.path();
        expect(download.suggestedFilename(), 'file name').toMatch(/\.(xlsx?|csv|pdf)$/i);
        expect(fs.statSync(file).size, 'file not empty').toBeGreaterThan(0);
        await test.info().attach(download.suggestedFilename(), { path: file });
      });
    case 'reset':
      return test.step('Reset clears the filters', async () => {
        const field = form.locator('input[type="text"]:not([readonly]):not([name="start"]):not([name="end"])').first();
        await field.fill('RESET-CHECK');
        await form.getByRole('button', { name: /reset|clear/i }).or(form.locator('input[type="reset"]')).first().click();
        await expect(field).toHaveValue('');
      });
    case 'customerByMobile':
    case 'customerByEmail': {
      const byMobile = action === 'customerByMobile';
      const value = byMobile ? config.customerMobile : config.customerEmail;
      test.skip(!value, `Set ${byMobile ? 'CMS_CUSTOMER_MOBILE' : 'CMS_CUSTOMER_EMAIL'} in .env to run this case.`);
      return test.step(`Look up the customer by ${byMobile ? 'mobile' : 'email'}`, async () => {
        await form.locator(byMobile ? '[name="mobilePhone"]' : '[name="email"]').fill(value);
        await page.getByRole('button', { name: /^submit$/i }).first().click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main, .right_col, body').first(), 'customer details shown').toContainText(value);
      });
    }
    default:
      throw new Error(`${c.id}: action "${action}" does not apply to a report page.`);
  }
}
