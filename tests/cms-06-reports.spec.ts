// CMS-TC-184..238: every CMS-TC case of the "Reports" menu in CMS_Test_Cases.xlsx, one test each (steps in src/case-steps.ts).
import { cmsCases } from '../src/test-cases';
import { declareCases } from '../src/case-steps';

declareCases('Reports', cmsCases.filter((c) => c.menu === 'Reports'));
