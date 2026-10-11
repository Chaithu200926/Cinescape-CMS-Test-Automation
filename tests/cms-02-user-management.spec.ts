// CMS-TC-002..015: every CMS-TC case of the "User Management" menu in CMS_Test_Cases.xlsx, one test each (steps in src/case-steps.ts).
import { cmsCases } from '../src/test-cases';
import { declareCases } from '../src/case-steps';

declareCases('User Management', cmsCases.filter((c) => c.menu === 'User Management'));
