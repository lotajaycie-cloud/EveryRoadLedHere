/**
 * JC & MJ — RSVP backend
 * ============================================================================
 * Writes each guest's answer into column C of the guest list, on that guest's
 * own row, and keeps one row per household on an RSVP Log tab, rewritten in
 * place when a guest changes their mind so the log always reads true.
 *
 * SETUP
 *  1. Open the guest list spreadsheet.
 *  2. Extensions -> Apps Script. Delete anything already there and paste this.
 *  3. Check GUEST_SHEET below matches the tab holding the guest list. If the
 *     tab is called something other than Sheet1, change it.
 *  4. Change DASHBOARD_KEY to a secret of your own.
 *  5. Deploy -> New deployment -> Web app.
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Authorise when prompted, then copy the /exec URL.
 *  6. Paste that URL into index.html as CONFIG.rsvpEndpoint, and into
 *     dashboard.html as rsvpEndpoint, with the same DASHBOARD_KEY.
 *
 * The guest sheet is expected to be:
 *   A  name     B  code      C  confirmation
 *   D  contact  E  email     F  message
 * with a header row somewhere above the data reading "Main Guest". Headers for
 * D, E and F are added automatically if those cells are empty.
 *
 * The contact details are given once per household, so every person on that
 * code gets the same three values on their own row. That way each row is
 * complete on its own and the sheet can be sorted or filtered by any column
 * without a guest losing their contact details.
 * ============================================================================
 */

var GUEST_SHEET   = 'Sheet1';               // the tab holding the guest list
var LOG_SHEET     = 'RSVP Log';             // created automatically
var DASHBOARD_KEY = 'change-this-secret-key';

var COL_NAME = 1, COL_CODE = 2, COL_CONFIRM = 3;
var COL_PHONE = 4, COL_EMAIL = 5, COL_MESSAGE = 6;


function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);                     // two guests answering at once
  try {
    var data = JSON.parse(e.postData.contents);
    var responses = data.responses || [];
    var code = String(data.code || '').trim();

    var sheet = guestSheet_();
    var values = sheet.getDataRange().getValues();
    var written = 0, notFound = [];

    var phone = String(data.phone || '').trim();
    var email = String(data.email || '').trim();
    var note  = String(data.message || '').trim();

    ensureHeaders_(sheet, values);

    for (var r = 0; r < responses.length; r++) {
      var name = String(responses[r].name || '').trim();
      var answer = responses[r].attending === 'Yes' ? 'Yes' : 'No';
      var row = findRow_(values, name, code);
      if (row > 0) {
        // C through F in one write: four separate setValue calls per guest
        // would be four round trips, and an eight person household would make
        // thirty two of them.
        sheet.getRange(row, COL_CONFIRM, 1, 4)
             .setValues([[answer, phone, email, note]]);
        written++;
      } else {
        notFound.push(name);
      }
    }

    logSubmission_(data, written, notFound);

    return json_({ ok: true, written: written, notFound: notFound });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}


/**
 * Names column D, E and F on the header row, but only where the cell is empty,
 * so anything the couple have put there themselves is left alone.
 */
function ensureHeaders_(sheet, values) {
  var h = headerRow_(values);            // 1-based row under which data starts
  if (h < 1) return;
  var want = ['Contact Number', 'Email', 'Message'];
  var cur = sheet.getRange(h, COL_PHONE, 1, 3).getValues()[0];
  var out = [], changed = false;
  for (var i = 0; i < 3; i++) {
    if (String(cur[i] || '').trim() === '') { out.push(want[i]); changed = true; }
    else out.push(cur[i]);
  }
  if (changed) sheet.getRange(h, COL_PHONE, 1, 3).setValues([out]);
}


/**
 * Matches on name AND code so two guests who share a name in different
 * households cannot overwrite each other. Comparison is case and space
 * insensitive because a sheet collects stray spaces over time.
 */
function findRow_(values, name, code) {
  var wantName = norm_(name);
  var wantCode = normCode_(code);
  for (var i = 0; i < values.length; i++) {
    if (norm_(values[i][COL_NAME - 1]) === wantName &&
        normCode_(values[i][COL_CODE - 1]) === wantCode) {
      return i + 1;                          // sheet rows are 1-based
    }
  }
  return -1;
}

function norm_(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
}

function normCode_(v) {
  return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, '');
}


/**
 * One row per household, rewritten in place when a guest changes their mind,
 * so the log always shows what is currently true rather than a pile of
 * superseded answers. The revision count and the first-replied date keep the
 * history that matters without keeping every version of it.
 */
function logSubmission_(data, written, notFound) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(LOG_SHEET);
    log.appendRow(['Code', 'Group', 'Party', 'Attending', 'Answers', 'Message',
                   'First replied', 'Last updated', 'Revisions',
                   'Rows updated', 'Not matched']);
    log.setFrozenRows(1);
  }

  var answers = (data.responses || []).map(function (r) {
    return r.name + ': ' + r.attending;
  }).join('; ');

  var code = String(data.code || '').trim();
  var now = new Date();

  // find an existing row for this code
  var values = log.getDataRange().getValues();
  var target = -1;
  for (var i = 1; i < values.length; i++) {
    if (normCode_(values[i][0]) === normCode_(code)) { target = i + 1; break; }
  }

  if (target > 0) {
    var firstReplied = values[target - 1][6] || now;
    var revisions = Number(values[target - 1][8] || 0) + 1;
    log.getRange(target, 1, 1, 11).setValues([[
      code, data.group || '', data.partySize || '', data.attending || '',
      answers, data.message || '', firstReplied, now, revisions,
      written, notFound.join('; ')
    ]]);
  } else {
    log.appendRow([code, data.group || '', data.partySize || '',
                   data.attending || '', answers, data.message || '',
                   now, now, 0, written, notFound.join('; ')]);
  }
}


/**
 * Two jobs.
 *
 *   ?code=G401   returns just that household's current answers, no key. It is
 *                what the site asks for when a guest reopens the form, so the
 *                sheet stays the single source of truth and an edit made on a
 *                phone shows up on a laptop. It reveals nothing a holder of
 *                that code could not already set.
 *
 *   ?key=...     returns the whole list, for dashboard.html.
 */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};

  if (p.code) {
    var want = normCode_(p.code);
    var rows = guestSheet_().getDataRange().getValues();
    var party = [];
    for (var n = 0; n < rows.length; n++) {
      if (normCode_(rows[n][COL_CODE - 1]) === want && String(rows[n][COL_NAME - 1] || '').trim()) {
        party.push({
          name: String(rows[n][COL_NAME - 1]).trim(),
          confirmation: String(rows[n][COL_CONFIRM - 1] || '').trim(),
          phone: String(rows[n][COL_PHONE - 1] || '').trim(),
          email: String(rows[n][COL_EMAIL - 1] || '').trim(),
          message: String(rows[n][COL_MESSAGE - 1] || '').trim()
        });
      }
    }
    return json_({ ok: true, code: p.code, party: party });
  }

  var key = p.key || '';
  if (!key || key !== DASHBOARD_KEY) {
    return json_({ ok: false, error: 'unauthorised' });
  }

  var values = guestSheet_().getDataRange().getValues();
  var start = headerRow_(values);
  var out = [], yes = 0, no = 0, pending = 0;

  for (var i = start; i < values.length; i++) {
    var name = String(values[i][COL_NAME - 1] || '').trim();
    var code = String(values[i][COL_CODE - 1] || '').trim();
    if (!name) continue;
    var conf = String(values[i][COL_CONFIRM - 1] || '').trim();
    if (/^y/i.test(conf)) yes++;
    else if (/^n/i.test(conf)) no++;
    else pending++;
    out.push({ name: name, code: code, confirmation: conf });
  }

  return json_({ ok: true, total: out.length, yes: yes, no: no,
                 pending: pending, guests: out });
}


/** The guest rows begin under the row whose first cell reads "Main Guest". */
function headerRow_(values) {
  for (var i = 0; i < values.length; i++) {
    if (norm_(values[i][COL_NAME - 1]) === 'main guest') return i + 1;
  }
  return 0;
}


function guestSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(GUEST_SHEET);
  if (!sheet) sheet = ss.getSheets()[0];     // fall back to the first tab
  return sheet;
}


function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
