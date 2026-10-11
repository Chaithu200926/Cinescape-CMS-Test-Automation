// Settings from .env (see .env.example). Secrets never live in code.
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

export const config = {
  baseUrl: (process.env.CMS_URL || 'http://10.35.1.66:8092').replace(/\/$/, ''),
  username: process.env.CMS_USERNAME ?? '',
  password: process.env.CMS_PASSWORD ?? '',
  customerMobile: process.env.CMS_CUSTOMER_MOBILE ?? '',
  customerEmail: process.env.CMS_CUSTOMER_EMAIL ?? '',
  /** Signed-in browser session saved by global-setup.ts and reused by every test. */
  storageState: path.join(__dirname, '..', '.auth', 'state.json'),
};

/** Name prefix of every record the write tests create; only such records are edited or deleted. */
export const AUTOTEST_PREFIX = 'AUTOTEST';

/** A unique name for a record created by a test, e.g. "AUTOTEST CMS-TC-033 1011-0915". */
export function autotestName(caseId: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${AUTOTEST_PREFIX} ${caseId} ${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
