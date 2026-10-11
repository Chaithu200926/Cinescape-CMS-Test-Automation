// CMS-TC-158..183: every CMS-TC case of the "Offers and Banners" menu in CMS_Test_Cases.xlsx, one test each (steps in src/case-steps.ts).
import { cmsCases } from '../src/test-cases';
import { declareCases } from '../src/case-steps';

declareCases('Offers and Banners', cmsCases.filter((c) => c.menu === 'Offers and Banners'));
