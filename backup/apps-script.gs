// Hey! Unit 1 game: automatic backup receiver.
// Paste this into a new Apps Script project (script.google.com) in the parent's own Google account
// and deploy it as a web app. Steps are in README.md, "Automatic backup to Google Drive".
//
// It keeps a folder "Hey1 backups" in that account's Drive:
//   hey1-save-YYYY-MM-DD.json   one file per game day (the day's latest copy)
//   hey1-save-latest.json       the newest copy
// A copy with fewer sessions than the newest one (for example a fresh, empty game on a new address)
// never overwrites anything. It is kept beside them as hey1-save-YYYY-MM-DD-older-HHmmss.json.
// To restore: open a file, copy all its text, and paste it in the game's coach screen under "ייבוא שמירה".

var FOLDER = 'Hey1 backups';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents);
    var save = body && body.save;
    if (!body || body.app !== 'hey1' || !save || save.version !== 1 || !save.cards) throw new Error('not a game save');
    var day = /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
    var folder = folderFor_();
    var text = JSON.stringify(save);
    var latest = fileIn_(folder, 'hey1-save-latest.json');
    var newest = latest ? (JSON.parse(latest.getBlob().getDataAsString()).sessionCount || 0) : 0;
    if ((save.sessionCount || 0) < newest) {
      var name = 'hey1-save-' + day + '-older-' + Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'HHmmss') + '.json';
      folder.createFile(name, text, 'application/json');
      return out_({ ok: true, kept: name });
    }
    write_(folder, 'hey1-save-' + day + '.json', text);
    write_(folder, 'hey1-save-latest.json', text);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

// Opening the web app address in a browser shows {"ok":true} when it is deployed correctly.
function doGet() { return out_({ ok: true }); }

function folderFor_() {
  var it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}
function fileIn_(folder, name) {
  var it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}
function write_(folder, name, text) {
  var f = fileIn_(folder, name);
  if (f) f.setContent(text); else folder.createFile(name, text, 'application/json');
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
