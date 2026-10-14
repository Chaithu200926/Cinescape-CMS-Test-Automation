// Where each submenu of the test case sheet lives in the CMS (menu probed 11 Oct 2026). The tests use these by
// name, e.g. `new ListPage(cms, pages.language)`.

export interface CmsPage {
  /** "Menu › Submenu" as in CMS_Test_Cases.xlsx (also the key of its form in src/cms-forms.ts). */
  name: string;
  /** Path after CMS_URL. */
  path: string;
  /** Text of the page heading (matched loosely, case-insensitive). */
  heading: RegExp;
  /** Report columns that must never be empty in the results (manual checklist: "fields are missing"). */
  requiredColumns?: string[];
}

const page = (name: string, path: string, heading: RegExp, requiredColumns?: string[]): CmsPage => ({ name, path, heading, requiredColumns });

export const pages = {
  dashboard: page('Dashboard', '/admin/welcome', /welcome|dashboard|monitor schedulers/i),

  users: page('User Management › Users', '/admin/user/list', /users/i),
  roleAccess: page('User Management › Role access', '/admin/roleAccess/list', /role access/i),

  configuration: page('Configurations › Configuration', '/admin/config/list', /configuration/i),
  seatCategory: page('Configurations › Seat Category', '/admin/seatcategory/list', /seat category/i),
  language: page('Configurations › Language', '/admin/language/list', /language/i),
  genre: page('Configurations › Genre', '/admin/genre/list', /genre/i),
  prepareFood: page('Configurations › Prepare food', '/admin/config/configPrepareFood', /prepare food/i),
  emailSmsTemplate: page('Configurations › Email/SMS Template', '/admin/template/list', /template/i),
  paymentModes: page('Configurations › Payment Modes', '/admin/paymentmodes/list', /payment modes/i),
  faq: page('Configurations › FAQ', '/admin/faq/list', /faq/i),
  ratings: page('Configurations › Ratings', '/admin/tab/list/rating', /rating/i),
  termsAndConditions: page('Configurations › T & C', '/admin/tab/list/t&c', /t\s*&\s*c/i),
  privacyPolicy: page('Configurations › Privacy Policy', '/admin/tab/list/privacy', /privacy/i),
  countries: page('Configurations › Countries', '/admin/country/list', /countr/i),

  movies: page('Movies/Cinemas › Movies', '/admin/movie/list', /movies|movie details/i),
  moviesPerson: page('Movies/Cinemas › Movies Person', '/admin/movie/person/list', /person/i),
  cinemas: page('Movies/Cinemas › Cinemas', '/admin/cinema/list', /cinemas/i),
  experiences: page('Movies/Cinemas › Experiences', '/admin/experiences/list', /experiences/i),
  food: page('Movies/Cinemas › Food', '/admin/food/list', /food/i),
  foodTab: page('Movies/Cinemas › Food Tab', '/admin/foodtab/list', /foods?\s*tab/i),
  tags: page('Movies/Cinemas › Tags', '/admin/tag/list', /tag/i),

  offers: page('Offers and Banners › Offers', '/admin/offer/list', /offers/i),
  bankOffers: page('Offers and Banners › Bank Offers', '/admin/bankOffer/list', /campaign details|bank offers/i),
  banners: page('Offers and Banners › Banners', '/admin/banner/list', /banners/i),

  customerDetails: page('Reports › Customer Details', '/admin/report/customer/list', /customer details/i, ['UserId', 'User Name', 'Name', 'Card Number', 'MemberId', 'Email', 'Mobile']),
  userReport: page('Reports › User report', '/admin/report/user/list', /user report/i),
  transactionReport: page('Reports › Transaction Report', '/admin/report/bookings/list', /transaction report/i),
  auditReport: page('Reports › Audit Report', '/admin/report/audit/list', /audit report/i),
  cancellationReport: page('Reports › Cancellation Report', '/admin/report/cancellations/list', /cancellations? report/i),
  foodAndBeveragesReport: page('Reports › Food and Beverages Report', '/admin/report/foods/list', /food and beverages/i),
  refundReport: page('Reports › Refund report', '/admin/report/refund/list', /refund report/i),
  walletRechargeReport: page('Reports › Wallet Recharge Report', '/admin/report/clubcard/list', /wallet recharge/i, ['Name', 'User Name', 'Mobile', 'Email']),
  bookingSummaryReport: page('Reports › Booking Summary Report', '/admin/report/booking_summary/list', /booking summary/i),
  bookingSummaryByCinemas: page('Reports › Booking Summary Report by Cinemas', '/admin/report/booking_cinema/list', /by cinemas/i),
  breakTransactionSummary: page('Reports › Break Transaction Summary Report', '/admin/report/break_transaction/list', /break transaction/i),
  promotionReport: page('Reports › Promotion report', '/admin/report/promotion/list', /promotions? report/i),
  kioskTransactionReport: page('Reports › Kiosk Transaction Report', '/admin/report/kioskBookings/list', /kiosk transaction report/i),

  refundTransactions: page('Refund › Transaction Report', '/admin/refund/break_transactions/list', /transactions?( report)?/i),
} satisfies Record<string, CmsPage>;
