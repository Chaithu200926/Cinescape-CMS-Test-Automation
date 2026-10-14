// The Add / Edit forms of the CMS (probed 11 Oct 2026, see `npm run probe`), keyed by the page name in
// src/cms-pages.ts. Every record a test creates is named "AUTOTEST <token>" and is created inactive where the form
// allows, so it never shows in the apps; the test removes it again afterwards.

export type FieldValue = string | boolean | string[];

/** A record created by a test: `token` is unique per test run and is what the list is searched for. */
export interface TestRecord {
  token: string;
  name: string;
}

export interface RecordForm {
  /** href of the page's Add button. */
  add: string;
  /** Field name → value for a valid new record. Checkboxes take true/false, multi-selects a list. */
  values: (r: TestRecord) => Record<string, FieldValue>;
  /** File inputs and the image size they get (the size the form asks for, where it says). */
  files?: Record<string, [number, number]>;
  /** Rich-text (Jodit) fields, in page order: typed into the editor. */
  richText?: string[];
  /** Field the Edit case changes and its new value; `also`: more fields changed with it (checked after saving). */
  edit: { field: string; value: (r: TestRecord) => string; also?: Record<string, FieldValue> };
  /** Values the Add form must already have selected (manual checklist). */
  defaults?: Record<string, string>;
  /** Invalid data the Add case also tries (it must not be saved). */
  invalid?: (r: TestRecord) => Record<string, FieldValue>;
  /**
   * How the record is removed: its row's Delete link, or a delete URL for lists that have none.
   * 'none': the CMS cannot delete these, so Add is checked up to Submit only and never saved.
   */
  remove: 'row' | 'none' | ((id: string) => string);
}

const ymd = (days = 0) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const dmy = (days = 0) => ymd(days).split('-').reverse().join('-');

const tabForm = (type: 'rating' | 't&c' | 'privacy'): RecordForm => ({
  add: `/admin/tab/add/${type}`,
  // Checklist: "More type should be defaulted to" the page's own type.
  defaults: { moreType: { rating: 'RATING', 't&c': 'TNC', privacy: 'PRIVACY' }[type] },
  // More type is chosen explicitly: UAT (internal) does not preselect it, and a record of the wrong type lands in another list.
  values: (r) => ({ name: r.name, nameAlt: r.name, moreType: { rating: 'RATING', 't&c': 'TNC', privacy: 'PRIVACY' }[type], colorCode: '#123456', more_key: `AT${r.token.slice(-8)}`, priority: '99', descriptionShort: r.name, descriptionShortAlt: r.name, active: false }),
  richText: ['description', 'descriptionAlt'],
  edit: { field: 'name', value: (r) => `${r.name} EDITED` },
  remove: 'row',
});

export const recordForms: Record<string, RecordForm> = {
  'User Management › Users': {
    add: '/admin/user/add',
    values: (r) => ({ email: `autotest.${r.token.toLowerCase()}@kncc.com`, fname: 'AUTOTEST', lname: r.token, password: 'Autotest@2026', active: true }),
    invalid: (r) => ({ email: `autotest-${r.token.toLowerCase()}-no-at-sign` }),
    edit: { field: 'lname', value: (r) => `${r.token} EDITED` },
    remove: 'row',
  },
  'User Management › Role access': {
    add: '/admin/roleAccess/add',
    values: (r) => ({ name: r.name, roles: ['ROLE_REPORT'] }),
    edit: { field: 'name', value: (r) => `${r.name} EDITED` },
    remove: 'row',
  },
  'Configurations › Configuration': {
    add: '/admin/config/add',
    values: (r) => ({ configKey: `AUTOTEST_${r.token.replace(/-/g, '_')}`, configValue: 'autotest', configDescription: r.name }),
    edit: { field: 'configValue', value: () => 'autotest edited' },
    remove: 'row',
  },
  'Configurations › Seat Category': {
    add: '/admin/seatcategory/add',
    values: (r) => ({ areacode: '9999', ccode: 'Cinescape 360', category: r.name, categoryalt: r.name, subcat: 'AUTOTEST', subcatalt: 'AUTOTEST' }),
    edit: { field: 'subcatalt', value: (r) => r.name },
    remove: 'none',
  },
  'Configurations › Language': {
    add: '/admin/language/add',
    values: (r) => ({ language: r.name, languageAr: r.name }),
    edit: { field: 'languageAr', value: (r) => `${r.name} EDITED` },
    remove: 'row',
  },
  'Configurations › Genre': {
    add: '/admin/genre/add',
    values: (r) => ({ name: r.name, nameAlt: r.name, description: r.name }),
    edit: { field: 'name', value: (r) => `${r.name} EDITED` },
    // No Delete button, and the delete URL of the page script answers 404 (11 Oct 2026): records cannot be removed.
    remove: 'none',
  },
  'Configurations › Email/SMS Template': {
    add: '/admin/template/add',
    values: (r) => ({ name: `AUTOTEST_${r.token.replace(/-/g, '_')}`, eFrom: 'noreply@kncc.com', eSubject: r.name, eifActive: false, sifActive: false }),
    richText: ['eTemplate'],
    edit: { field: 'eSubject', value: (r) => `${r.name} EDITED` },
    remove: 'row',
  },
  'Configurations › Payment Modes': {
    add: '/admin/paymentmodes/add',
    values: (r) => ({ pid: `9${r.token.slice(-4)}`, name: r.name, nameAlt: r.name, caption: r.name, type: 'OFFER', priority: '99', ccode: ['Cinescape 360'], platform: ['WEBSITE'], active: false }),
    files: { fileImage: [200, 200], fileActiveImage: [200, 200] },
    // The name holds 30 characters at most (a 31-character name gives "Something went wrong"): "AUTOTEST T056-<time> ED".
    edit: { field: 'name', value: (r) => `${r.name} ED` },
    remove: 'row',
  },
  'Configurations › FAQ': {
    add: '/admin/faq/add',
    values: (r) => ({ name: r.name, priority: '99', name_ar: r.name, ques: `${r.name} question?`, ques_ar: `${r.name} question?`, answer: 'Automated test answer.', answer_ar: 'Automated test answer.', active: false }),
    edit: { field: 'name', value: (r) => `${r.name} EDITED` },
    remove: 'row',
  },
  'Configurations › Ratings': tabForm('rating'),
  'Configurations › T & C': tabForm('t&c'),
  'Configurations › Privacy Policy': tabForm('privacy'),
  'Configurations › Countries': {
    add: '/admin/country/add',
    values: (r) => ({ countryName: r.name, countryCode: `Z${r.token.slice(-2)}`, isdCode: '+999', phoneLength: '8', active: false }),
    files: { fileImage: [64, 48] },
    edit: { field: 'countryName', value: (r) => `${r.name} EDITED` },
    remove: 'row',
  },
  'Movies/Cinemas › Experiences': {
    add: '/admin/experiences/add',
    values: (r) => ({ name: r.name, priority: '99', active: false }),
    files: { fileImage: [100, 100], activeFileImage: [100, 100], blackFileImage: [100, 100], whiteFileImage: [100, 100] },
    edit: { field: 'name', value: (r) => `${r.name} EDITED` },
    remove: 'row',
  },
  'Movies/Cinemas › Food Tab': {
    add: '/admin/foodtab/add',
    values: (r) => ({ name: r.name, nameAlt: r.name, priority: '99' }),
    files: { tabImage: [106, 89] },
    edit: { field: 'nameAlt', value: (r) => r.name },
    remove: 'none',
  },
  'Movies/Cinemas › Tags': {
    add: '/admin/tag/add',
    values: (r) => ({ name: r.name, nameAr: r.name, colour: '#123456' }),
    edit: { field: 'name', value: (r) => `${r.name} EDITED` },
    remove: 'row',
  },
  'Offers and Banners › Offers': {
    add: '/admin/offer/add',
    values: (r) => ({ name: r.name, type: 'Standard', platform: ['WEBSITE'], shortText: r.name, shortTextAlt: r.name, detailText: r.name, detailTextAlt: r.name, validfrom: ymd(), validto: ymd(30), priority: '99', tnc: 'Automated test.', howAvail: 'Automated test.', active: false }),
    files: { webThumbImage: [578, 327], webImage: [1920, 497], appThumbImage: [325, 184], appImage: [414, 335] },
    // Checklist: "Platform selected is not updating" on Edit.
    edit: { field: 'name', value: (r) => `${r.name} EDITED`, also: { platform: ['ANDROID', 'IOS'] } },
    remove: 'row',
  },
  'Offers and Banners › Bank Offers': {
    add: '/admin/bankOffer/add',
    values: (r) => ({
      active: false, name: r.name, nameAlt: r.name, header: r.name, campaignQuota: '1', campaignResetOn: 'Entire Campaign Duration', campaignResetDay: 'SUN',
      validFrom: dmy(), validTo: dmy(30), binSeries: '999999', cinemas: ['Cinescape 360'], tckType: 'AUTOTEST', applicableDays: ['SUN'], discountType: 'NONE',
      cardQuota: '1', cardResetOn: 'Entire Offer Duration', cardResetDay: 'SUN',
    }),
    edit: { field: 'name', value: (r) => `${r.name} EDITED` },
    // No Delete button (and the Genre delete URL of the same kind answers 404): records cannot be removed.
    remove: 'none',
  },
  'Offers and Banners › Banners': {
    add: '/admin/banner/add',
    values: (r) => ({ name: r.name, redirectType: 'Outside App', url: 'https://www.cinescape.com.kw', priority: '99', type: 'Website homepage[Image Size: 666x355]', validfrom: ymd(), validto: ymd(30), active: false }),
    files: { fileImage: [666, 355], fileImageAr: [666, 355] },
    edit: { field: 'name', value: (r) => `${r.name} EDITED` },
    remove: 'row',
  },
};
