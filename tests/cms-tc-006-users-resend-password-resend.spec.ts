// CMS-TC-006 User Management › Users – Resend password resend: one CMS test case (CMS_Test_Cases.xlsx).
// Manual checklist: Status: No / Retest: Yes / Resend Password mail not receiving
import { test, expect, sheet, expectNoCmsErrors } from '../src/fixtures';
import { pages } from '../src/cms-pages';
import { RecordPage } from '../src/record-page';

test('CMS-TC-006 Users – Resend password resend', sheet('CMS-TC-006'), async ({ cms, step }) => {
  // The password e-mail goes only to the test's own AUTOTEST user, never to a real account.
  // (Manual checklist: "Resend Password mail not receiving": the mailbox cannot be checked from here.)
  const users = new RecordPage(cms, pages.users);
  const record = users.newRecord('CMS-TC-006');
  const resend = async () => users.rowAction(await users.expectInList(record.token), /re-?send password/i);
  await step('Remove AUTOTEST users left by earlier runs', () => users.removeLeftovers());
  try {
    await step(`Create the test user "${record.name}" with the Add form`, () => users.create(record));
    await step('Check the test user is in the list', () => users.expectInList(record.token));
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
      await test.info().attach('page after resend', { body: `${cms.url()}\n${(await cms.locator('.alert, .msg, #msg').allTextContents()).join('\n')}`, contentType: 'text/plain' });
    });
  } finally {
    await step('Clean up: delete the test user', () => users.remove(record.token));
    await step('Check the test user is no longer listed', () => users.expectNotInList(record.token));
  }
  expectNoCmsErrors(cms);
});
