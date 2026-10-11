// CMS-TC-001: every CMS-TC case of the "Dashboard" menu in CMS_Test_Cases.xlsx, one test each (steps in src/case-steps.ts).
import { cmsCases } from '../src/test-cases';
import { declareCases } from '../src/case-steps';

declareCases('Dashboard', cmsCases.filter((c) => c.menu === 'Dashboard'));
