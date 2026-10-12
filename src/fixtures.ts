// Shared test fixture: `cms`, a signed-in CMS page that records server errors, broken page files and script
// errors (each test checks them at the end with expectNoCmsErrors), answers the CMS's confirm() boxes and attaches
// the final screen to every test (the dashboard shows it).
import { test as base, expect, type Page, type TestDetails } from '@playwright/test';
import { config } from './config';
import { allCases } from './extra-cases';
import { signIn } from './sign-in';

/** Answers the CMS's confirm() boxes ('accept' unless a test says otherwise) and keeps every alert / confirm text. */
export class Dialogs {
  answer: 'accept' | 'dismiss' = 'accept';
  readonly messages: string[] = [];
  constructor(page: Page) {
    page.on('dialog', async (d) => {
      this.messages.push(`${d.type()}: ${d.message()}`);
      await (d.type() === 'confirm' && this.answer === 'dismiss' ? d.dismiss() : d.accept());
    });
  }
}

/** Signed-in CMS page. `problems`: server errors, missing page files and script errors seen while it was open. */
export type Cms = Page & { problems: string[]; dialogs: Dialogs };

/** Runs a named test step and attaches a screenshot taken at its end (also when it fails); returns the step's result. */
export type Step = <T>(title: string, body: () => Promise<T>) => Promise<T>;

export const test = base.extend<{ cms: Cms; step: Step }>({
  // `step`: like test.step(), plus a screenshot named after the step (the dashboard shows it under that step).
  // Screenshots are saved as files, not inside the JSON report, which would grow to hundreds of MB.
  step: async ({ page }, use, testInfo) => {
    let count = 0;
    await use(<T>(title: string, body: () => Promise<T>) =>
      base.step(title, async () => {
        try {
          return await body();
        } finally {
          const file = testInfo.outputPath(`step-${String(++count).padStart(2, '0')}.png`);
          // The screenshot is evidence, not a check: if the page cannot be captured within 20 s, the test carries on.
          if (await page.screenshot({ path: file, timeout: 20_000 }).then(() => true, () => false)) {
            await testInfo.attach(title, { path: file, contentType: 'image/png' });
          }
        }
      }),
    );
  },
  cms: async ({ page }, use, testInfo) => {
    const problems: string[] = [];
    page.on('response', (r) => {
      // 4xx on page files (scripts, styles) and any 5xx are CMS defects worth reporting.
      if (r.status() >= 500 || (r.status() === 404 && /\.(js|css)(\?|$)/.test(r.url()))) {
        problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(config.baseUrl, '')}`);
      }
    });
    page.on('pageerror', (e) => problems.push(`script error: ${e.message}`));
    const cms = Object.assign(page, { problems, dialogs: new Dialogs(page) });
    await use(cms);
    await testInfo.attach('final screen', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' }).catch(() => {});
    if (cms.dialogs.messages.length) await testInfo.attach('CMS messages', { body: cms.dialogs.messages.join('\n'), contentType: 'text/plain' });
    if (problems.length) await testInfo.attach('CMS errors', { body: problems.join('\n'), contentType: 'text/plain' });
  },
});

export { expect };

/** The case's sheet steps, expected result and manual-checklist remark, shown with the test; tagged with its menu. */
export function sheet(id: string): TestDetails {
  const c = allCases.find((x) => x.id === id);
  if (!c) throw new Error(`${id} is not in src/test-cases.ts or src/extra-cases.ts.`);
  return {
    tag: `@${c.menu.replace(/[^a-z0-9]+/gi, '-')}`,
    annotation: [
      { type: 'steps', description: c.steps },
      { type: 'expected', description: c.expected },
    ],
  };
}

/** A note on the test (shown in the report and dashboard): a CMS issue that does not fail the case. */
export function finding(description: string): void {
  test.info().annotations.push({ type: 'finding', description });
}

/** Last check of every test: no server errors, missing page files or script errors while the CMS was open. */
export function expectNoCmsErrors(cms: Cms): void {
  expect(cms.problems, 'no server errors, missing page files or script errors').toEqual([]);
}

/** Sign-ins after the CMS ended the session during a run (at most a few per worker, so the account is never locked). */
let reSignIns = 0;

/**
 * Opens a CMS page. If the CMS has ended the session (sent to the sign-in page: session timeout, or the same account
 * signed in elsewhere), signs in again once and saves the new session for the next tests.
 */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(config.baseUrl + path, { waitUntil: 'networkidle' });
  if (/\/login(\?|$)/.test(page.url()) && reSignIns < 5) {
    reSignIns++;
    test.info().annotations.push({ type: 'session', description: `The CMS ended the session (sent to the sign-in page at ${new Date().toLocaleTimeString()}); signed in again.` });
    await signIn(page);
    await page.goto(config.baseUrl + path, { waitUntil: 'networkidle' });
  }
  expect(page.url(), 'still signed in (not sent back to the sign-in page)').not.toMatch(/\/login(\?|$)/);
}
