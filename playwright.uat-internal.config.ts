// UAT (internal) CMS (http://10.35.1.66:8102): the same tests as UAT (tests/), with this environment's address, session
// and output: npm run test:uat-internal  ->  results in test-results-uat-internal, report in playwright-report-uat-internal.
process.env.CMS_ENV = 'uat-internal';
// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = require('./playwright.config');
