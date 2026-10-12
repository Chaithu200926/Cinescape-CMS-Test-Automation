// CMS-TC-005 User Management › Users – Assign Role access: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Current roles are not listing. / Before page load completely, role is showing in grid. Once page load completes, role is not showing in grid
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';
import { config } from '../src/config';

test('CMS-TC-005 Users – Assign Role access', sheet('CMS-TC-005'), async ({ cms, step }) => {
  const users = new RecordPage(cms, pages.users);
  const record = users.newRecord('CMS-TC-005');
  const { email, password } = users.values(record) as { email: string; password: string };
  const role = 'Report_Admin'; // only ROLE_REPORT
  await step('Remove AUTOTEST users left by earlier runs', () => users.removeLeftovers());
  try {
    await step(`Create the test user "${record.name}" with the Add form`, () => users.create(record));
    await step('Check the test user is in the list', () => users.expectInList(record.token));
    await step('Click Assign Role Access on the test user', async () => {
      await users.click(users.rowAction(await users.expectInList(record.token), /assign role access/i));
      await cms.waitForLoadState('networkidle');
    });
    await step(`Choose the role access "${role}"`, () => users.setFields({ roles: role }));
    await step('Press Update: the CMS confirms and returns to the Users list', async () => {
      await cms.locator('a, button').filter({ hasText: /^\s*update\s*$/i }).first().click();
      await cms.waitForURL(/\/admin\/user\/list/, { timeout: 60_000 });
    });
    await step(`Check the list shows the role "${role}" for the test user`, async () => {
      await expect(await users.expectInList(record.token)).toContainText(role);
    });
    await step('Reopen Assign Role Access', async () => {
      await users.click(users.rowAction(await users.expectInList(record.token), /assign role access/i));
      await cms.waitForLoadState('networkidle');
    });
    await step('Check the current role is selected (manual checklist: "Current roles are not listing")', async () => {
      expect.soft(await users.selected('roles')).toContain(role);
    });
    await step('Sign in as the test user and check only its role\'s pages are open to it', async () => {
      const context = await cms.context().browser()!.newContext({ storageState: { cookies: [], origins: [] }, baseURL: config.baseUrl });
      try {
        const user = await context.newPage();
        await user.goto('/login');
        await user.locator('#username').fill(email);
        await user.locator('#password').fill(password);
        await user.getByRole('button', { name: 'Sign in' }).click();
        await user.waitForLoadState('networkidle');
        expect(user.url(), 'test user signed in').not.toMatch(/\/login/);
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
  } finally {
    await step('Clean up: delete the test user', () => users.remove(record.token));
    await step('Check the test user is no longer listed', () => users.expectNotInList(record.token));
  }
  expectNoCmsErrors(cms);
});
