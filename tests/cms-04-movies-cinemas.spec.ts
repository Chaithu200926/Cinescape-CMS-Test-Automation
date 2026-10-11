// CMS-TC-106..157: every CMS-TC case of the "Movies/Cinemas" menu in CMS_Test_Cases.xlsx, one test each (steps in src/case-steps.ts).
import { cmsCases } from '../src/test-cases';
import { declareCases } from '../src/case-steps';

declareCases('Movies/Cinemas', cmsCases.filter((c) => c.menu === 'Movies/Cinemas'));
