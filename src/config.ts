// Settings from .env (see .env.example). Secrets never live in code.
// The same tests run on three CMS environments, chosen with CMS_ENV (set by playwright.<env>.config.ts / npm run test:<env>).
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

/** The CMS environments the suite runs on. */
export const environments = {
  uat: { name: 'UAT', url: 'http://10.35.1.66:8092' },
  'uat-internal': { name: 'UAT (internal)', url: 'http://10.35.1.66:8102' },
  'pre-uat': { name: 'Pre-UAT', url: 'http://10.35.1.66:8122' },
} as const;
export type CmsEnv = keyof typeof environments;

const env = (process.env.CMS_ENV || 'uat') as CmsEnv;
if (!(env in environments)) throw new Error(`CMS_ENV "${env}" is not one of ${Object.keys(environments).join(', ')}.`);

/** A setting for this environment: e.g. CMS_USERNAME_PRE_UAT, else the shared CMS_USERNAME. */
const suffix = env.toUpperCase().replace(/-/g, '_');
const setting = (name: string) => process.env[`${name}_${suffix}`] || process.env[name] || '';

/** Folder of this environment's run output: UAT keeps the plain names, the others get a suffix (e.g. test-results-pre-uat). */
const named = (folder: string) => path.join(__dirname, '..', env === 'uat' ? folder : `${folder}-${env}`);

export const config = {
  env,
  envName: environments[env].name,
  // CMS_URL_<ENV> overrides the address; the plain CMS_URL only applies to UAT (it predates the other environments).
  baseUrl: (process.env[`CMS_URL_${suffix}`] || (env === 'uat' ? process.env.CMS_URL : '') || environments[env].url).replace(/\/$/, ''),
  username: setting('CMS_USERNAME'),
  password: setting('CMS_PASSWORD'),
  customerMobile: setting('CMS_CUSTOMER_MOBILE'),
  customerEmail: setting('CMS_CUSTOMER_EMAIL'),
  /** Signed-in browser session saved by global-setup.ts and reused by every test (one per environment). */
  storageState: path.join(__dirname, '..', '.auth', `state-${env}.json`),
  /** Raw results (screenshots, videos, results.json), the HTML report and the dashboard of this environment. */
  resultsDir: named('test-results'),
  reportDir: named('playwright-report'),
  dashboardDir: named('dashboard'),
};

/** Name prefix of every record the write tests create; only such records are edited or deleted. */
export const AUTOTEST_PREFIX = 'AUTOTEST';
