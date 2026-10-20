// Writes the 250 spec files (tests/cms-tc-NNN-*.spec.ts) and next/test-steps.json from src/test-cases.ts.
// Usage (from the project folder): mkdir next/src; copy src/cms-pages.ts next/src/; node scripts/generate-specs.js . scripts/data/checklist-remarks.json
//   then move next/tests/*.spec.ts to tests/ and use next/test-steps.json with scripts/update-sheet.py; delete next/.
// One-time: writes next/tests/cms-tc-NNN-<submenu>-<feature>.spec.ts, one explicit test per case, every action
// and check its own step(). Also writes next/test-steps.json (case → step titles) for CMS_Test_Cases.xlsx.
const fs = require('fs');
const path = require('path');
const [root, checklistFile] = process.argv.slice(2);
const src = fs.readFileSync(path.join(root, 'src/test-cases.ts'), 'utf8');
const body = src.split('export const cmsCases: CmsCase[] = [')[1].split('\n];')[0].trim().replace(/,\s*$/, '');
const cases = JSON.parse(`[${body}]`);
for (const [n, f] of [[245, 'List'], [246, 'Sort'], [247, 'Search'], [248, 'Download'], [249, 'Pagination'], [250, 'Reset']]) {
  if (!cases.some((x) => x.id === `CMS-TC-${n}`)) cases.push({ id: `CMS-TC-${n}`, menu: 'Reports', submenu: 'Kiosk Transaction Report', feature: f, steps: '', expected: '' });
}
const checklist = JSON.parse(fs.readFileSync(checklistFile, 'utf8'));
const pagesSrc = fs.readFileSync(path.join(root, 'next/src/cms-pages.ts'), 'utf8');
const pageVar = Object.fromEntries([...pagesSrc.matchAll(/^\s+(\w+): page\('([^']+)'/gm)].map((m) => [m[2], m[1]]));
const out = path.join(root, 'next/tests');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50).replace(/-$/, '');
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const existing = {
  'Configurations › Seat Category': ['subcatalt', '`${original} AUTOTEST`', 'Seat Type Alt'],
  'Movies/Cinemas › Movies': ['priority', "original === '98' ? '97' : '98'", 'Priority'],
  'Movies/Cinemas › Movies Person': ['urlToDetails', '`${original} AUTOTEST`', 'Url To Details'],
  'Movies/Cinemas › Cinemas': ['workingHoursAlt', '`${original} AUTOTEST`', 'Working Hours Alt'],
  'Movies/Cinemas › Food Tab': ['nameAlt', '`${original} AUTOTEST`', 'Name Alt'],
  'Configurations › Genre': ['description', '`${original} AUTOTEST`', 'Description'],
  'Offers and Banners › Bank Offers': ['header', '`${original} AUTOTEST`', 'Header'],
};
const withImages = new Set(['Configurations › Payment Modes', 'Configurations › Countries', 'Movies/Cinemas › Experiences', 'Offers and Banners › Offers', 'Offers and Banners › Banners']);
const moreType = { 'Configurations › Ratings': 'RATING', 'Configurations › T & C': 'TNC', 'Configurations › Privacy Policy': 'PRIVACY' };
// Pages whose records the CMS cannot delete: Add is checked up to Submit, Edit works on an existing record.
const validateOnly = new Set(['Configurations › Seat Category', 'Movies/Cinemas › Food Tab', 'Configurations › Genre', 'Offers and Banners › Bank Offers']);
// Downloaded export columns that must be filled (manual checklist remarks).
const exportChecks = {
  'CMS-TC-206': [['filled', '/user\\s*name/i', 'User Name'], ['dates', '/cancel.*date|date.*cancel/i', 'Cancellation Date']],
  'CMS-TC-224': [['filled', '/member\\s*id/i', 'Member ID']],
  'CMS-TC-218': [['filled', '/ip\\s*address/i', 'IP Address']],
};

function action(c) {
  const f = c.feature.trim();
  if (/will test later/i.test(f + c.steps)) return 'deferred';
  const table = [
    ['load', /^(data is loading|list|data loading.*)$/i], ['search', /^search$/i], ['entries', /^show (entries )?filter$/i], ['paging', /^pagination$/i],
    ['sort', /^(sorting|sort grid|grid sorting|sort)$/i], ['theme', /^theme dark \/ light$/i], ['view', /^view$/i], ['viewImage', /^view image$/i],
    ['download', /^download$/i], ['reset', /^reset$/i], ['mobile', /^search with mobile$/i], ['email', /^search with email$/i],
    ['refund', /initiate refund/i], ['sync', /sync|synch|syn data|import/i], ['seatcat', /update seat category/i], ['role', /assign role/i],
    ['resend', /resend password/i], ['add', /^add/i], ['edit', /^edit/i], ['delete', /^delete$/i], ['deactivate', /^deactivate$/i],
  ];
  for (const [a, re] of table) if (re.test(f)) return a;
  throw new Error(`${c.id}: no template for "${f}"`);
}

// ---------- shared pieces ----------

const searchSteps = (o) => `  const total = await step('Note the number of entries ("of z entries")', () => ${o}.table.total());
  const value = await step('Take a value from the first row to search for', () => ${o}.valueFromFirstRow());
  await step(\`Type "\${value}" in the Search box\`, () => ${o}.table.searchFor(value));
  await step('Check every row shown contains the value', () => ${o}.expectRowsContain(value));
  await step('Check the entry count is not higher than before', async () => {
    expect(await ${o}.table.total()).toBeLessThanOrEqual(total);
  });
  await step('Type text that no record has in the Search box', () => ${o}.table.searchFor(ListPage.noSuchRecord));
  await step('Check "No matching records found" is shown', () => ${o}.expectNoMatchShown());
  await step('Clear the Search box', () => ${o}.table.searchFor(''));
  await step('Check all entries are shown again', async () => {
    expect(await ${o}.table.total()).toBe(total);
  });`;

const sortSteps = (o, icons = false) => `  const column = await step('Find the first sortable column', () => ${o}.sortableColumn());${icons ? `
  await step('Check every sortable column shows a sort icon (manual checklist: "Sort icon not showing")', () => ${o}.expectSortIcons());` : ''}
  await step(\`Click the "\${column.name}" header to sort A→Z\`, () => ${o}.sortBy(column, 'asc'));
  await step(\`Check "\${column.name}" is in A→Z order\`, () => ${o}.expectColumnOrder(column, 'asc'));
  await step(\`Click the "\${column.name}" header again to sort Z→A\`, () => ${o}.sortBy(column, 'desc'));
  await step(\`Check "\${column.name}" is in Z→A order\`, () => ${o}.expectColumnOrder(column, 'desc'));`;

const pagingSteps = (o) => `  const total = await step('Note the number of entries ("of z entries")', () => ${o}.table.total());
  const [, lastRow] = await step('Note the rows on the first page ("Showing 1 to y")', () => ${o}.table.range());
  if (total <= lastRow) {
    await step(\`All \${total} entries fit on one page: check Next is disabled\`, async () => {
      await expect(${o}.table.next).toHaveClass(/disabled/);
    });
  } else {
    const firstRow = await step('Note the first row of page 1', async () => (await ${o}.table.rows.first().textContent()) ?? '');
    await step('Click Next', () => ${o}.clickPager(${o}.table.next));
    await step(\`Check page 2 starts at row \${lastRow + 1} with other records\`, async () => {
      await ${o}.expectFirstRowNumber(lastRow + 1);
      expect(await ${o}.table.rows.first().textContent()).not.toBe(firstRow);
    });
    await step('Click Previous', () => ${o}.clickPager(${o}.previous));
    await step('Check page 1 is shown again (starts at row 1)', () => ${o}.expectFirstRowNumber(1));
  }`;

const cleanup = (what = 'record', o = 'records') => `  } finally {
    await step('Clean up: delete the test ${what}', () => ${o}.remove(record.token));
    await step('Check the test ${what} is no longer listed', () => ${o}.expectNotInList(record.token));
  }`;

const createSteps = (o = 'records', what = 'record') => `    await step(\`Create the test ${what} "\${record.name}" with the Add form\`, () => ${o}.create(record));
    await step('Check the test ${what} is in the list', () => ${o}.expectInList(record.token));`;

// ---------- list pages ----------

function listBody(a, c, v) {
  const open = `  const list = new ListPage(cms, pages.${v});
  await step(${q(`Open ${c.menu} › ${c.submenu}`)}, () => list.open());`;
  switch (a) {
    case 'load': {
      const fonts = c.id === 'CMS-TC-023';
      return `${open}
  const [from, to] = await step('Read "Showing x to y of z entries"', () => list.table.range());
  await step('Check no loading indicator is left on the page', async () => {
    await expect(cms.locator('.dataTables_processing:visible')).toHaveCount(0);
  });
  await step('Check the list has records', async () => {
    expect(await list.table.total()).toBeGreaterThan(0);
  });
  await step(\`Check \${to - from + 1} rows are shown, as "Showing \${from} to \${to}" says\`, () => list.expectRowCount(to - from + 1));${fonts ? `
  await step('Check every column uses the same font size (manual checklist: "English Font size is big")', async () => {
    const sizes = await list.columnFontSizes();
    await test.info().attach('font sizes (px)', { body: JSON.stringify(sizes, null, 1), contentType: 'application/json' });
    expect.soft(new Set(Object.values(sizes)).size, \`one font size in all columns: \${JSON.stringify(sizes)}\`).toBe(1);
  });` : ''}`;
    }
    case 'search':
      return `${open}\n${searchSteps('list')}`;
    case 'entries':
      return `${open}
  const total = await step('Note the number of entries ("of z entries")', () => list.table.total());
  const sizes = await step('Read the "Show N entries" options', () => list.entrySizes());
  for (const size of sizes) {
    await step(\`Choose "Show \${size} entries"\`, () => list.showEntries(size));
    await step(\`Check \${Math.min(size, total)} rows are shown\`, () => list.expectRowCount(Math.min(size, total)));
  }`;
    case 'paging':
      return `${open}\n${pagingSteps('list')}`;
    case 'sort':
      return `${open}\n${sortSteps('list')}`;
    case 'theme':
      return `${open}
  const start = await step('Note the current theme', () => list.theme());
  const other = start === 'dark' ? 'light' : 'dark';
  await step(\`Click the Light / Dark switch: the theme changes to \${other}\`, () => list.switchTheme(other));
  await step('Reload the page', async () => {
    await cms.reload({ waitUntil: 'networkidle' });
  });
  await step(\`Check the theme is still \${other}\`, async () => {
    await expect(cms.locator('html')).toHaveAttribute('data-theme', other);
  });
  await step(\`Click the switch again: the theme is back to \${start}\`, () => list.switchTheme(start));`;
    case 'view':
      return `${open}
  await step('Click View on the first record', async () => {
    const row = list.table.rows.first();
    await list.click(row.locator('a, button').filter({ hasText: /view/i }).or(row.locator('[title*="View" i]')).first());
  });
  await step('Check the record details open', async () => {
    await expect(cms.locator('.modal.in, .modal.show').first()).toBeVisible();
  });`;
    case 'viewImage':
      return `${open}
  const src = await step('Find the first record\\'s image (View Image link or picture)', async () => {
    const link = list.table.rows.locator('a').filter({ hasText: /view image/i }).first();
    const img = list.table.rows.locator('img').first();
    const url = (await link.count()) ? await link.getAttribute('href') : await img.getAttribute('src');
    expect(url, 'an image in the list').toBeTruthy();
    return url!;
  });
  await step('Open the image: the file loads and is an image', async () => {
    const res = await cms.request.get(new URL(src, cms.url()).href);
    expect(res.ok(), \`image loads: \${src}\`).toBe(true);
    expect(res.headers()['content-type'], 'it is an image').toMatch(/^image\\//);
  });`;
  }
  throw new Error(`${c.id}: ${a} on a list`);
}

// ---------- reports ----------

function reportBody(a, c, v) {
  const open = `  const report = new ReportPage(cms, pages.${v});
  await step(${q(`Open ${c.menu} › ${c.submenu}`)}, () => report.open());`;
  // The reports default to the last 24 hours, which is often empty on UAT: the tests look at the last 30 days.
  const widen = `  await step('Set the From date 30 days back (the default is the last 24 hours)', () => report.widenDates(30));`;
  const submit = `${widen}
  await step('Press Submit: the results (or "No records found") are shown', () => report.submit());`;
  switch (a) {
    case 'load':
      return `${open}
  await step('Check the filter form is shown', async () => {
    await expect(report.filters()).toBeVisible();
  });
${submit}
  if (await report.hasResults()) {
    await step('Check the results table lists records', async () => {
      expect(await report.resultCount()).toBeGreaterThan(0);
      await test.info().attach('results', { body: \`\${await report.resultCount()} rows on page 1, \${await report.pageCount() || 1} page(s)\`, contentType: 'text/plain' });
    });
    await step('Check the fields of the results are filled in (manual checklist)', () => report.expectFieldsFilled());
  } else {
    await step('No records in the last 30 days: check "No records found" is shown', async () => {
      await expect(report.noRecords()).toBeVisible();
    });
  }`;
    case 'search':
      return `${open}
${submit}
  test.skip(!(await report.hasResults()), 'No records in the last 30 days to search in.');
${searchSteps('report')}`;
    case 'sort':
      return `${open}
${submit}
  test.skip((await report.resultCount()) < 2, 'Fewer than 2 records in the last 30 days: nothing to sort.');
${sortSteps('report', c.id === 'CMS-TC-198')}`;
    case 'paging':
      return `${open}
${submit}
  test.skip(!(await report.hasResults()), 'No records in the last 30 days to page through.');
  // Report results are paged by the CMS itself (page-number bar, 50 results per page), not by the list's Next / Previous.
  const pageCount = await step('Read the page-number bar under the results', () => report.pageCount());
  if (pageCount < 2) {
    await step(\`Only one page of results (\${await report.resultCount()} rows): check no second page is offered\`, async () => {
      expect(pageCount).toBeLessThan(2);
    });
  } else {
    const firstRow = await step('Note the first row of page 1', async () => (await report.table.rows.first().textContent()) ?? '');
    await step('Click page 2', () => report.goToPage(2));
    await step('Check page 2 is highlighted and shows other records', async () => {
      await report.expectCurrentPage(2);
      expect(await report.table.rows.first().textContent()).not.toBe(firstRow);
    });
    await step('Click page 1', () => report.goToPage(1));
    await step('Check page 1 is highlighted and shows the first records again', async () => {
      await report.expectCurrentPage(1);
      expect(await report.table.rows.first().textContent()).toBe(firstRow);
    });
  }`;
    case 'download': {
      const checks = exportChecks[c.id];
      return `${open}
${widen}
  const file = await step('Press Download', () => report.download());
  await step(\`Check the export "\${file.name}" is an .xlsx / .csv / .pdf file and not empty\`, async () => report.expectExportFile(file));
  if (/\\.(xlsx|csv)$/i.test(file.name)) {
    const table = await step('Open the export and read its columns', () => report.readExport(file));
    await step(\`Check the export has a header row and \${table.rows.length} data rows\`, async () => {
      expect(table.headers.length, 'columns in the export').toBeGreaterThan(1);
    });${(checks ?? []).map(([kind, re, label]) => kind === 'filled' ? `
    await step('Check the export has a "${label}" column filled in every row (manual checklist)', async () => report.expectExportColumnFilled(table, ${re}, '${label}'));` : `
    await step('Check "${label}" in the export is a proper date in every row (manual checklist)', async () => report.expectExportColumnDates(table, ${re}, '${label}'));`).join('')}
  }`;
    }
    case 'reset':
      return `${open}
  // The manual checklist marks Reset "NA" on reports without a Reset button (suggestion given to add one).
  test.skip(!(await report.resetButton().isVisible()), 'This report has no Reset button (manual checklist: NA, suggestion given).');
  await step('Type "RESET-CHECK" in a filter field', () => report.textFilter().fill('RESET-CHECK'));
  await step('Press Reset', () => report.resetButton().click());
  await step('Check the filter field is empty again', async () => {
    await expect(report.textFilter()).toHaveValue('');
  });`;
    case 'mobile':
    case 'email': {
      const env = a === 'mobile' ? 'customerMobile' : 'customerEmail';
      const field = a === 'mobile' ? 'mobilePhone' : 'email';
      return `  const value = config.${env};
  test.skip(!value, 'Set ${a === 'mobile' ? 'CMS_CUSTOMER_MOBILE' : 'CMS_CUSTOMER_EMAIL'} in .env to run this case.');
${open}
  await step(\`Enter the customer's ${a} "\${value}"\`, () => report.filters().locator('[name="${field}"]').fill(value));
  await step('Press Submit: the results table is shown', () => report.submit());
  await step('Check the customer is found', async () => {
    await expect(report.table.rows.first()).toContainText(value);
  });
  await step('Check the customer\\'s details are filled in (manual checklist: "few fields are coming as empty")', () => report.expectFieldsFilled());`;
    }
  }
  throw new Error(`${c.id}: ${a} on a report`);
}

// ---------- write cases on the test's own record ----------

function writeBody(a, c, v) {
  const name = `${c.menu} › ${c.submenu}`;
  const head = `  const records = new RecordPage(cms, pages.${v});
  const record = records.newRecord(${q(c.id)});`;
  const leftovers = `  await step('Remove AUTOTEST records left by earlier runs', () => records.removeLeftovers());`;
  switch (a) {
    case 'add': {
      if (name === 'Movies/Cinemas › Food') {
        return `  // Manual checklist: "Yes - add food removed": Add Food was taken out of the CMS on purpose.
  const list = new ListPage(cms, pages.${v});
  await step('Open Movies/Cinemas › Food', () => list.open());
  await step('Check Add Food is not offered (removed on purpose)', async () => {
    await expect(cms.locator('a, button').filter({ hasText: /^\\s*add food\\s*$/i })).toHaveCount(0);
  });`;
      }
      const openAdd = `  await step(${q(`Open ${name}`)}, () => records.open());
  await step('Click the Add button', () => records.clickAdd());
  await step('Check the Add form is shown', () => records.expectAddFormOpen());
  await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());`;
      const refused = `  const before = await step('Press Submit with the required fields empty', () => records.pressSubmit());
  await step('Check the form is refused and the required fields are flagged', () => records.expectRefused(before, 'Required fields empty'));`;
      if (validateOnly.has(name)) {
        return `${head}
  // The CMS cannot delete ${c.submenu} records, so the form is checked up to Submit and not saved (nothing is left behind).
${openAdd}
${refused}
  await step(\`Fill the form with valid data for "\${record.name}"\`, () => records.fill(records.values(record)));
  await step('Check the form accepts the data (all required fields valid)', () => records.expectFormValid());`;
      }
      const lines = [head, leftovers, openAdd];
      if (moreType[name]) {
        lines.push(`  await step('Check More type is preselected as ${moreType[name]} (manual checklist)', async () => {
    await expect.soft(records.field('moreType')).toHaveValue('${moreType[name]}');
  });`);
      }
      if (name === 'Configurations › Ratings') {
        lines.push(`  await step('Check the description editor shows its toolbar icons (manual checklist: "icons are not displaying")', () => records.expectEditorIconsShown());`);
      }
      lines.push(refused, '  try {');
      if (name === 'User Management › Users') {
        lines.push(`    const badEmail = \`autotest-\${record.token.toLowerCase()}-no-at-sign\`;
    await step(\`Fill the form with an e-mail without @ ("\${badEmail}")\`, () => records.fill({ ...records.values(record), email: badEmail }));
    await step('Press Submit', () => records.pressSubmit());
    await step('Check no user with that e-mail was saved', () => records.expectNotInList(badEmail));
    await step('Open the Add form again', () => records.openAddForm());`);
      }
      lines.push(`    await step(\`Fill the form with valid data for "\${record.name}"\`, () => records.fill(records.values(record)));
    await step('Press Submit: the CMS saves the record and leaves the form', () => records.submit());
    await step('Search the new record in the list: it is listed once', () => records.expectInList(record.token));`);
      if (withImages.has(name)) lines.push(`    await step('Check its uploaded images show in the list and load (manual checklist)', () => records.expectRowImagesShown(record));`);
      lines.push(cleanup());
      return lines.join('\n');
    }
    case 'edit': {
      if (name === 'Movies/Cinemas › Food') return foodImageBody(v);
      if (existing[name]) return existingBody(c, v, name);
      const required = name !== 'Configurations › Email/SMS Template';
      const also = name === 'Offers and Banners › Offers';
      const lines = [head, `  const { field } = records.form.edit;
  const newValue = records.form.edit.value(record);`, leftovers, '  try {', createSteps(),
        `    const editUrl = await step('Click Edit on the test record', () => records.openEdit(record.token));
    await step('Check the Edit form shows the saved data (manual checklist: "No data populating in edit")', () => records.expectEditShows(records.values(record)));
    await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());`];
      if (required) {
        lines.push(`    await step(\`Clear the required field "\${field}"\`, () => records.setFields({ [field]: '' }));
    const before = await step('Press Submit', () => records.pressSubmit());
    await step('Check the form is refused', () => records.expectRefused(before, \`"\${field}" empty\`));
    await step('Reload the Edit form', async () => {
      await cms.goto(editUrl, { waitUntil: 'networkidle' });
    });`);
      }
      lines.push(`    await step(\`Change "\${field}" to "\${newValue}"\`, () => records.setFields({ [field]: newValue }));`);
      if (also) lines.push(`    await step('Change the platform to Android + iOS', () => records.setFields(records.form.edit.also!));`);
      lines.push(`    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit());`);
      if (name !== 'Configurations › Configuration') {
        lines.push(`    await step('Check the list shows the new value', async () => {
      await expect(await records.expectInList(record.token)).toContainText(newValue);
    });`);
      }
      lines.push(`    await step('Reopen the record', async () => {
      await cms.goto(editUrl, { waitUntil: 'networkidle' });
    });
    await step(\`Check "\${field}" kept the new value\`, async () => {
      await expect(records.field(field)).toHaveValue(newValue);
    });`);
      if (also) lines.push(`    await step('Check the platform kept Android + iOS (manual checklist: "Platform selected is not updating")', async () => {
      expect.soft(await records.selected('platform')).toEqual(['ANDROID', 'IOS']);
    });`);
      lines.push(cleanup());
      return lines.join('\n');
    }
    case 'delete':
      if (validateOnly.has(name)) {
        // No Delete button and no working delete URL: a test record could never be removed, so none is created.
        return `  // The ${c.submenu} list has no Delete button and its page script's delete URL answers 404 (11 Oct 2026),
  // so the test does not create a record (it could not be removed); it checks Delete is offered on the list.
  const list = new ListPage(cms, pages.${v});
  await step(${q(`Open ${name}`)}, () => list.open());
  await step('Check Delete is offered on the first record', async () => {
    await expect(list.rowAction(list.table.rows.first(), /^\\s*delete\\s*$/i), 'Delete button in the row').toBeAttached({ timeout: 5_000 });
  });`;
      }
      return [head, leftovers, '  try {', createSteps(),
        `    const deleteButton = async () => records.rowAction(await records.expectInList(record.token), /^\\s*delete\\s*$/i);
    await step('Check Delete is offered on the test record', async () => {
      await expect(await deleteButton(), 'Delete button in the row').toBeAttached({ timeout: 5_000 });
    });
    await step('Click Delete and press Cancel on the confirmation', () => records.delete(record.token, 'cancel'));
    await step('Check the confirmation asked "Are you sure you want to delete"', async () => records.expectLastDialog(/^confirm: .*delete/i));
    await step('Check the test record is still listed', () => records.expectInList(record.token));
    await step('Click Delete and press OK on the confirmation', () => records.delete(record.token, 'confirm'));
    await step('Check the test record is no longer listed', () => records.expectNotInList(record.token));`, cleanup()].join('\n');
    case 'deactivate':
      return [head, leftovers, '  try {', `    // Created inactive, so it never shows in the apps; activated for a moment so it can be deactivated.`, createSteps(),
        `    await step('Check it is inactive: Activate is offered', () => records.expectActive(record.token, false));
    await step('Click Activate', () => records.setActive(record.token, true));
    await step('Check it is active: Deactivate is offered', () => records.expectActive(record.token, true));
    await step('Click Deactivate', () => records.setActive(record.token, false));
    await step('Check it is inactive again: Activate is offered', () => records.expectActive(record.token, false));`, cleanup()].join('\n');
  }
  throw new Error(`${c.id}: ${a}`);
}

function existingBody(c, v, name) {
  const [field, change, label] = existing[name];
  const foodTab = name === 'Movies/Cinemas › Food Tab';
  return `  // ${c.submenu} has no Add${validateOnly.has(name) ? ' / Delete' : ''}: an existing record is edited and its original value is always put back.
  const records = new RecordPage(cms, pages.${v});
  const url = await step(${q(`Open ${name} and take the first record's Edit link`)}, () => records.firstEditUrl());
  const original = await step('Open its Edit form and note the current ${label}', () => records.readField(url, '${field}'));
  await step('Check every multi-line box has a readable size (long text 8-25 lines, short fields 3-10)', () => records.expectTextBoxesReadable());
  const changed = ${change};
  await test.info().attach('record edited', { body: \`\${url}\\n${field} = "\${original}" (put back afterwards)\`, contentType: 'text/plain' });${foodTab ? `
  const imagesBefore = await step('Note the tab images shown in the list', () => records.rowImagesLoaded(url));` : ''}
  try {
    await step(\`Change ${label} to "\${changed}"\`, async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
      await records.setFields({ ${field}: changed });
    });
    await step('Press Submit: the CMS saves the change and leaves the form', () => records.submit('${field}'));
    await step('Reopen the record', async () => {
      await cms.goto(url, { waitUntil: 'networkidle' });
    });
    await step(\`Check ${label} kept "\${changed}"\`, async () => {
      await expect(records.field('${field}')).toHaveValue(changed);
    });${foodTab ? `
    await step('Check the tab image still shows in the list (manual checklist: "old image also not showing")', async () => {
      expect.soft(await records.rowImagesLoaded(url)).toBe(imagesBefore);
    });` : ''}
  } finally {
    await step(\`Put ${label} back to "\${original}" and save\`, () => records.saveField(url, '${field}', original));
  }`;
}

function foodImageBody(v) {
  return `  // The Food edit form only has the item and pop-up images: the current item image is replaced and then
  // uploaded back, and the test checks the original image is shown again.
  const records = new RecordPage(cms, pages.${v});
  const image = 'td:nth-child(5) a[href], td:nth-child(5) img[src]'; // "Item Image" column
  await step('Open Movies/Cinemas › Food', () => records.open());
  const { foodId, editUrl } = await step('Pick a food item that has an item image', async () => {
    const row = records.table.rows.filter({ has: cms.locator(image) }).filter({ has: cms.locator('a[href*="edit?id="]:not([href$="id="])') }).first();
    await expect(row, 'a food item with an item image').toBeVisible();
    const href = (await records.rowAction(row, /^\\s*edit\\s*$/i).getAttribute('href')) ?? '';
    return { foodId: decodeURIComponent(href.match(/id=([^&]+)/)?.[1] ?? ''), editUrl: config.baseUrl + href };
  });
  const imageUrl = async () => (await records.rowsWith(foodId)).first().locator(image).first().evaluate((e) => e.getAttribute('href') || e.getAttribute('src') || '');
  const shownImage = async () => (await cms.request.get(new URL(await imageUrl(), config.baseUrl).href)).body();
  const original = await step(\`Save a copy of the current item image of food \${foodId}\`, async () => saveImage(cms, await imageUrl(), 'original-item-image'));
  await test.info().attach(\`original item image of food \${foodId}\`, { path: original });
  try {
    await step('Open the food item\\'s Edit form', async () => {
      await cms.goto(editUrl, { waitUntil: 'networkidle' });
    });
    await step('Choose a new item image', () => cms.locator('input[type="file"][name="itemImage"]').setInputFiles(testImage(300, 300)));
    await step('Press Submit: the CMS saves it and leaves the form', () => records.submit('itemImage'));
    await step('Check the list shows the new item image', async () => {
      expect((await shownImage()).equals(fs.readFileSync(original)), 'item image changed').toBe(false);
    });
  } finally {
    await step('Put the original item image back: open Edit, choose it and Submit', async () => {
      await cms.goto(editUrl, { waitUntil: 'networkidle' });
      await cms.locator('input[type="file"][name="itemImage"]').setInputFiles(original);
      await records.submit('itemImage');
    });
    await step('Check the list shows the original item image again', async () => {
      expect((await shownImage()).equals(fs.readFileSync(original)), 'original image shown').toBe(true);
    });
  }`;
}

// ---------- one-off cases ----------

function specialBody(a, c, v) {
  if (a === 'sync') {
    const label = /import/i.test(c.feature) ? 'Import Data' : /config/i.test(c.feature) ? 'Sync Config' : /movie/i.test(c.feature) ? 'Sync Movies' : 'Sync Data';
    const movies = label === 'Sync Movies';
    return `  // A real ${label} on UAT (approved 11 Oct 2026). The CMS answers the request when the sync has finished.
  test.setTimeout(600_000);
  const list = new ListPage(cms, pages.${v});
  await step(${q(`Open ${c.menu} › ${c.submenu}`)}, () => list.open());
  const button = cms.locator('a').filter({ hasText: /^\\s*${label.replace(' ', '\\s+')}\\s*$/i }).first();
  await step('Check the ${label} button is shown', async () => {
    await expect(button).toBeVisible();
  });
  await step('Press ${label} and wait until the CMS has finished', async () => {
    const href = (await button.getAttribute('href')) ?? '';
    // The click does not wait for the page to load: the import / sync can take minutes, the response is awaited instead.
    await Promise.all([cms.waitForResponse((r) => new URL(r.url()).pathname === href, { timeout: 540_000 }), button.click({ noWaitAfter: true })]);
    // The CMS may redirect once more after answering: wait for the page that stays, then read its message.
    await cms.waitForLoadState('load', { timeout: 120_000 }).catch(() => {});
    await cms.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => {});
    const message = await cms.locator('.alert, .msg, #msg').allTextContents().catch(() => ['(page still loading)']);
    await test.info().attach('after ${label}', { body: \`\${cms.url()}\\n\${message.join('\\n')}\`, contentType: 'text/plain' });
  });
  await step('Check no error page is shown and the session is still signed in', async () => {
    await expect(cms.locator('body')).not.toContainText(/whitelabel error page|exception|internal server error/i);
    expect(cms.url()).not.toMatch(/\\/login/);
  });${movies ? `
  await step('Check it stays in Movies/Cinemas › Movies (manual checklist: it moves to the Configurations menu)', async () => {
    expect.soft(new URL(cms.url()).pathname).toBe('/admin/movie/list');
  });` : ''}
  await step('Open the list again: it loads with records', async () => {
    await list.open();
    expect(await list.table.total()).toBeGreaterThan(0);
  });`;
  }
  if (a === 'seatcat') {
    return `  // A real seat-category update for the first cinema on UAT (approved 11 Oct 2026).
  const list = new ListPage(cms, pages.${v});
  await step('Open Movies/Cinemas › Cinemas', () => list.open());
  const cinema = await step('Note the first cinema', async () => (await list.table.rows.first().locator('td').nth(2).textContent())?.trim());
  await step(\`Click Update SeatCat for \${cinema}\`, async () => {
    await list.click(list.rowAction(list.table.rows.first(), /update seatcat/i));
    await cms.waitForLoadState('networkidle');
  });
  await step('Check the CMS confirms the update ("Updated")', async () => {
    await expect(cms.locator('.alert, .msg, #msg, body').filter({ hasText: /updated/i }).first()).toBeVisible();
  });`;
  }
  if (a === 'role') {
    return `  const users = new RecordPage(cms, pages.${v});
  const record = users.newRecord(${q(c.id)});
  const { email, password } = users.values(record) as { email: string; password: string };
  const role = 'Report_Admin'; // only ROLE_REPORT
  await step('Remove AUTOTEST users left by earlier runs', () => users.removeLeftovers());
  try {
${createSteps('users', 'user')}
    await step('Click Assign Role Access on the test user', async () => {
      await users.click(users.rowAction(await users.expectInList(record.token), /assign role access/i));
      await cms.waitForLoadState('networkidle');
    });
    await step(\`Choose the role access "\${role}"\`, () => users.setFields({ roles: role }));
    await step('Press Update: the CMS confirms and returns to the Users list', async () => {
      await cms.locator('a, button').filter({ hasText: /^\\s*update\\s*$/i }).first().click();
      await cms.waitForURL(/\\/admin\\/user\\/list/, { timeout: 60_000 });
    });
    await step(\`Check the list shows the role "\${role}" for the test user\`, async () => {
      await expect(await users.expectInList(record.token)).toContainText(role);
    });
    await step('Reopen Assign Role Access', async () => {
      await users.click(users.rowAction(await users.expectInList(record.token), /assign role access/i));
      await cms.waitForLoadState('networkidle');
    });
    await step('Check the current role is selected (manual checklist: "Current roles are not listing")', async () => {
      expect.soft(await users.selected('roles')).toContain(role);
    });
    await step('Sign in as the test user and check only its role\\'s pages are open to it', async () => {
      const context = await cms.context().browser()!.newContext({ storageState: { cookies: [], origins: [] }, baseURL: config.baseUrl });
      try {
        const user = await context.newPage();
        await user.goto('/login');
        await user.locator('#username').fill(email);
        await user.locator('#password').fill(password);
        await user.getByRole('button', { name: 'Sign in' }).click();
        await user.waitForLoadState('networkidle');
        expect(user.url(), 'test user signed in').not.toMatch(/\\/login/);
        await expect(user.locator('.profile_info, .user-profile').first(), 'signed in as the test user').toContainText(/autotest/i);
        await user.goto('/admin/report/user/list', { waitUntil: 'networkidle' });
        await expect(user.locator('body'), 'report page open to the role').toContainText(/user report/i);
        await user.goto('/admin/user/list', { waitUntil: 'networkidle' });
        await test.info().attach('Users page as the test user', { body: await user.screenshot({ fullPage: true }), contentType: 'image/png' });
        await expect(user.locator('#datatable-responsive tbody tr'), 'Users list not open to a ROLE_REPORT user').toHaveCount(0);
      } finally {
        await context.close();
      }
    });
${cleanup('user', 'users')}`;
  }
  if (a === 'resend') {
    return `  // The password e-mail goes only to the test's own AUTOTEST user, never to a real account.
  // (Manual checklist: "Resend Password mail not receiving": the mailbox cannot be checked from here.)
  const users = new RecordPage(cms, pages.${v});
  const record = users.newRecord(${q(c.id)});
  const resend = async () => users.rowAction(await users.expectInList(record.token), /re-?send password/i);
  await step('Remove AUTOTEST users left by earlier runs', () => users.removeLeftovers());
  try {
${createSteps('users', 'user')}
    await step('Click Re-send Password and press Cancel on the confirmation', async () => {
      cms.dialogs.answer = 'dismiss';
      try {
        await users.click(await resend());
        await cms.waitForTimeout(1500);
      } finally {
        cms.dialogs.answer = 'accept';
      }
    });
    await step('Check the confirmation asked "Are you sure you want to Resend Password"', async () => users.expectLastDialog(/^confirm: .*resend password/i));
    await step('Click Re-send Password and press OK', async () => users.reportingDelkeyError(async () => users.follow(await resend(), '/resendEmail/')));
    await step('Check the CMS sent it without an error page', async () => {
      await expect(cms.locator('body')).not.toContainText(/whitelabel error page|exception|internal server error/i);
      await test.info().attach('page after resend', { body: \`\${cms.url()}\\n\${(await cms.locator('.alert, .msg, #msg').allTextContents()).join('\\n')}\`, contentType: 'text/plain' });
    });
${cleanup('user', 'users')}`;
  }
  if (a === 'refund') {
    return `  // A real refund through the payment gateway on UAT (approved 11 Oct 2026); it cannot be undone.
  const report = new ReportPage(cms, pages.${v});
  await step('Open Refund › Transaction Report', () => report.open());
  await step('Press Submit with the default filters: the break transactions are listed', () => report.submit());
  const statusColumn = await step('Find the "Refund Status" column', async () => {
    const head = (await report.table.table.locator('thead th').allTextContents()).map((t) => t.trim());
    expect(head).toContain('Refund Status');
    return head.indexOf('Refund Status') + 1;
  });
  const index = await step('Find a transaction that has no refund yet', async () => {
    const statuses = await report.table.rows.locator(\`td:nth-child(\${statusColumn})\`).allTextContents();
    return statuses.findIndex((s) => /^\\s*(null)?\\s*$/.test(s));
  });
  test.skip(index < 0, 'No break transaction waiting for a refund.');
  const row = report.table.rows.nth(index);
  const id = await row.locator('input[type="checkbox"]').getAttribute('value');
  await test.info().attach('refunded transaction', { body: \`\${id}: \${(await row.textContent())?.replace(/\\s+/g, ' ')}\`, contentType: 'text/plain' });
  await step(\`Tick transaction \${id}\`, () => row.locator('input[type="checkbox"]').check());
  await step('Click Initiate Refund: the comment box opens', async () => {
    await cms.locator('#btn').filter({ hasText: /initiate refund/i }).click();
    await expect(cms.locator('#userCommentmodal')).toBeVisible();
  });
  await step('Enter the comment "AUTOTEST ${c.id}"', () => cms.locator('#userCommentmodal').locator('textarea, input[type="text"]').first().fill(${q(`AUTOTEST ${c.id}`)}));
  await step('Press Save and wait for the CMS\\'s answer', async () => {
    await cms.locator('#userCommentmodal').getByRole('button', { name: /^save$/i }).click();
    await expect.poll(() => cms.dialogs.messages.length, { message: 'the CMS answers the refund', timeout: 120_000 }).toBeGreaterThan(0);
    await cms.waitForLoadState('networkidle').catch(() => {});
  });
  await step('Check the answer is not an error (manual checklist: "error showing")', async () => {
    expect(cms.dialogs.messages.at(-1)).not.toMatch(/error|fail|not refunded|try again/i);
  });
  await step('Press Submit again', () => report.submit());
  await step(\`Check transaction \${id} shows a refund status\`, async () => {
    const same = report.table.rows.filter({ has: cms.locator(\`input[value="\${id}"]\`) });
    if (await same.count()) await expect(same.locator(\`td:nth-child(\${statusColumn})\`)).not.toHaveText(/^\\s*(null)?\\s*$/);
  });`;
  }
  throw new Error(`${c.id}: ${a}`);
}

function dashboardBody() {
  return `  await step('Open the Dashboard', () => openPage(cms, pages.dashboard.path));
  await step('Check no error page is shown', async () => {
    await expect(cms.locator('body')).not.toContainText(/whitelabel error|exception|404|not found/i);
  });
  await step('Check no loading indicator is left on the page', async () => {
    await expect(cms.locator('.loading:visible, .spinner:visible')).toHaveCount(0, { timeout: 30_000 });
  });
  const jobs = await step('Check the scheduler table lists the jobs', async () => {
    const rows = cms.locator('table tbody tr').filter({ has: cms.locator('td') });
    expect(await rows.count(), 'scheduler jobs listed').toBeGreaterThan(0);
    return rows.evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.textContent ?? '').trim())));
  });
  await step('Check every job ran successfully in the last 24 hours (manual checklist: "some schedulers date is old")', async () => {
    // "Last Success Run" is shown as dd/mm/yyyy, hh:mm:ss AM (Kuwait time, same as the QA PC).
    const parse = (s: string) => {
      const m = s.match(/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4}),?\\s+(\\d{1,2}):(\\d{2}):(\\d{2})\\s*(AM|PM)/i);
      if (!m) return NaN;
      const h = (Number(m[4]) % 12) + (/pm/i.test(m[7]) ? 12 : 0);
      return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h, Number(m[5]), Number(m[6])).getTime();
    };
    for (const [job, , , , lastSuccess] of jobs) {
      expect.soft((Date.now() - parse(lastSuccess)) / 3_600_000, \`\${job}: last success \${lastSuccess} (hours ago)\`).toBeLessThan(24);
    }
  });`;
}

// ---------- write the files ----------

const stepsOut = {};
let written = 0;
for (const c of cases) {
  const a = action(c);
  const key = c.submenu ? `${c.menu} › ${c.submenu}` : c.menu;
  const v = pageVar[key];
  if (!v) throw new Error(`no page var for ${key}`);
  const title = `${c.id} ${c.submenu || c.menu} – ${c.feature.trim()}`;
  let t = null;
  if (a === 'deferred') t = null;
  else if (c.menu === 'Dashboard') t = dashboardBody();
  else if (['sync', 'seatcat', 'role', 'resend', 'refund'].includes(a)) t = specialBody(a, c, v);
  else if (['add', 'edit', 'delete', 'deactivate'].includes(a)) t = writeBody(a, c, v);
  else if (c.menu === 'Reports' || c.menu === 'Refund') t = reportBody(a, c, v);
  else t = listBody(a, c, v);

  const code = t ?? '';
  const imports = [];
  if (/fs\./.test(code)) imports.push(`import fs from 'node:fs';`);
  const fixtures = ['test', /expect[.(]/.test(code) ? 'expect' : '', 'sheet', t ? 'expectNoCmsErrors' : '', /openPage\(/.test(code) ? 'openPage' : ''].filter(Boolean);
  imports.push(`import { ${fixtures.join(', ')} } from '../src/fixtures';`);
  if (t) imports.push(`import { pages } from '../src/cms-pages';`);
  if (/ListPage/.test(code)) imports.push(`import { ListPage } from '../src/list-page';`);
  if (/new RecordPage/.test(code)) imports.push(`import { RecordPage${/saveImage/.test(code) ? ', saveImage' : ''} } from '../src/record-page';`);
  if (/new ReportPage/.test(code)) imports.push(`import { ReportPage } from '../src/report-page';`);
  if (/config\./.test(code)) imports.push(`import { config } from '../src/config';`);
  if (/testImage\(/.test(code)) imports.push(`import { testImage } from '../src/test-image';`);
  const header = [
    `// ${c.id} ${key} – ${c.feature.trim()}: one CMS test case (${Number(c.id.slice(-3)) > 244 ? 'manual checklist "cms test.xlsx"' : 'CMS_Test_Cases.xlsx'}).`,
    checklist[c.id] ? `// Manual checklist: ${checklist[c.id]}` : '',
  ].filter(Boolean);
  const file = path.join(out, `${c.id.toLowerCase()}-${slug(c.submenu || c.menu)}-${slug(c.feature)}.spec.ts`);
  if (!t) {
    fs.writeFileSync(file, `${header.join('\n')}\n${imports.join('\n')}\n\n// Deferred in the sheet: "${c.feature.trim()}".\ntest.skip(${q(title)}, sheet(${q(c.id)}), async () => {});\n`);
    stepsOut[c.id] = { title, steps: [], deferred: true };
  } else {
    fs.writeFileSync(file, `${header.join('\n')}\n${imports.join('\n')}\n\ntest(${q(title)}, sheet(${q(c.id)}), async ({ cms, step }) => {\n${t}\n  expectNoCmsErrors(cms);\n});\n`);
    const steps = [...code.matchAll(/step\((`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*')/g)].map((m) => m[1].slice(1, -1).replace(/\\'/g, "'"));
    stepsOut[c.id] = { title, steps };
  }
  written++;
}
fs.writeFileSync(path.join(root, 'next/test-steps.json'), JSON.stringify(stepsOut, null, 1));
console.log(written, 'specs written');
