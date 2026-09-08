/**
 * JC & MJ — RSVP backend
 * ============================================================================
 * Writes each guest's answer into column C of the guest list, on that guest's
 * own row, and keeps a dated log of every submission on a second tab.
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
 *   column A  name        column B  code        column C  confirmation
 * with a header row somewhere above the data reading "Main Guest".
 * ============================================================================
 */

var GUEST_SHEET   = 'Sheet1';               // the tab holding the guest list
var LOG_SHEET     = 'RSVP Log';             // created automatically
var DASHBOARD_KEY = 'change-this-secret-key';

var COL_NAME = 1, COL_CODE = 2, COL_CONFIRM = 3;


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

    for (var r = 0; r < responses.length; r++) {
      var name = String(responses[r].name || '').trim();
      var answer = responses[r].attending === 'Yes' ? 'Yes' : 'No';
      var row = findRow_(values, name, code);
      if (row > 0) {
        sheet.getRange(row, COL_CONFIRM).setValue(answer);
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


function logSubmission_(data, written, notFound) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(LOG_SHEET);
    log.appendRow(['Timestamp', 'Code', 'Group', 'Party', 'Attending',
                   'Answers', 'Message', 'Rows updated', 'Not matched']);
    log.setFrozenRows(1);
  }
  var answers = (data.responses || []).map(function (r) {
    return r.name + ': ' + r.attending;
  }).join('; ');

  log.appendRow([
    new Date(),
    data.code || '',
    data.group || '',
    data.partySize || '',
    data.attending || '',
    answers,
    data.message || '',
    written,
    notFound.join('; ')
  ]);
}


/** Read-only feed for dashboard.html. */
function doGet(e) {
  var key = e && e.parameter ? e.parameter.key : '';
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
