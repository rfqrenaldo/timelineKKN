const SPREADSHEET_ID = '1Ux6qibeqzXhEafm3LYZfUY36UOYrJ0tPSO-t-rlMfY';
const SHEET_NAME = 'Entries';
const HEADERS = ['id', 'timestamp', 'personId', 'memberName', 'date', 'startTime', 'endTime', 'category', 'activity', 'notes', 'hours', 'completed'];

function doGet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureSheet(spreadsheet);
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);
  const timezone = spreadsheet.getSpreadsheetTimeZone();

  const entries = rows
    .filter((row) => row.some((value) => value !== ''))
    .map((row) => rowToEntry(row, timezone));

  return ContentService.createTextOutput(JSON.stringify(entries)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = parsePayload(e);
  const action = payload.action || 'create';
  const entry = normalizeEntry(payload.entry || payload);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureSheet(spreadsheet);
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
  normalized.completed = entry.completed === true || entry.completed === 'true' || entry.completed === 'TRUE';
  return normalized;
}

function entryToRow(entry) {
  return HEADERS.map((header) => entry[header] ?? '');
}

function rowToEntry(row, timezone) {
  const entry = {};
  timezone = timezone || 'GMT';
  HEADERS.forEach((header, index) => {
    let value = row[index] ?? '';
    if (value instanceof Date) {
      if (header === 'date') {
        value = Utilities.formatDate(value, timezone, "yyyy-MM-dd");
      } else if (header === 'startTime' || header === 'endTime') {
        value = Utilities.formatDate(value, timezone, "HH:mm");
      } else if (header === 'timestamp') {
        value = value.toISOString();
      }
    } else if (value !== null && value !== undefined) {
      if (header === 'completed') {
        value = value === true || value === 'true' || value === 'TRUE' || value === 1;
      } else {
        value = String(value).trim();
        if (header === 'date' && value.includes('T')) {
          value = value.split('T')[0];
        } else if ((header === 'startTime' || header === 'endTime') && value.includes('T')) {
          const parts = value.split('T');
          if (parts[1]) value = parts[1].substring(0, 5);
        }
      }
    }
    entry[header] = value;
  });
  entry.hours = Number(entry.hours || 0);
  // Ensure completed is boolean
  entry.completed = entry.completed === true || entry.completed === 'true' || entry.completed === 'TRUE' || entry.completed === 1;
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

function ensureSheet(spreadsheet) {
  const ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
    const headersMatch = HEADERS.every((header, index) => currentHeaders[index] === header);
    if (!headersMatch) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }
  }

  return sheet;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
