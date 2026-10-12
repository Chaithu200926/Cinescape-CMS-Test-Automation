// Page object for a CMS report: filters + Submit, the results table, Download and Reset.
import fs from 'node:fs';
import ExcelJS from 'exceljs';
import { expect, type Locator } from '@playwright/test';
import { test, finding, openPage, type Cms } from './fixtures';
import type { CmsPage } from './cms-pages';
import { ListPage } from './list-page';

export class ReportPage extends ListPage {
  constructor(page: Cms, target: CmsPage) {
    super(page, target);
  }

  /** Opens the report and checks its heading (the results table appears only after Submit). */
  override async open(): Promise<void> {
    await openPage(this.page, this.target.path);
    await expect(this.page.locator('h1, h2, h3, h4, .page-title, .x_title').filter({ hasText: this.target.heading }).first(), 'page heading').toBeVisible();
  }

  /** The filter form (the one with the Submit button). */
  filters(): Locator {
    return this.page.locator('form').filter({ has: this.page.getByRole('button', { name: /^submit$/i }) }).first();
  }

  submitButton(): Locator {
    return this.page.getByRole('button', { name: /^submit$/i }).first();
  }

  /**
   * Moves the From date `days` back (the reports default to the last 24 hours, often empty on UAT). Reports without
   * a From date, or with an empty one (no date filter), are left as they are.
   */
  async widenDates(days = 30): Promise<void> {
    const from = this.page.locator('#start, [name="start"]').first();
    const to = this.page.locator('#end, [name="end"]').first();
    if (!(await from.count())) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const set = (field: typeof from, v: string) =>
      field.evaluate((el: HTMLInputElement, value) => {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, v);
    const value = await from.inputValue();
    const start = new Date(Date.now() - days * 86_400_000);
    if (!value) {
      // Food and Beverages, Cancellations: From / To start empty (date only, YYYY-MM-DD) and Submit without them is
      // refused with "Invalid date format.": fill both. The Refund page has no date range by default: leave it.
      if (/refund\/break_transactions/.test(this.target.path)) return;
      await set(from, ymd(start));
      if (await to.count()) await set(to, ymd(new Date()));
      return;
    }
    // Keep the field's own format, e.g. "2026-10-10 06:00" (date + time) or "2026-10-10".
    const time = value.match(/\s(\d{1,2}:\d{2}(:\d{2})?)$/)?.[1];
    await set(from, time ? `${ymd(start)} ${time}` : ymd(start));
  }

  /** "No records found" message shown instead of a results table. */
  noRecords(): Locator {
    return this.page.getByText(/no records? (were )?found|no data available/i).first();
  }

  /** Presses Submit and waits for the results: a results table, or the "No records found" message. */
  async submit(): Promise<void> {
    await this.submitButton().click();
    await this.page.waitForLoadState('networkidle');
    const refused = this.page.getByText(/invalid date format|please select|is required/i).first();
    await expect(this.table.table.or(this.noRecords()).or(refused).first(), 'results table or "No records found"').toBeVisible({ timeout: 120_000 });
    if (await refused.isVisible()) throw new Error(`The CMS refused the filters: "${((await refused.textContent()) ?? '').trim()}"`);
  }

  /** The search found records (a results table with rows). */
  async hasResults(): Promise<boolean> {
    return (await this.table.table.isVisible()) && (await this.table.rows.count()) > 0;
  }

  /** The report's own page-number bar (1, 2, 3 ...; 50 results per page), under the results. */
  pager(): Locator {
    return this.page.locator('ul.pagination#pages, ul#pages').first();
  }

  /** Number of pages in the page-number bar (0 when there is none). */
  async pageCount(): Promise<number> {
    return (await this.pager().count()) ? this.pager().locator('li a').filter({ hasText: /^\s*\d+\s*$/ }).count() : 0;
  }

  /** Clicks page `n` in the page-number bar and waits for the results. */
  async goToPage(n: number): Promise<void> {
    await this.pager().locator('li a').filter({ hasText: new RegExp(`^\\s*${n}\\s*$`) }).first().click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.table.table).toBeVisible({ timeout: 120_000 });
  }

  /** Page `n` is the highlighted one in the page-number bar. */
  async expectCurrentPage(n: number): Promise<void> {
    await expect(this.pager().locator('li.active'), `page ${n} highlighted`).toHaveText(new RegExp(`^\\s*${n}\\s*$`));
  }

  /** Number of result rows. */
  async resultCount(): Promise<number> {
    return (await this.table.table.isVisible()) ? this.table.rows.count() : 0;
  }

  /** Columns of the results with empty cells ("", null, -) in the rows shown: { column: count }. */
  async emptyCells(): Promise<Record<string, number>> {
    return this.table.table.evaluate((t) => {
      const head = [...t.querySelectorAll('thead th')].map((e) => (e.textContent ?? '').trim());
      const rows = [...t.querySelectorAll('tbody tr')].map((r) => [...r.querySelectorAll('td')].map((c) => (c.textContent ?? '').trim())).filter((r) => r.length > 1);
      const empty: Record<string, number> = {};
      head.forEach((h, i) => {
        const n = rows.filter((r) => !r[i] || /^(null|undefined|-)$/i.test(r[i])).length;
        if (h && n) empty[h] = n;
      });
      return empty;
    });
  }

  /**
   * The report's required columns (src/cms-pages.ts) are filled in every row shown; other columns with empty
   * cells are recorded as a finding (checklist: "fields are coming as empty").
   */
  async expectFieldsFilled(): Promise<void> {
    const empty = await this.emptyCells();
    const rows = await this.resultCount();
    const required = this.target.requiredColumns ?? [];
    for (const column of required) expect.soft(empty[column] ?? 0, `"${column}" filled in all ${rows} rows`).toBe(0);
    const others = Object.entries(empty).filter(([c]) => !required.includes(c)).map(([c, n]) => `${c} (${n}/${rows})`);
    if (others.length) finding(`Empty fields in the results: ${others.join(', ')}`);
  }

  /** The Download link / button of the filters. */
  downloadButton(): Locator {
    return this.page.locator('a, button, input[type="button"]').filter({ hasText: /^\s*download\s*$/i }).first();
  }

  /** Presses Download and waits for the file (from the page or the new tab it may open); returns its path and name. */
  async download(): Promise<{ path: string; name: string }> {
    const fromPage = this.page.waitForEvent('download', { timeout: 120_000 });
    const fromNewTab = this.page.waitForEvent('popup', { timeout: 120_000 }).then((tab) => tab.waitForEvent('download', { timeout: 120_000 }));
    fromPage.catch(() => {});
    fromNewTab.catch(() => {});
    await this.downloadButton().click({ noWaitAfter: true });
    const file = await Promise.any([fromPage, fromNewTab]).catch(() => {
      throw new Error('Download did not start a file download within 2 minutes.');
    });
    const saved = test.info().outputPath(file.suggestedFilename());
    await file.saveAs(saved);
    await test.info().attach(file.suggestedFilename(), { path: saved });
    return { path: saved, name: file.suggestedFilename() };
  }

  /** The downloaded file is an .xlsx / .csv / .pdf export and is not empty. */
  expectExportFile(file: { path: string; name: string }): void {
    expect(file.name, 'file name').toMatch(/\.(xlsx?|csv|pdf)$/i);
    expect(fs.statSync(file.path).size, 'file not empty').toBeGreaterThan(0);
  }

  /** Header row and data rows of a downloaded .xlsx (first sheet) or .csv. */
  async readExport(file: { path: string; name: string }): Promise<{ headers: string[]; rows: string[][] }> {
    let grid: string[][] = [];
    if (/\.xlsx$/i.test(file.name)) {
      const book = new ExcelJS.Workbook();
      await book.xlsx.readFile(file.path);
      const sheet = book.worksheets[0];
      sheet?.eachRow({ includeEmpty: false }, (row) => {
        const values = (row.values as unknown[]).slice(1); // ExcelJS rows start at index 1
        grid.push(values.map((v) => cellText(v)));
      });
    } else if (/\.csv$/i.test(file.name)) {
      grid = fs.readFileSync(file.path, 'utf8').split(/\r?\n/).filter((l) => l.trim()).map(parseCsvLine);
    } else {
      throw new Error(`Cannot read the columns of ${file.name} (only .xlsx and .csv).`);
    }
    // The header row is the first row with several filled cells (some exports start with a title row).
    const headerIndex = grid.findIndex((r) => r.filter((c) => c.trim()).length >= 3);
    expect(headerIndex, 'header row in the export').toBeGreaterThanOrEqual(0);
    const headers = grid[headerIndex].map((h) => h.trim());
    const rows = grid.slice(headerIndex + 1).filter((r) => r.some((c) => c.trim()));
    await test.info().attach('export columns', { body: `${headers.join(' | ')}\n${rows.length} data rows`, contentType: 'text/plain' });
    return { headers, rows };
  }

  /**
   * The export has a column matching `column` and it is filled in every data row (manual checklist: "User name
   * field missing", "Member ID is blank", ...). Soft check, so every column of the case is reported.
   */
  expectExportColumnFilled(table: { headers: string[]; rows: string[][] }, column: RegExp, label: string): void {
    const index = table.headers.findIndex((h) => column.test(h));
    expect.soft(index, `export has a "${label}" column (columns: ${table.headers.join(', ')})`).toBeGreaterThanOrEqual(0);
    if (index < 0) return;
    const empty = table.rows.filter((r) => !r[index] || /^(null|undefined|-)$/i.test(r[index].trim())).length;
    expect.soft(empty, `"${label}" filled in all ${table.rows.length} rows of the export`).toBe(0);
  }

  /** Every value of a column of the export reads as a date (manual checklist: "cancellation date not coming proper"). */
  expectExportColumnDates(table: { headers: string[]; rows: string[][] }, column: RegExp, label: string): void {
    const index = table.headers.findIndex((h) => column.test(h));
    expect.soft(index, `export has a "${label}" column`).toBeGreaterThanOrEqual(0);
    if (index < 0) return;
    const bad = table.rows.map((r) => r[index] ?? '').filter((v) => !/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(v));
    expect.soft(bad.slice(0, 5), `"${label}" is a date in all ${table.rows.length} rows (first wrong values shown)`).toEqual([]);
  }

  /** The Reset / Clear button of the filters (none on some reports: checklist "NA, suggestion given"). */
  resetButton(): Locator {
    return this.filters().getByRole('button', { name: /reset|clear/i }).or(this.filters().locator('input[type="reset"]')).first();
  }

  /** A free-text filter field (not the date range). */
  textFilter(): Locator {
    return this.filters().locator('input[type="text"]:not([readonly]):not([name="start"]):not([name="end"])').filter({ visible: true }).first();
  }
}

/** Text of an ExcelJS cell value (plain, rich text, formula result, hyperlink or date). */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof v === 'object') {
    const o = v as { richText?: { text: string }[]; result?: unknown; text?: unknown };
    if (o.richText) return o.richText.map((p) => p.text).join('');
    if ('result' in o) return cellText(o.result);
    if ('text' in o) return cellText(o.text);
  }
  return String(v);
}

/** One CSV line â†’ cells (handles "quoted, values" and "" escapes). */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted && ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { cells.push(cell); cell = ''; }
    else cell += ch;
  }
  cells.push(cell);
  return cells;
}
