// Probe (not a test case): opens every page in src/cms-pages.ts and each page's Add form, and saves headings,
// tables, buttons and form fields to inspect/pages.json plus a screenshot per page. Used to map the Add/Edit forms
// for the write cases. Never presses Save / Submit on a form.
import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { cmsPages } from '../src/cms-pages';
import { config } from '../src/config';

const out = path.join(__dirname, '..', 'inspect');

test('probe CMS pages and Add forms', async ({ page }) => {
  fs.mkdirSync(out, { recursive: true });
  const report: Record<string, unknown> = {};
  const describe = () =>
    page.evaluate(() => {
      const text = (e: Element | null) => (e?.textContent ?? '').trim().replace(/\s+/g, ' ');
      return {
        url: location.pathname,
        headings: [...document.querySelectorAll('h1,h2,h3,h4,.page-title,.x_title,.modal-title')].map(text).filter(Boolean).slice(0, 8),
        tables: [...document.querySelectorAll('table')].map((t) => ({ id: t.id, head: [...t.querySelectorAll('thead th')].map(text), firstRow: text(t.querySelector('tbody tr')).slice(0, 200) })),
        rowButtons: [...(document.querySelector('tbody tr')?.querySelectorAll('a,button') ?? [])].map((b) => `${text(b) || b.getAttribute('title') || b.className} -> ${b.getAttribute('href') ?? b.getAttribute('onclick') ?? ''}`),
        buttons: [...document.querySelectorAll('button, a.btn, input[type=button], input[type=submit], input[type=reset]')].map((b) => text(b) || (b as HTMLInputElement).value || b.getAttribute('title') || '').filter(Boolean),
        fields: [...document.querySelectorAll('input, select, textarea')].filter((i) => (i as HTMLInputElement).type !== 'hidden').map((i) => ({
          tag: i.tagName.toLowerCase(), type: i.getAttribute('type'), name: i.getAttribute('name'), id: i.id, required: i.hasAttribute('required'),
          label: text(i.closest('label') ?? document.querySelector(`label[for="${i.id}"]`)).slice(0, 60),
          options: i.tagName === 'SELECT' ? [...(i as HTMLSelectElement).options].map((o) => o.text.trim()).slice(0, 15) : undefined,
        })),
      };
    });

  for (const [key, p] of Object.entries(cmsPages)) {
    const name = key.replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '');
    await page.goto(config.baseUrl + p.path, { waitUntil: 'networkidle' }).catch(() => {});
    report[key] = { list: await describe() };
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    if (p.addButton) {
      const add = page.locator('a, button').filter({ hasText: p.addButton }).first();
      if (await add.isVisible().catch(() => false)) {
        await add.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        (report[key] as Record<string, unknown>).addForm = await describe();
        await page.screenshot({ path: path.join(out, `${name}-add.png`), fullPage: true });
      }
    }
    console.log('probed', key);
  }
  fs.writeFileSync(path.join(out, 'pages.json'), JSON.stringify(report, null, 1));
});
