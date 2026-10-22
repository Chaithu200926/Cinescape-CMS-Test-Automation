// Pre-Prod CMS (http://10.35.1.66:8112): the same tests as UAT (tests/), with this environment's address, session
// and output: npm run test:pre-prod  ->  results in test-results-pre-prod, report in playwright-report-pre-prod.
process.env.CMS_ENV = 'pre-prod';
// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = require('./playwright.config');
