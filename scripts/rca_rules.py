# Shared by build-rca.py and build-status.py: reads the test cases and Playwright results, and works out the
# reason of a failure from its errors.
import json, re


def load_cases(cases_file):
    src = open(cases_file, encoding='utf8').read()
    return json.loads('[' + src.split('export const cmsCases: CmsCase[] = [')[1].split('\n];')[0].strip().rstrip(',') + ']')


def load(path):
    out = {}
    r = json.load(open(path, encoding='utf8'))
    def walk(s):
        for sp in s.get('specs', []):
            t = sp['tests'][0]; res = t['results'][-1] if t['results'] else {}
            st = {'passed': 'Passed', 'skipped': 'Not run'}.get(res.get('status'), 'Failed')
            # All errors of the case (a timeout's real cause is often the second one, e.g. "The form was not saved").
            err = re.sub(r'\x1b\[[0-9;]*m', '', '\n'.join(x.get('message', '') for x in (res.get('errors') or [res.get('error') or {}])))
            seen = set()
            notes = [a for a in t.get('annotations', []) + res.get('annotations', []) if a.get('type') in ('skip', 'finding') and a.get('description')
                     and not ((a['type'], a['description']) in seen or seen.add((a['type'], a['description'])))]
            failed_step = next((s2['title'] for s2 in res.get('steps', []) if s2.get('error')), '')
            out[sp['title'][:10]] = {'status': st, 'error': err, 'notes': notes, 'step': failed_step,
                                     'start': res.get('startTime', ''), 'duration': res.get('duration', 0), 'file': sp.get('file', '')}
        for c in s.get('suites', []): walk(c)
    for s in r['suites']: walk(s)
    return out


# Reason (short) and remark (detail) of a failure, from the case and its error on that environment.
def reason(cid, r, env):
    # Text box size failures ("... shows 1.7 lines (50 px high); allowed is 8-25 lines: too small") are reported on
    # their own and combined with any other failure of the case.
    lines = r['error'].split('\n')
    is_size = lambda l: 'allowed is' in l and 'lines:' in l
    sizes = sorted({l.replace('Error: ', '').strip() for l in lines if is_size(l)})
    rest = '\n'.join(l for l in lines if not is_size(l))
    issue, short, text = base_reason(cid, dict(r, error=rest), env) if not only_size_errors(rest) else (None, None, None)
    if sizes:
        size_text = 'Text boxes too small to read (allowed: long text 8-25 lines, short fields 3-10): ' + '; '.join(sizes)
        if short:
            return issue, f'{short} + text box too small', f'{text}\n{size_text}'
        return 'Application issue', 'Text box too small', size_text
    return issue, short, text

def only_size_errors(text):
    # The remaining lines of a soft-check failure are only expect() details (Expected / Received / call stack).
    return not any(k in text for k in ('Error:', 'TimeoutError', 'Test timeout'))

def base_reason(cid, r, env):
    e, step = r['error'], r['step']
    n = int(cid[-3:])
    rules = [
        (n == 1 and 'last success' in e, 'Scheduler job never succeeded', 'The scheduler table shows a job whose Last Success Run is "-" (never succeeded), e.g. MainScheduler.testScheduler.'),
        (n == 5, 'Role access not enforced', 'A user with only the Report_Admin role (ROLE_REPORT) opens /admin/user/list by typing the address and sees every CMS user (the menu hides the page, the server does not block it). Reopening Assign Role Access also shows "Admin" instead of the user\'s role.'),
        (n == 11 and ('cs-theme-toggle' in e or 'Timeout' in e), 'No Light / Dark switch', 'This environment still has the older CMS pages: there is no Light / Dark switch.'),
        (n == 43, 'Genre has no Delete', 'The Genre list has no Delete button and the delete address of its page script answers 404: genres cannot be deleted.'),
        ('validateFaq' in e, 'validateFaq missing', 'Submit raises the script error "validateFaq is not defined": the FAQ form\'s validation function is not on the page, so its checks before saving do not run.'),
        ('validateTab' in e, 'validateTab missing', 'Submit raises the script error "validateTab is not defined": the Ratings / T&C / Privacy form\'s validation function is not on the page.'),
        ('validateCountry' in e, 'validateCountry missing', 'Submit raises the script error "validateCountry is not defined": the Countries form\'s validation function is not on the page.'),
        ('validateExperiences' in e, 'validateExperiences missing', 'The page raises the script error "validateExperiences is not defined": a validation function is not on the page.'),
        ("Unexpected token '=='" in e, 'Food Tab page script error', 'Every Food Tab page raises the script error "Unexpected token \'==\'" (a syntax error in the page\'s script).'),
        ("moreType" in e or (n in (74, 83, 92) and 'toHaveValue' in e), 'More type not preselected', 'On the Add form the More type is not preselected to the page\'s own type (manual checklist).'),
        (n == 108, 'Wrong page after Sync Movies', 'After Sync Movies the CMS goes to the Configurations menu instead of staying on Movies (manual checklist).'),
        ('500 GET /admin/movie/person' in e, 'Server error 500 on edit page', 'The Movies Person edit page requests GET /admin/movie/person/testing (the picture field holds "testing") and the server answers 500 instead of 404.'),
        ('Something went wrong' in e or 'The form was not saved' in e, 'Save fails ("Something went wrong")', 'The CMS answers "Something went wrong, Please try again." and does not save. On UAT (internal) every form with an image upload fails like this (Payment Modes, Experiences, Offers, Banners, Food Tab); the Seat Category edit form also opens without the record\'s cinema selected.'),
        ('no error page after saving' in e, 'Error page after saving', 'Pressing Submit on the edit form leads to an error page; the change is not saved (the original value is unchanged).'),
        (n == 139 and 'toHaveCount' in e, 'Add Food still offered', 'Add Food is still offered on this environment (it was removed on purpose on UAT); this build differs.'),
        (n == 28 and 'timeout' in e.lower(), 'Save fails (cinema not shown)', 'The Seat Category edit form opens without the record\'s cinema selected ("--Please Select--"); saving answers "Something went wrong, Please try again." Nothing was changed.'),
        ('"IP Address" column' in e, 'IP Address missing in export', 'The downloaded Refund report has no "IP Address" column (manual checklist).'),
        ('"User Name" column' in e, 'User Name missing in export', 'The downloaded Cancellation report has no "User Name" column (manual checklist: "User name field missing").'),
        ('"Cancellation Date" is a date' in e, 'Cancellation date empty in export', 'The downloaded Cancellation report has "Cancellation Date" empty in some rows; the list shows "—" for them (manual checklist: "cancellation date not coming proper").'),
        ('"Member ID"' in e,'Member ID blank in export', 'The downloaded Wallet Recharge report has "Member ID" blank in every row (manual checklist).'),
        ('"Name" filled' in e, 'Customer fields empty', '"Name" is empty in the listed wallet recharges (manual checklist: "Name, user name, mobile, email missing").'),
        ('_DT_CellIndex' in e, 'Booking Summary script error', 'After Submit the page raises "Cannot set properties of undefined (setting \'_DT_CellIndex\')": the list script cannot handle the Total row.'),
        (n == 244, 'Refund not processed', 'Initiate Refund > comment > Save: the CMS answers "Not Refunded, Try again" and the transaction keeps no refund status (manual checklist: "error showing").'),
        ('Download did not start' in e, 'Download does not start', 'Pressing Download does not produce a file within 2 minutes.'),
    ]
    for ok, short, text in rules:
        if ok: return 'Application issue', short, text
    first = e.strip().split('\n')[0][:160]
    return 'Application issue', 'See remarks', f'{step}: {first}' if step else first
