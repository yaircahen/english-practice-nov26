/**
 * Hey! Unit 1 game: automatic backup receiver.
 * @OnlyCurrentDoc
 *
 * The line above limits this script to the one Google Sheet it is attached to: Google asks for
 * "spreadsheets this application has been installed in", not for your Drive.
 * Setup is in README.md, "Automatic backup to a Google Sheet".
 *
 * Sheet "backups": one row per game day (the day's latest copy).
 *   A day · B saved at · C sessions · D size · E… the save's JSON, split into pieces because a
 *   cell holds at most 50,000 characters.
 * Sheet "older": a copy with fewer sessions than the newest one (for example a fresh, empty game)
 *   lands here and never overwrites a row in "backups".
 * To restore: select a row, then the menu Hey1 → "Show save of the selected row", copy, and paste
 * it in the game's coach screen under "ייבוא שמירה".
 */

var MAIN = 'backups', OLDER = 'older', PIECE = 45000, HEAD = ['day', 'saved at', 'sessions', 'size'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents);
    var save = body && body.save;
    if (!body || body.app !== 'hey1' || !save || save.version !== 1 || !save.cards) throw new Error('not a game save');
    var day = /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
    var n = save.sessionCount || 0, text = JSON.stringify(save);
    var row = [day, new Date(), n, text.length];
    for (var i = 0; i < text.length; i += PIECE) row.push(text.slice(i, i + PIECE));

    var main = sheet_(MAIN), last = main.getLastRow();
    var data = last > 1 ? main.getRange(2, 1, last - 1, 3).getValues() : [];
    var newest = data.reduce(function (m, r) { return Math.max(m, Number(r[2]) || 0); }, 0);
    if (n < newest) { put_(sheet_(OLDER), 0, row); return out_({ ok: true, kept: 'older' }); }
    var at = 0;
    data.forEach(function (r, k) { if (fmt_(r[0]) === day) at = k + 2; });
    put_(main, at, row);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

// Opening the web app address in a browser shows {"ok":true} when it is deployed correctly.
// It never returns a save: the address can write, not read.
function doGet() { return out_({ ok: true }); }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Hey1').addItem('Show save of the selected row', 'showSave').addToUi();
}

function showSave() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getActiveSheet(), r = sh.getActiveRange().getRow();
  var ui = SpreadsheetApp.getUi();
  if (r < 2 || (sh.getName() !== MAIN && sh.getName() !== OLDER)) { ui.alert('Select a row in "backups" or "older" first.'); return; }
  var vals = sh.getRange(r, 1, 1, sh.getLastColumn()).getValues()[0];
  var text = vals.slice(HEAD.length).join('');
  var html = '<textarea id="t" style="width:100%;height:300px;font:12px monospace" readonly>' +
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</textarea>' +
    '<p><button onclick="var t=document.getElementById(\'t\');t.select();document.execCommand(\'copy\');this.textContent=\'Copied\'">Copy</button> ' +
    'Then paste it in the game: coach screen → ⬆️ ייבוא שמירה → ייבא.</p>';
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(700).setHeight(400), 'Save of ' + fmt_(vals[0]) + ' (' + vals[2] + ' sessions)');
}

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(HEAD.concat(['save…'])); sh.setFrozenRows(1); }
  return sh;
}
// Writes the row at `at`, or appends it when `at` is 0. Clears leftover pieces of a longer old row.
function put_(sh, at, row) {
  if (!at) at = sh.getLastRow() + 1;
  var width = Math.max(sh.getLastColumn(), row.length);
  if (width > row.length) sh.getRange(at, 1, 1, width).clearContent();
  sh.getRange(at, 1, 1, row.length).setNumberFormat('@').setValues([row.map(function (v, i) { return i === 1 ? Utilities.formatDate(v, 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm') : String(v); })]);
}
function fmt_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Jerusalem', 'yyyy-MM-dd') : String(v); }
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
