/**
 * JC & MJ — RSVP backend (Google Apps Script)
 * ---------------------------------------------------------------
 * This turns a Google Sheet into a free, no-hosting-required backend
 * for the RSVP form on wedding_site.html, and the data source for
 * dashboard.html.
 *
 * SETUP (about 5 minutes):
 * 1. Go to https://sheets.google.com and create a new blank spreadsheet.
 *    Name it anything, e.g. "JC & MJ RSVPs".
 * 2. In the sheet, go to Extensions > Apps Script.
 * 3. Delete the placeholder code in Code.gs and paste this entire file.
 * 4. Change DASHBOARD_KEY below to your own secret string (anything —
 *    just don't leave it as the default).
 * 5. Click Deploy > New deployment.
 *      - Click the gear icon next to "Select type" and choose "Web app".
 *      - Description: anything.
 *      - Execute as: Me.
 *      - Who has access: Anyone.
 *      - Click Deploy, and authorize the script when prompted.
 * 6. Copy the "Web app URL" you're given (ends in /exec).
 * 7. Paste that URL into:
 *      - CONFIG.rsvpEndpoint in wedding_site.html
 *      - CONFIG.rsvpEndpoint in dashboard.html
 * 8. Paste the SAME DASHBOARD_KEY value into CONFIG.dashboardKey in
 *    dashboard.html.
 * 9. Open your Sheet any time to see raw responses, or use dashboard.html
 *    for the styled view with stats, search, sort, and CSV export.
 *
 * If you ever change the script, you must create a NEW deployment
 * version (Deploy > Manage deployments > edit > New version) for the
 * changes to take effect on the existing URL.
 * ---------------------------------------------------------------
 */

var SHEET_NAME = 'RSVPs';

// Change this to your own secret before deploying. Anyone who knows this
// key can read the full response list via the URL, so keep it private.
var DASHBOARD_KEY = 'change-this-secret-key';

function doPost(e) {
  var sheet = getSheet_();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name || '',
    data.attending || '',
    data.guests || '',
    data.message || ''
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var key = e.parameter.key;
  if (!key || key !== DASHBOARD_KEY) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  values.shift(); // drop header row

  var out = values
    .filter(function (row) { return row.join('') !== ''; })
    .map(function (row) {
      return {
        timestamp: row[0],
        name: row[1],
        attending: row[2],
        guests: row[3],
        message: row[4]
      };
    });

  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Name', 'Attending', 'Guests', 'Message']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
