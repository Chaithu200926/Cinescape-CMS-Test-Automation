// CMS-TC-239..244: every CMS-TC case of the "Refund" menu in CMS_Test_Cases.xlsx, one test each (steps in src/case-steps.ts).
import { cmsCases } from '../src/test-cases';
import { declareCases } from '../src/case-steps';

declareCases('Refund', cmsCases.filter((c) => c.menu === 'Refund'));
