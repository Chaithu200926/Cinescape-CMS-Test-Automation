// Page object for a CMS list page (jQuery DataTable): open it, read and search the table, row actions.
import { expect, type Locator } from '@playwright/test';
import { openPage, type Cms } from './fixtures';
import type { CmsPage } from './cms-pages';
import { DataTable, isSorted, sortKey } from './datatable';

export class ListPage {
  readonly table: DataTable;

  constructor(readonly page: Cms, readonly target: CmsPage) {
    this.table = new DataTable(page);
  }

  /** Opens the list, checks its heading and waits until the table has loaded. */
  async open(): Promise<void> {
    await openPage(this.page, this.target.path);
    await expect(this.page.locator('h1, h2, h3, h4, .page-title, .x_title').filter({ hasText: this.target.heading }).first(), 'page heading').toBeVisible();
    await this.table.expectLoaded();
  }

  /** Rows of the list containing `text`, after typing it in the Search box (opens the list first). */
  async rowsWith(text: string): Promise<Locator> {
    await this.open();
    await this.table.searchFor(text);
    return this.table.rows.filter({ hasText: text });
  }

  /** A link / button in a row, e.g. rowAction(row, /^edit$/i). */
  rowAction(row: Locator, label: RegExp): Locator {
    return row.locator('a, button').filter({ hasText: label }).first();
  }

  /** Clicks a row action. The responsive table hides the Action column when a row is wide: then it is clicked by script. */
  async click(link: Locator): Promise<void> {
    if (await link.isVisible()) await link.click();
    else await link.evaluate((a: HTMLElement) => a.click());
  }

  /**
   * Clicks a row action that loads a CMS URL (path contains `request`) which redirects back to the list, waits for
   * the CMS's answer and checks the page that follows is not an error page (checklist: "Error 404 is coming").
   */
  async follow(link: Locator, request: string): Promise<void> {
    const answered = this.page.waitForResponse((r) => r.url().includes(request), { timeout: 90_000 });
    await this.click(link);
    await answered;
    await this.page.waitForLoadState('load');
    await expect(this.page.locator('body'), 'no error page after the action').not.toContainText(/whitelabel error page|error 404|404 not found|^\s*not found\s*$|internal server error/i);
  }

  /** "Showing x to y of z entries" agrees with the rows shown, and the list has records. */
  async expectRowsMatchCount(): Promise<void> {
    const total = await this.table.total();
    const [from, to] = await this.table.range();
    expect(await this.table.rows.count(), 'rows shown = "Showing x to y"').toBe(total ? to - from + 1 : 0);
    expect(total, 'list has records').toBeGreaterThan(0);
  }

  /** A value of the first row (column `column`, or the first one with 3+ characters). */
  async valueFromFirstRow(column = 1): Promise<string> {
    const cells = (await this.table.cellTexts(column)).filter((x) => x.length >= 3);
    // Some reports have empty first columns (e.g. Kiosk Transaction Report on UAT internal): any filled cell of row 1.
    const anyCell = async () => (await this.table.rows.first().locator('td').allTextContents()).map((t) => t.trim()).find((t) => t.length >= 3 && !/^(null|undefined)$/i.test(t));
    const value = cells[0] ?? (await anyCell());
    expect(value, 'a value to search for').toBeTruthy();
    return value;
  }

  /** Text no record has, for the "no match" searches. */
  static readonly noSuchRecord = 'zzqx-no-such-record-9876';

  /** Every row shown contains `value` (and there is at least one). */
  async expectRowsContain(value: string): Promise<void> {
    expect(await this.table.rows.count(), `rows matching "${value}"`).toBeGreaterThan(0);
    // The list's search matches every word on its own (anywhere in the row), e.g. "Stevan Stevan" also finds "Jonathan Stevan".
    const words = value.toLowerCase().split(/\s+/).filter(Boolean);
    for (const row of await this.table.rows.allTextContents()) {
      for (const word of words) expect(row.toLowerCase(), `row contains "${word}"`).toContain(word);
    }
  }

  /** No rows and "No matching records found". */
  async expectNoMatchShown(): Promise<void> {
    expect(await this.table.rows.count()).toBe(0);
    await expect(this.table.table.locator('td.dataTables_empty'), '"No matching records found"').toBeVisible();
  }

  /** The "Show N entries" sizes offered. */
  async entrySizes(): Promise<number[]> {
    const sizes = (await this.table.length.locator('option').allTextContents()).map(Number).filter((n) => n > 0);
    expect(sizes.length, '"Show N entries" options').toBeGreaterThan(1);
    return sizes;
  }

  /** `count` rows are shown. */
  async expectRowCount(count: number): Promise<void> {
    await expect.poll(() => this.table.rows.count(), { message: `${count} rows shown` }).toBe(count);
  }

  /** "Show N entries" select: chooses N. */
  async showEntries(size: number): Promise<void> {
    await this.table.length.selectOption(String(size));
  }

  /** Previous button of the pager. */
  get previous(): Locator {
    return this.table.wrapper.locator('.paginate_button.previous, li.previous').first();
  }

  /** Clicks a pager button (Next / Previous); the link inside the button item if it has one. */
  async clickPager(button: Locator): Promise<void> {
    const link = button.locator('a');
    await ((await link.count()) ? link.first() : button).click();
  }

  /** The first row number shown ("Showing x to ...") becomes `expected`. */
  async expectFirstRowNumber(expected: number): Promise<void> {
    await expect.poll(() => this.table.range().then((r) => r[0]), { message: `page starts at row ${expected}` }).toBe(expected);
  }

  /** The first sortable column header. */
  async sortableColumn(): Promise<{ header: Locator; index: number; name: string }> {
    const headers = this.table.sortableHeaders();
    expect(await headers.count(), 'sortable columns').toBeGreaterThan(0);
    const index = await headers.first().evaluate((th) => Array.from(th.parentElement!.children).indexOf(th));
    const header = this.table.head.locator('th').nth(index);
    return { header, index, name: ((await header.textContent()) ?? '').trim() };
  }

  /** Clicks the column header until it is sorted in `direction` (the header shows that sort). */
  async sortBy(column: { header: Locator }, direction: 'asc' | 'desc'): Promise<void> {
    await column.header.click();
    // The first click may already be the opposite direction if the column was the default sort.
    if (!(await column.header.getAttribute('class'))?.includes(`sorting_${direction}`)) await column.header.click();
    await expect(column.header).toHaveClass(new RegExp(`sorting_${direction}`));
  }

  /** The cells of the column are in `direction` order. */
  async expectColumnOrder(column: { index: number }, direction: 'asc' | 'desc'): Promise<void> {
    // Empty placeholders ("", "-", "—", null) are left out: the list puts them first or last by its own rule.
    const values = (await this.table.cellTexts(column.index)).filter((v) => !/^\s*([-–—]|null)?\s*$/i.test(v));
    expect(isSorted(values.map(sortKey), direction), `column sorted ${direction === 'asc' ? 'A→Z' : 'Z→A'}`).toBe(true);
  }

  /** Every sortable column header shows a sort icon (manual checklist: "Sort icon not showing"). */
  async expectSortIcons(): Promise<void> {
    const missing = await this.table.sortableHeaders().evaluateAll((ths) =>
      ths
        .filter((th) => {
          const shown = (el: Element, pseudo?: string) => {
            const s = getComputedStyle(el, pseudo);
            return (s.content && s.content !== 'none' && s.content !== 'normal' && s.content !== '""' && s.display !== 'none') || s.backgroundImage !== 'none';
          };
          return !(shown(th, '::before') || shown(th, '::after') || shown(th) || th.querySelector('i, svg, .sort-icon'));
        })
        .map((th) => (th.textContent ?? '').trim()),
    );
    expect.soft(missing, 'columns without a sort icon').toEqual([]);
  }

  /** Font size (px) of the text in each column of the first row: { column header: size }. */
  async columnFontSizes(): Promise<Record<string, number>> {
    return this.table.table.evaluate((t) => {
      const head = [...t.querySelectorAll('thead th')].map((e) => (e.textContent ?? '').trim());
      const cells = [...(t.querySelector('tbody tr')?.querySelectorAll('td') ?? [])];
      const sizes: Record<string, number> = {};
      cells.forEach((td, i) => {
        if ((td.textContent ?? '').trim() && head[i]) sizes[head[i]] = parseFloat(getComputedStyle(td).fontSize);
      });
      return sizes;
    });
  }

  /** The current theme ('light' / 'dark') from <html data-theme>. */
  async theme(): Promise<string> {
    return (await this.page.locator('html').getAttribute('data-theme')) ?? 'light';
  }

  /** Clicks the Light / Dark switch in the header and checks the theme changed to `expected`. */
  async switchTheme(expected: string): Promise<void> {
    await this.page.locator('.cs-theme-toggle').first().click();
    await expect(this.page.locator('html')).toHaveAttribute('data-theme', expected);
  }
}
