// Helpers for the CMS list pages. Every list is a jQuery DataTable: "Show N entries", a Search box,
// sortable column headers, "Showing 1 to N of M entries" and Previous / page numbers / Next.
import { expect, type Locator, type Page } from '@playwright/test';

export class DataTable {
  readonly wrapper: Locator;
  /** The table with the records (with horizontal scrolling, DataTables puts the visible header in a separate table). */
  readonly table: Locator;
  /** The visible header row: the scroll header's when the table scrolls sideways, otherwise the table's own. */
  readonly head: Locator;
  readonly rows: Locator;
  readonly info: Locator;
  readonly search: Locator;
  readonly length: Locator;
  readonly next: Locator;

  constructor(readonly page: Page, scope: Locator | Page = page) {
    this.wrapper = scope.locator('.dataTables_wrapper').first();
    // Some reports (e.g. Booking Summary) show a plain table, not a DataTables list: then that table is used.
    this.table = this.wrapper
      .locator('table:not(.dataTables_scrollHead table):not(.dataTables_scrollFoot table)')
      .or(scope.locator('table.table').filter({ visible: true }))
      .first();
    this.head = this.wrapper.locator('thead').first();
    // DataTables shows one "No data / No matching records" row with a single cell when empty.
    this.rows = this.table.locator('tbody tr:not(:has(td.dataTables_empty))');
    this.info = this.wrapper.locator('.dataTables_info');
    this.search = this.wrapper.locator('.dataTables_filter input');
    this.length = this.wrapper.locator('select[name$="_length"]');
    this.next = this.wrapper.locator('.paginate_button.next, a.next, li.next').first();
  }

  /** Total number of entries from "Showing 1 to 10 of 57 entries" (filtered count when searching). */
  async total(): Promise<number> {
    // Report results have no "Showing ... entries" line (the CMS pages them itself): count the rows shown.
    if (!(await this.info.count())) return this.rows.count();
    const text = (await this.info.textContent()) ?? '';
    const m = text.replace(/,/g, '').match(/of\s+(\d+)\s+entries/i);
    return m ? Number(m[1]) : 0;
  }

  /** First and last row number shown, from "Showing 11 to 20 of 57 entries". */
  async range(): Promise<[number, number]> {
    if (!(await this.info.count())) return [1, await this.rows.count()];
    const m = ((await this.info.textContent()) ?? '').replace(/,/g, '').match(/showing\s+(\d+)\s+to\s+(\d+)/i);
    return m ? [Number(m[1]), Number(m[2])] : [0, 0];
  }

  async expectLoaded(): Promise<void> {
    await expect(this.table, 'list table shown').toBeVisible();
    await expect(this.page.locator('.dataTables_processing:visible'), 'no endless loading indicator').toHaveCount(0, { timeout: 30_000 });
    await expect(this.info, 'entry count shown').toContainText(/showing|entries/i);
  }

  async cellTexts(column: number): Promise<string[]> {
    return (await this.rows.locator(`td:nth-child(${column + 1})`).allTextContents()).map((t) => t.trim());
  }

  /** Types in the Search box and waits for the table to redraw. */
  async searchFor(text: string): Promise<void> {
    await this.search.fill(text);
    await this.search.press('Enter');
    await this.page.waitForTimeout(800);
  }

  /** Column headers that can be sorted (DataTables marks them with class "sorting"). */
  sortableHeaders(): Locator {
    return this.head.locator('th.sorting, th.sorting_asc, th.sorting_desc');
  }
}

/** Plain text of a cell for sorting comparisons: numbers compare as numbers, dates and text as text. */
export function sortKey(text: string): number | string {
  const n = Number(text.replace(/[, ]|KWD/gi, ''));
  return text.trim() !== '' && !Number.isNaN(n) ? n : text.trim().toLowerCase();
}

export function isSorted(values: (number | string)[], direction: 'asc' | 'desc'): boolean {
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1];
    const b = values[i];
    const cmp = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
    if (direction === 'asc' ? cmp > 0 : cmp < 0) return false;
  }
  return true;
}
