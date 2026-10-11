// CMS-TC-016..105: every CMS-TC case of the "Configurations" menu in CMS_Test_Cases.xlsx, one test each (steps in src/case-steps.ts).
import { cmsCases } from '../src/test-cases';
import { declareCases } from '../src/case-steps';

declareCases('Configurations', cmsCases.filter((c) => c.menu === 'Configurations'));
