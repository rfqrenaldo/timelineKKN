const SPREADSHEET_ID = '1vZzUZn4yOL62m4MxFbV7yV_DZZ9ouYDmS1hT0snFgwI';
const SHEET_NAME = 'Entries';
const HEADERS = ['id', 'timestamp', 'personId', 'memberName', 'date', 'startTime', 'endTime', 'category', 'activity', 'notes', 'hours'];

function doGet() {
  const sheet = ensureSheet();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  const entries = rows
    .filter((row) => row.some((value) => value !== ''))
    .map((row) => rowToEntry(row));

  return ContentService.createTextOutput(JSON.stringify(entries)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = parsePayload(e);
  const action = payload.action || 'create';
  const entry = normalizeEntry(payload.entry || payload);
  const sheet = ensureSheet();
  const rows = sheet.getDataRange().getValues();
  const existingIndex = findEntryRowIndex(rows, entry.id);

  if (action === 'delete') {
    if (existingIndex >= 2) {
      sheet.deleteRow(existingIndex);
    }
    return jsonResponse({ ok: true, action: 'delete', id: entry.id });
  }

  if (action === 'update') {
    if (existingIndex >= 2) {
      sheet.getRange(existingIndex, 1, 1, HEADERS.length).setValues([entryToRow(entry)]);
    } else {
      sheet.appendRow(entryToRow(entry));
    }
    return jsonResponse({ ok: true, action: 'update', entry });
  }

  if (!entry.id) {
    entry.id = Utilities.getUuid();
  }

  sheet.appendRow(entryToRow(entry));
  return jsonResponse({ ok: true, action: 'create', entry });
}

function parsePayload(e) {
  try {
    return JSON.parse(e?.postData?.contents || '{}');
  } catch {
    return {};
  }
}

function normalizeEntry(entry) {
  const normalized = {};
  HEADERS.forEach((header) => {
    normalized[header] = entry?.[header] ?? '';
  });
  normalized.id = normalized.id || Utilities.getUuid();
  normalized.timestamp = normalized.timestamp || new Date().toISOString();
  normalized.hours = Number(normalized.hours || 0);
  return normalized;
}

function entryToRow(entry) {
  return HEADERS.map((header) => entry[header] ?? '');
}

function rowToEntry(row) {
  const entry = {};
  HEADERS.forEach((header, index) => {
    entry[header] = row[index] ?? '';
  });
  entry.hours = Number(entry.hours || 0);
  return entry;
}

function findEntryRowIndex(rows, entryId) {
  if (!entryId) {
    return -1;
  }

  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index][0] === entryId) {
      return index + 1;
    }
  }

  return -1;
}

function ensureSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const currentHeaders = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0] : [];
  const headersMatch = HEADERS.every((header, index) => currentHeaders[index] === header);

  if (sheet.getLastRow() === 0 || !headersMatch) {
    sheet.clear();
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
