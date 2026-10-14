// Pre-UAT CMS (http://10.35.1.66:8122): the same tests as UAT (tests/), with this environment's address, session
// and output: npm run test:pre-uat  ->  results in test-results-pre-uat, report in playwright-report-pre-uat.
process.env.CMS_ENV = 'pre-uat';
// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = require('./playwright.config');
