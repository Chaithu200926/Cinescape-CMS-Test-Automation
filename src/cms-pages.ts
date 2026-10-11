// Where each submenu of the test case sheet lives in the CMS (menu probed 1 Oct 2026).
// Key = "Menu (A) › Submenu (B)" exactly as in CMS_Test_Cases.xlsx.

export interface CmsPage {
  /** Path after CMS_URL. */
  path: string;
  /** Text of the page heading (matched loosely, case-insensitive). */
  heading: RegExp;
  /** List page with a DataTable, or a report with filters and a Submit button. */
  kind: 'list' | 'report' | 'dashboard';
  /** Label of the page's Add button, for pages where the tests create their own record. */
  addButton?: RegExp;
}

export const cmsPages: Record<string, CmsPage> = {
  'Dashboard › ': { path: '/admin/welcome', heading: /welcome|dashboard/i, kind: 'dashboard' },

  'User Management › Users': { path: '/admin/user/list', heading: /users/i, kind: 'list', addButton: /add user/i },
  'User Management › Role access': { path: '/admin/roleAccess/list', heading: /role access/i, kind: 'list', addButton: /add role access/i },

  'Configurations › Configuration': { path: '/admin/config/list', heading: /configuration/i, kind: 'list', addButton: /add configuration/i },
  'Configurations › Seat Category': { path: '/admin/seatcategory/list', heading: /seat category/i, kind: 'list', addButton: /add seat category/i },
  'Configurations › Language': { path: '/admin/language/list', heading: /language/i, kind: 'list', addButton: /add language/i },
  'Configurations › Genre': { path: '/admin/genre/list', heading: /genre/i, kind: 'list', addButton: /add genre/i },
  'Configurations › Prepare food': { path: '/admin/config/configPrepareFood', heading: /prepare food/i, kind: 'dashboard' },
  'Configurations › Email/SMS Template': { path: '/admin/template/list', heading: /template/i, kind: 'list', addButton: /add email\/sms template/i },
  'Configurations › Payment Modes': { path: '/admin/paymentmodes/list', heading: /payment modes/i, kind: 'list', addButton: /add pay modes/i },
  'Configurations › FAQ': { path: '/admin/faq/list', heading: /faq/i, kind: 'list', addButton: /add faq/i },
  'Configurations › Ratings': { path: '/admin/tab/list/rating', heading: /rating/i, kind: 'list', addButton: /^\s*ratings\s*$/i },
  'Configurations › T & C': { path: '/admin/tab/list/t&c', heading: /t\s*&\s*c/i, kind: 'list', addButton: /^\s*t\s*&\s*c\s*$/i },
  'Configurations › Privacy Policy': { path: '/admin/tab/list/privacy', heading: /privacy/i, kind: 'list', addButton: /^\s*privacy policy\s*$/i },
  'Configurations › Countries': { path: '/admin/country/list', heading: /countr/i, kind: 'list', addButton: /add country/i },

  'Movies/Cinemas › Movies': { path: '/admin/movie/list', heading: /movies/i, kind: 'list' },
  'Movies/Cinemas › Movies Person': { path: '/admin/movie/person/list', heading: /person/i, kind: 'list' },
  'Movies/Cinemas › Cinemas': { path: '/admin/cinema/list', heading: /cinemas/i, kind: 'list' },
  'Movies/Cinemas › Experiences': { path: '/admin/experiences/list', heading: /experiences/i, kind: 'list', addButton: /add experiences/i },
  'Movies/Cinemas › Food': { path: '/admin/food/list', heading: /food/i, kind: 'list', addButton: /add food$/i },
  'Movies/Cinemas › Food Tab': { path: '/admin/foodtab/list', heading: /food\s*tab/i, kind: 'list', addButton: /add foodtab/i },
  'Movies/Cinemas › Tags': { path: '/admin/tag/list', heading: /tag/i, kind: 'list', addButton: /add tag/i },

  'Offers and Banners › Offers': { path: '/admin/offer/list', heading: /offers/i, kind: 'list', addButton: /add offer/i },
  'Offers and Banners › Bank Offers': { path: '/admin/bankOffer/list', heading: /bank offers/i, kind: 'list', addButton: /add campaign details/i },
  'Offers and Banners › Banners': { path: '/admin/banner/list', heading: /banners/i, kind: 'list', addButton: /add banner/i },

  'Reports › Customer Details': { path: '/admin/report/customer/list', heading: /customer details/i, kind: 'report' },
  'Reports › User report': { path: '/admin/report/user/list', heading: /user report/i, kind: 'report' },
  'Reports › Transaction Report': { path: '/admin/report/bookings/list', heading: /transaction report/i, kind: 'report' },
  'Reports › Audit Report': { path: '/admin/report/audit/list', heading: /audit report/i, kind: 'report' },
  'Reports › Cancellation Report': { path: '/admin/report/cancellations/list', heading: /cancellations? report/i, kind: 'report' },
  'Reports › Food and Beverages Report': { path: '/admin/report/foods/list', heading: /food and beverages/i, kind: 'report' },
  'Reports › Refund report': { path: '/admin/report/refund/list', heading: /refund report/i, kind: 'report' },
  'Reports › Wallet Recharge Report': { path: '/admin/report/clubcard/list', heading: /wallet recharge/i, kind: 'report' },
  'Reports › Booking Summary Report': { path: '/admin/report/booking_summary/list', heading: /booking summary/i, kind: 'report' },
  'Reports › Booking Summary Report by Cinemas': { path: '/admin/report/booking_cinema/list', heading: /by cinemas/i, kind: 'report' },
  'Reports › Break Transaction Summary Report': { path: '/admin/report/break_transaction/list', heading: /break transaction/i, kind: 'report' },
  'Reports › Promotion report': { path: '/admin/report/promotion/list', heading: /promotion report/i, kind: 'report' },

  'Refund › Transaction Report': { path: '/admin/refund/break_transactions/list', heading: /transaction report/i, kind: 'report' },
};

export function pageFor(menu: string, submenu: string): CmsPage {
  const page = cmsPages[`${menu} › ${submenu}`];
  if (!page) throw new Error(`No CMS page mapped for "${menu} › ${submenu}" (add it to src/cms-pages.ts).`);
  return page;
}
