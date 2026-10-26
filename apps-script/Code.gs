/**
 * Company Portal backend - Google Apps Script
 * ------------------------------------------------------------------
 * Paste this file into a script that is BOUND to your Google Sheet
 * (Sheet -> Extensions -> Apps Script), then deploy it as a Web App.
 *
 * What it does
 *  - POST {action:'login', identifier, password}  -> signed, expiring token
 *  - POST {action:'content', token}               -> carousel, tabs, tiles
 *
 * Security design
 *  - The spreadsheet stays PRIVATE. Only this script (running as you) reads it.
 *  - Passwords are never stored. Only a salted, iterated SHA-256 hash is kept.
 *  - Tokens are HMAC-SHA256 signed with a secret kept in Script Properties.
 *  - Every content request re-validates the token AND that the user is still active.
 *  - Failed logins are throttled: 5 failures lock that account for 15 minutes.
 *  - The Users sheet is never returned to the browser.
 *
 * Limits (be aware): Apps Script has no bcrypt/argon2, so a salted iterated
 * SHA-256 is the strongest practical option here. Use long passwords.
 */

var CONFIG = {
  TOKEN_TTL_MS: 2 * 60 * 60 * 1000, // sessions last 2 hours
  HASH_ITERATIONS: 1000,            // do NOT change after creating users (hashes would stop matching)
  MAX_FAILED_ATTEMPTS: 5,
  LOCK_SECONDS: 15 * 60,
  FAIL_DELAY_MS: 700,               // small delay on a failed login to slow brute force
  MAX_BODY_CHARS: 2000,
  SHEETS: {
    USERS: 'Users',
    CAROUSEL: 'Carousel',
    TABS: 'Tabs',
    TILES: 'Tiles'
  }
};

/* ------------------------------------------------------------------ */
/* Web app entry points                                                */
/* ------------------------------------------------------------------ */

function doGet() {
  // Health check only. Returns no data.
  return json_({ ok: true, data: { status: 'running' } });
}

function doPost(e) {
  try {
    var body = parseBody_(e);
    switch (body.action) {
      case 'login':
        return json_(handleLogin_(body));
      case 'content':
        return json_(handleContent_(body));
      default:
        return json_(fail_('BAD_REQUEST', 'Unknown request.'));
    }
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return json_(fail_('SERVER_ERROR', 'Something went wrong. Please try again.'));
  }
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

function handleLogin_(body) {
  var identifier = String(body.identifier || '').trim().toLowerCase();
  var password = String(body.password || '');

  if (!identifier || !password || identifier.length > 100 || password.length > 200) {
    Utilities.sleep(CONFIG.FAIL_DELAY_MS);
    return fail_('INVALID_CREDENTIALS', 'Invalid username or password.');
  }

  var cache = CacheService.getScriptCache();
  var failKey = 'fail_' + sha256Hex_(identifier).slice(0, 32);
  var failures = Number(cache.get(failKey) || 0);
  if (failures >= CONFIG.MAX_FAILED_ATTEMPTS) {
    return fail_('LOCKED', 'Too many failed attempts. Please try again in 15 minutes.');
  }

  var user = findUser_(identifier);
  var valid = false;
  if (user && isTrue_(user.active) && user.salt && user.passwordHash) {
    valid = safeEqual_(hashPassword_(password, String(user.salt)), String(user.passwordHash));
  } else {
    // Unknown/inactive user: do the same amount of work so timing does not reveal which accounts exist.
    hashPassword_(password, 'timing-equaliser');
  }

  if (!valid) {
    cache.put(failKey, String(failures + 1), CONFIG.LOCK_SECONDS);
    Utilities.sleep(CONFIG.FAIL_DELAY_MS);
    return fail_('INVALID_CREDENTIALS', 'Invalid username or password.');
  }

  cache.remove(failKey);
  var exp = Date.now() + CONFIG.TOKEN_TTL_MS;
  var token = signToken_({ sub: String(user.username).toLowerCase(), exp: exp });

  return ok_({
    token: token,
    exp: exp,
    user: {
      name: String(user.name || user.username),
      email: String(user.email || ''),
      role: String(user.role || 'user')
    }
  });
}

function handleContent_(body) {
  var user = authenticate_(body.token);
  if (!user) {
    return fail_('UNAUTHORIZED', 'Your session has expired. Please log in again.');
  }
  return ok_({
    carousel: readContent_(CONFIG.SHEETS.CAROUSEL, ['id', 'title', 'text', 'imageUrl', 'linkUrl', 'linkText']),
    tabs: readContent_(CONFIG.SHEETS.TABS, ['id', 'label', 'path', 'icon']),
    tiles: readContent_(CONFIG.SHEETS.TILES, ['id', 'title', 'description', 'icon', 'path'])
  });
}

/* ------------------------------------------------------------------ */
/* Authentication helpers                                              */
/* ------------------------------------------------------------------ */

function authenticate_(token) {
  var payload = verifyToken_(token);
  if (!payload) return null;
  var user = findUser_(payload.sub);
  if (!user || !isTrue_(user.active)) return null; // disabled users lose access immediately
  return user;
}

function signToken_(payload) {
  var p = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256(p, getSecret_()));
  return p + '.' + sig;
}

function verifyToken_(token) {
  if (typeof token !== 'string' || token.length > 1000) return null;
  var parts = token.split('.');
  if (parts.length !== 2) return null;
  var expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256(parts[0], getSecret_()));
  if (!safeEqual_(parts[1], expected)) return null;
  try {
    var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    if (!payload || !payload.sub || !payload.exp || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function getSecret_() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('TOKEN_SECRET');
  if (secret) return secret;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    secret = props.getProperty('TOKEN_SECRET');
    if (!secret) {
      secret = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
      props.setProperty('TOKEN_SECRET', secret);
    }
  } finally {
    lock.releaseLock();
  }
  return secret;
}

/** Run once from the editor if you want to ROTATE the secret (this logs everyone out). */
function rotateTokenSecret() {
  PropertiesService.getScriptProperties().deleteProperty('TOKEN_SECRET');
  getSecret_();
}

function hashPassword_(password, salt) {
  var h = sha256Hex_(salt + ':' + password);
  for (var i = 1; i < CONFIG.HASH_ITERATIONS; i++) {
    h = sha256Hex_(h + ':' + salt);
  }
  return h;
}

function sha256Hex_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    out += ('0' + (bytes[i] & 0xff).toString(16)).slice(-2);
  }
  return out;
}

function safeEqual_(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/* ------------------------------------------------------------------ */
/* Sheet access                                                        */
/* ------------------------------------------------------------------ */

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  throw new Error('Run saveSheetId once from the editor.');
}
function saveSheetId() {
  var id = SpreadsheetApp.getActiveSpreadsheet().getId();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', id);
  Logger.log('Saved sheet id: ' + id);
}
function readTable_(sheetName) {
  var sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      obj[headers[c]] = values[r][c];
      if (values[r][c] !== '' && values[r][c] !== null) empty = false;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

function findUser_(identifier) {
  var needle = String(identifier || '').trim().toLowerCase();
  if (!needle) return null;
  var users = readTable_(CONFIG.SHEETS.USERS);
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (String(u.username).trim().toLowerCase() === needle ||
        String(u.email).trim().toLowerCase() === needle) {
      return u;
    }
  }
  return null;
}

function readContent_(sheetName, fields) {
  var rows = readTable_(sheetName).filter(function (row) { return !isFalse_(row.active); });
  rows.sort(function (a, b) { return Number(a.order || 9999) - Number(b.order || 9999); });
  return rows.map(function (row) {
    var out = {};
    fields.forEach(function (f) { out[f] = row[f] === undefined || row[f] === null ? '' : String(row[f]).trim(); });
    return out;
  });
}

function isTrue_(v) {
  return v === true || /^(true|yes|1)$/i.test(String(v).trim());
}

function isFalse_(v) {
  return v === false || /^(false|no|0)$/i.test(String(v).trim());
}

/* ------------------------------------------------------------------ */
/* Response helpers                                                    */
/* ------------------------------------------------------------------ */

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Empty request');
  if (e.postData.contents.length > CONFIG.MAX_BODY_CHARS) throw new Error('Request too large');
  return JSON.parse(e.postData.contents);
}

function ok_(data) {
  return { ok: true, data: data };
}

function fail_(code, message) {
  return { ok: false, code: code, message: message };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Admin tools (shown in the Sheet under the "Portal Admin" menu)       */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Portal Admin')
    .addItem('1. Create sheets with sample data', 'setupSheets')
    .addItem('2. Add or update a user...', 'addOrUpdateUser')
    .addToUi();
}

function setupSheets() {
  var ss = getSpreadsheet_();
  var definitions = {
    Users: {
      headers: ['username', 'email', 'name', 'passwordHash', 'salt', 'role', 'active'],
      rows: []
    },
    Carousel: {
      headers: ['id', 'title', 'text', 'imageUrl', 'linkUrl', 'linkText', 'order', 'active'],
      rows: [
        [1, 'Welcome to Company Portal', 'Your one place for reports, services and company updates.', 'https://picsum.photos/seed/portal-welcome/1600/600', '/app/reports', 'View reports', 1, true],
        [2, 'Quarterly Reports Available', 'The latest quarterly performance reports are ready to view.', 'https://picsum.photos/seed/portal-reports/1600/600', '/app/services', 'Explore services', 2, true],
        [3, 'Scheduled Maintenance', 'Some services will be unavailable on Sunday between 2:00 and 4:00 AM IST.', 'https://picsum.photos/seed/portal-maintenance/1600/600', '', '', 3, true]
      ]
    },
    Tabs: {
      headers: ['id', 'label', 'path', 'icon', 'order', 'active'],
      rows: [
        [1, 'Home', '/app/home', 'home', 1, true],
        [2, 'Reports', '/app/reports', 'reports', 2, true],
        [3, 'Services', '/app/services', 'services', 3, true],
        [4, 'Settings', '/app/settings', 'settings', 4, true],
        [5, 'Logout', '/logout', 'logout', 5, true]
      ]
    },
    Tiles: {
      headers: ['id', 'title', 'description', 'icon', 'path', 'order', 'active'],
      rows: [
        [1, 'Reports', 'View and download business reports and analytics.', 'reports', '/app/reports', 1, true],
        [2, 'Services', 'Browse available services and submit requests.', 'services', '/app/services', 2, true],
        [3, 'Settings', 'Manage your profile and preferences.', 'settings', '/app/settings', 3, true],
        [4, 'Documents', 'Policies, templates and shared files.', 'docs', '/app/module/documents', 4, true],
        [5, 'Support', 'Raise a ticket or contact the help desk.', 'support', '/app/module/support', 5, true],
        [6, 'Calendar', 'Upcoming events, holidays and deadlines.', 'calendar', '/app/module/calendar', 6, true],
        [7, 'Team Directory', 'Find colleagues and departments.', 'users', '/app/module/directory', 7, true],
        [8, 'Notifications', 'Alerts and recent activity.', 'bell', '/app/module/notifications', 8, true]
      ]
    }
  };

  var created = [];
  Object.keys(definitions).forEach(function (name) {
    if (ss.getSheetByName(name)) return; // never overwrite existing data
    var def = definitions[name];
    var sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold').setBackground('#e8eefc');
    sheet.setFrozenRows(1);
    if (def.rows.length) {
      sheet.getRange(2, 1, def.rows.length, def.headers.length).setValues(def.rows);
    }
    created.push(name);
  });

  var ui = SpreadsheetApp.getUi();
  ui.alert(created.length
    ? 'Created sheets: ' + created.join(', ') + '.\n\nNext: Portal Admin > Add or update a user.'
    : 'All sheets already exist. Nothing was changed.');
}

function addOrUpdateUser() {
  var ui = SpreadsheetApp.getUi();
  var sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet) {
    ui.alert('Run "Create sheets with sample data" first.');
    return;
  }

  var username = ask_(ui, 'Username (letters, numbers, . _ -)');
  if (username === null) return;
  username = username.toLowerCase();
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) { ui.alert('Invalid username. Use 3-50 letters, numbers, dot, underscore or hyphen.'); return; }

  var email = ask_(ui, 'Email address');
  if (email === null) return;
  email = email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ui.alert('Invalid email address.'); return; }

  var name = ask_(ui, 'Display name');
  if (name === null) return;

  var role = ask_(ui, 'Role (for example: admin or user)');
  if (role === null) return;

  var password = ask_(ui, 'Password - minimum 10 characters, with letters and numbers.\nNote: Google shows this text while you type, so make sure nobody is watching.');
  if (password === null) return;
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    ui.alert('Password too weak. Use at least 10 characters including letters and numbers.');
    return;
  }

  var salt = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var hash = hashPassword_(password, salt);

  // Find existing row for this username or email; otherwise append.
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]).toLowerCase() === username || String(data[r][1]).toLowerCase() === email) {
      rowIndex = r + 1;
      break;
    }
  }
  if (rowIndex === -1) rowIndex = Math.max(sheet.getLastRow(), 1) + 1;

  // Store hash and salt as plain text so Sheets never reinterprets them as numbers.
  sheet.getRange(rowIndex, 4, 1, 2).setNumberFormat('@');
  sheet.getRange(rowIndex, 1, 1, 7).setValues([[username, email, name || username, hash, salt, role || 'user', true]]);

  ui.alert('User "' + username + '" saved. The password itself was not stored.');
}

function ask_(ui, prompt) {
  var res = ui.prompt('Portal Admin', prompt, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return null;
  return String(res.getResponseText()).trim();
}
function debugLogin() {
  var out = doPost({ postData: { contents: JSON.stringify({
    action: 'login', identifier: 'akhilesh', password: 'wrongpassword123'
  }) } });
  Logger.log(out.getContent());
}
