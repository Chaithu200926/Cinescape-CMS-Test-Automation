// Page object for the Add / Edit / Delete / Activate actions of a CMS list, on the test's own AUTOTEST records.
// Old data is always put back by the tests: `remove()` deletes the test's record (call it in `finally`), and
// `removeLeftovers()` deletes AUTOTEST records an earlier run left behind.
import fs from 'node:fs';
import path from 'node:path';
import { expect, type Locator } from '@playwright/test';
import { test, finding, type Cms } from './fixtures';
import type { CmsPage } from './cms-pages';
import { ListPage } from './list-page';
import { config, AUTOTEST_PREFIX } from './config';
import { recordForms, type FieldValue, type RecordForm, type TestRecord } from './cms-forms';
import { testImage } from './test-image';

/**
 * The CMS's delete and re-send scripts set the href of a #delkey element that is not on the page, after they have
 * started the request ("Cannot set properties of null (setting 'href')"). The action works, so it is a finding.
 */
const delkeyScriptError = /^script error: Cannot set properties of null \(setting 'href'\)$/;

export class RecordPage extends ListPage {
  constructor(page: Cms, target: CmsPage) {
    super(page, target);
  }

  /** The page's Add / Edit form fields (src/cms-forms.ts). Pages without Add only edit existing records. */
  get form(): RecordForm {
    const form = recordForms[this.target.name];
    if (!form) throw new Error(`No Add/Edit form for "${this.target.name}" in src/cms-forms.ts.`);
    return form;
  }

  /** A new test record: "AUTOTEST T033-1011093758" (case number + time, unique per run). */
  newRecord(caseId: string): TestRecord {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const token = `T${caseId.slice(-3)}-${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return { token, name: `${AUTOTEST_PREFIX} ${token}` };
  }

  values(record: TestRecord): Record<string, FieldValue> {
    return this.form.values(record);
  }

  /** The Add / Edit form on the page: the form holding `field` (default: the first field of the record). */
  formElement(field = Object.keys(this.form.values({ token: 'x', name: 'x' }))[0]): Locator {
    return this.page.locator('form').filter({ has: this.page.locator(`[name="${field}"]`) }).first();
  }

  field(name: string): Locator {
    return this.page.locator(`[name="${name}"]`).first();
  }

  // ---------- Add ----------

  /** Clicks the list's Add button. */
  async clickAdd(): Promise<void> {
    await this.page.locator(`a[href="${this.form.add}"]`).first().click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /** The Add form is open. */
  async expectAddFormOpen(): Promise<void> {
    await expect(this.page, 'Add form opened').toHaveURL((u) => decodeURIComponent(u.pathname) === this.form.add);
    await expect(this.formElement(), 'Add form shown').toBeVisible();
  }

  /** Opens the list and clicks Add: the Add form opens. */
  async openAddForm(): Promise<void> {
    await this.open();
    await this.clickAdd();
    await this.expectAddFormOpen();
  }

  /** Presses the Submit / Add / Update button of the form holding `field`; returns the page address before it. */
  async pressSubmit(field?: string): Promise<string> {
    const before = this.page.url();
    await this.formElement(field).locator('button[type="submit"], input[type="submit"]').first().click();
    await this.page.waitForTimeout(1500);
    return before;
  }

  /** After pressSubmit(): the form was refused (still on it); the fields the browser flagged are attached. */
  async expectRefused(before: string, why: string, field?: string): Promise<void> {
    expect(this.page.url(), `${why}: form not submitted`).toBe(before);
    const flagged = await this.formElement(field).evaluate((f: HTMLFormElement) => [...f.querySelectorAll<HTMLInputElement>(':invalid')].map((i) => i.name).filter(Boolean));
    await test.info().attach(`${why}: flagged fields`, { body: flagged.join(', ') || '(none: the page itself kept the form)', contentType: 'text/plain' });
  }

  /** Sets form fields by name: text, selects (by value or text), multi-selects, checkboxes and read-only date fields. */
  async setFields(values: Record<string, FieldValue>): Promise<void> {
    await this.page.evaluate((vals) => {
      for (const [name, value] of Object.entries(vals)) {
        const fields = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`);
        if (!fields.length) throw new Error(`Form field "${name}" not found`);
        for (const el of fields) {
          if (el instanceof HTMLInputElement && el.type === 'checkbox') {
            // true / false: every box of that name; a list: the boxes of a group whose value or label matches.
            const label = (el.closest('label')?.textContent ?? el.parentElement?.textContent ?? '').trim();
            el.checked = Array.isArray(value) ? value.some((v) => v === el.value || v === label) : value === true;
          } else if (el instanceof HTMLSelectElement) {
            const wanted = (Array.isArray(value) ? value : [String(value)]).map((v) => v.trim());
            for (const o of el.options) o.selected = wanted.includes(o.value) || wanted.includes(o.text.trim());
            if (wanted.some((w) => w !== '') && el.selectedOptions.length === 0) throw new Error(`"${name}" has no option ${wanted.join(', ')}`);
          } else {
            el.value = String(value);
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const $ = (window as unknown as { jQuery?: any }).jQuery;
      if ($?.fn?.selectpicker) $('.selectpicker').selectpicker('refresh');
    }, values);
  }

  /** Fills the whole form: fields, rich-text editors and image uploads (images in the size the form asks for). */
  async fill(values: Record<string, FieldValue>): Promise<void> {
    await this.setFields(values);
    for (const [i, name] of (this.form.richText ?? []).entries()) {
      await this.page.locator('.jodit-wysiwyg').nth(i).click();
      await this.page.keyboard.type(`Automated test text (${name}).`);
      // The editor copies its text into the hidden field; set it as well in case it has not yet.
      await this.page.locator(`textarea[name="${name}"]`).evaluate((t: HTMLTextAreaElement, v) => { if (!t.value.trim()) t.value = v; }, `<p>Automated test text (${name}).</p>`);
    }
    for (const [name, [w, h]] of Object.entries(this.form.files ?? {})) {
      await this.page.locator(`input[type="file"][name="${name}"]`).first().setInputFiles(testImage(w, h));
    }
  }

  /**
   * Every button of the rich-text editor toolbars shows an icon (manual checklist: "Description text editor icons are
   * not displaying. Have to hover mouse to understand what it is").
   */
  async expectEditorIconsShown(): Promise<void> {
    const buttons = this.page.locator('.jodit-toolbar-button__button, .jodit-toolbar-button button');
    expect(await buttons.count(), 'text editor toolbar buttons').toBeGreaterThan(0);
    const blank = await buttons.evaluateAll((bs) =>
      bs
        .filter((b) => {
          const icon = b.querySelector('svg, img, .jodit-icon, i');
          const r = icon?.getBoundingClientRect();
          return !icon || !r || r.width < 4 || r.height < 4 || getComputedStyle(icon).visibility === 'hidden';
        })
        .map((b) => b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent?.trim() || '?'),
    );
    expect.soft(blank, 'editor buttons without a visible icon').toEqual([]);
  }

  /** Presses Submit / Add / Update of the form holding `field` and waits for the CMS to move on (the form was saved). */
  async submit(field?: string): Promise<void> {
    const before = this.page.url();
    await this.formElement(field).locator('button[type="submit"], input[type="submit"]').first().click();
    await this.page.waitForURL((u) => u.href !== before, { timeout: 90_000 }).catch(() => {
      throw new Error(`The form was not saved: still on ${new URL(before).pathname} after Submit.`);
    });
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(this.page.locator('body'), 'no error page after saving').not.toContainText(/whitelabel error page|exception|internal server error/i);
    // The CMS may come back to the form with an error banner instead of saving ("Something went wrong, Please try again.").
    const banner = this.page.locator('.alert-danger, .alert-error, .alert').filter({ hasText: /something went wrong|try again|error|failed|not saved/i }).first();
    if (await banner.isVisible().catch(() => false)) {
      throw new Error(`The CMS did not save the form: "${((await banner.textContent()) ?? '').trim().replace(/\s+/g, ' ')}"`);
    }
  }

  /** The form, filled with valid data, would be accepted by the browser (used where saving is not possible). */
  async expectFormValid(): Promise<void> {
    expect(await this.formElement().evaluate((f: HTMLFormElement) => f.checkValidity()), 'form valid with the data').toBe(true);
  }

  /**
   * Opens Add, fills the record and saves it (the set-up of the Edit / Delete / Deactivate cases). Script errors of
   * the Add form are what the Add case tests; here they are recorded as a finding instead of failing this case.
   */
  async create(record: TestRecord): Promise<void> {
    const before = this.page.problems.length;
    try {
      await this.openAddForm();
      await this.fill(this.values(record));
      await this.submit();
    } finally {
      const added = this.page.problems.splice(before);
      const scriptErrors = added.filter((p) => p.startsWith('script error:'));
      this.page.problems.push(...added.filter((p) => !p.startsWith('script error:')));
      if (scriptErrors.length) finding(`The Add form raised a CMS script error while creating the test record (the Add case reports it): ${[...new Set(scriptErrors)].join('; ')}`);
    }
  }

  /** The record is in the list once. */
  async expectInList(text: string): Promise<Locator> {
    const rows = await this.rowsWith(text);
    await expect(rows, `"${text}" in the list`).toHaveCount(1);
    return rows.first();
  }

  async expectNotInList(text: string): Promise<void> {
    await expect(await this.rowsWith(text), `"${text}" not in the list`).toHaveCount(0);
  }

  /** The images uploaded with the record show in its row (checklist: "Added images not showing in grid"). */
  async expectRowImagesShown(record: TestRecord): Promise<void> {
    const row = await this.expectInList(record.token);
    const sources = await row.evaluate((r) => [
      ...[...r.querySelectorAll('img')].map((i) => (i as HTMLImageElement).currentSrc || i.getAttribute('src') || ''),
      ...[...r.querySelectorAll('a')].filter((a) => /view image/i.test(a.textContent ?? '')).map((a) => a.getAttribute('href') ?? ''),
    ].filter(Boolean));
    expect(sources.length, 'uploaded images shown in the row').toBeGreaterThan(0);
    for (const src of sources) {
      const res = await this.page.request.get(new URL(src, config.baseUrl).href);
      expect(res.ok(), `image loads: ${src}`).toBe(true);
    }
  }

  // ---------- Edit ----------

  /** Clicks Edit on the record's row; returns the edit page URL. */
  async openEdit(text: string, field = this.form.edit.field): Promise<string> {
    await this.click(this.rowAction(await this.expectInList(text), /^\s*edit\s*$/i));
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(this.field(field), 'edit form').toBeAttached();
    return this.page.url();
  }

  /** The edit form shows the saved data (checklist: "No data populating in edit for new entries"). */
  async expectEditShows(values: Record<string, FieldValue>): Promise<void> {
    for (const [name, value] of Object.entries(values)) {
      if (typeof value !== 'string' || /password/i.test(name) || !value) continue;
      const field = this.field(name);
      if ((await field.getAttribute('type')) === 'file') continue;
      if ((await field.evaluate((e) => e.tagName)) === 'SELECT') {
        // The test sets a select by its option's label or value; the form keeps the value (e.g. "Outside App" = OUTAPP).
        const shown = await field.evaluate((s: HTMLSelectElement) => [...s.selectedOptions].flatMap((o) => [o.value, o.text.trim()]));
        expect.soft(shown, `edit form shows the saved "${name}"`).toContain(value);
        continue;
      }
      await expect.soft(field, `edit form shows the saved "${name}"`).toHaveValue(value);
    }
  }

  /** Selected options of a select field, by text. */
  async selected(name: string): Promise<string[]> {
    return this.field(name).evaluate((s: HTMLSelectElement) => [...s.selectedOptions].map((o) => o.text.trim()));
  }

  // ---------- Delete / Activate ----------

  /** The last confirm() / alert() box the CMS showed matches `text`. */
  expectLastDialog(text: RegExp): void {
    expect(this.page.dialogs.messages.at(-1), 'confirmation box shown').toMatch(text);
  }

  /** Clicks Delete on the record's row and answers the confirmation; `cancel` keeps the record. */
  async delete(text: string, answer: 'confirm' | 'cancel'): Promise<void> {
    const link = this.rowAction(await this.expectInList(text), /^\s*delete\s*$/i);
    if (answer === 'cancel') {
      this.page.dialogs.answer = 'dismiss';
      try {
        await this.click(link);
        await this.page.waitForTimeout(1500);
      } finally {
        this.page.dialogs.answer = 'accept';
      }
    } else {
      await this.reportingDelkeyError(() => this.follow(link, '/delete'));
    }
  }

  /** Clicks Activate or Deactivate on the record's row. */
  async setActive(text: string, active: boolean): Promise<void> {
    await this.follow(this.rowAction(await this.expectInList(text), active ? /^\s*activate\s*$/i : /^\s*deactivate\s*$/i), '/status/');
  }

  /** The row offers the opposite action: Deactivate when active, Activate when inactive. */
  async expectActive(text: string, active: boolean): Promise<void> {
    const row = await this.expectInList(text);
    await expect(this.rowAction(row, active ? /^\s*deactivate\s*$/i : /^\s*activate\s*$/i), active ? 'active: Deactivate offered' : 'inactive: Activate offered').toBeAttached();
  }

  /** Runs `action`; the CMS's #delkey script error it causes is recorded as a finding instead of failing the test. */
  async reportingDelkeyError(action: () => Promise<void>): Promise<void> {
    const before = this.page.problems.length;
    try {
      await action();
    } finally {
      const added = this.page.problems.splice(before);
      const delkey = added.filter((p) => delkeyScriptError.test(p));
      this.page.problems.push(...added.filter((p) => !delkeyScriptError.test(p)));
      if (delkey.length && !test.info().annotations.some((a) => a.type === 'finding' && /#delkey/.test(a.description ?? ''))) {
        finding('CMS script error on this action: "Cannot set properties of null (setting \'href\')" (the page script sets #delkey, which is not on the page). The action itself works.');
      }
    }
  }

  // ---------- clean-up ----------

  /** Deletes every record whose row contains `text` (only ever AUTOTEST records) and checks they are gone. */
  async remove(text: string): Promise<void> {
    if (this.form.remove === 'none') return;
    const before = this.page.problems.length;
    try {
      for (let i = 0; i < 10; i++) {
        const rows = await this.rowsWith(text);
        if ((await rows.count()) === 0) return;
        const row = rows.first();
        if (this.form.remove === 'row') {
          await this.follow(this.rowAction(row, /^\s*delete\s*$/i), '/delete'); // the confirm() box is accepted
        } else {
          // Lists without a Delete button: the delete URL their page script uses.
          const href = (await this.rowAction(row, /^\s*edit\s*$/i).getAttribute('href')) ?? '';
          const id = href.match(/[?&]id=([^&]+)/)?.[1] ?? href.split('/').pop() ?? '';
          await this.page.goto(config.baseUrl + this.form.remove(decodeURIComponent(id)), { waitUntil: 'networkidle' });
        }
      }
      throw new Error(`Could not remove the test records "${text}" from ${this.target.path}.`);
    } finally {
      // Clean-up is not what the case tests: leave out the CMS's #delkey script error it causes.
      const added = this.page.problems.splice(before);
      this.page.problems.push(...added.filter((p) => !delkeyScriptError.test(p)));
    }
  }

  /** Deletes AUTOTEST records left by an earlier run that was stopped before its own clean-up. */
  async removeLeftovers(): Promise<void> {
    await this.remove(AUTOTEST_PREFIX);
  }

  // ---------- existing records (pages without Add), always restored ----------

  /** URL of the first row's Edit link that points at a record (some Food rows have an empty id). */
  async firstEditUrl(): Promise<string> {
    await this.open();
    const hrefs = await this.table.rows.locator('a').filter({ hasText: /^\s*edit\s*$/i }).evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    const href = hrefs.find((h) => h && !/[?&]id=$/.test(h));
    expect(href, 'a record with an Edit link').toBeTruthy();
    return config.baseUrl + href;
  }

  /** Opens `url`, sets one field, saves, reopens and checks the value was kept. */
  async saveField(url: string, name: string, value: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await this.setFields({ [name]: value });
    await this.submit(name);
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await expect(this.field(name), `"${name}" saved as "${value}"`).toHaveValue(value);
  }

  /** Value of a field on an edit page. */
  async readField(url: string, name: string): Promise<string> {
    await this.page.goto(url, { waitUntil: 'networkidle' });
    return this.field(name).inputValue();
  }

  /** Images shown in the list row whose Edit link is `editUrl` (count of images that load). */
  async rowImagesLoaded(editUrl: string): Promise<number> {
    await this.open();
    const href = editUrl.replace(config.baseUrl, '');
    const row = this.table.rows.filter({ has: this.page.locator(`a[href="${href}"]`) }).first();
    return row.locator('img').evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0).length);
  }
}

/** Saves the bytes of an image (by URL) next to the test's output, with the right extension; returns the path. */
export async function saveImage(page: Cms, url: string, name: string): Promise<string> {
  const bytes = await (await page.request.get(new URL(url, config.baseUrl).href)).body();
  const ext = bytes[0] === 0xff && bytes[1] === 0xd8 ? '.jpg' : bytes.subarray(1, 4).toString() === 'PNG' ? '.png' : '.webp';
  const file = test.info().outputPath(`${name}${ext}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  return file;
}
