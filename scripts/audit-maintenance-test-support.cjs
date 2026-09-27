/** Uitsluitend in-memory mocks voor Sheet, Drive en locks. */
function setup() {
  const unit = globalThis.unit = { rows: [['Date','Action','ID','Title','Old','New','User','Details']],
    props: {}, files: [], deleted: [], locks: 0, releases: 0, documentAvailable: true,
    scriptAvailable: true, admin: true, now: new Date('2026-09-27T12:00:00Z') };
  unit.add = (timestamp, details = 'a|b\nc') => unit.rows.push([timestamp,'TEST','id','Title','','','user@example.invalid',details]);
  globalThis.CONFIG = { auditLog: { sheetName: 'audit-log' }, adminEmail: 'admin@example.invalid' };
  globalThis.Session = { getActiveUser: () => ({ getEmail: () => unit.admin ? CONFIG.adminEmail : 'other@example.invalid' }) };
  globalThis.logService = { forModule: () => ({ info() {}, warn() {} }) };
  globalThis.PropertiesService = { getScriptProperties: () => ({
    getProperty: key => unit.props[key] ?? null,
    setProperty(key, value) { unit.props[key] = value; },
    deleteProperty(key) { delete unit.props[key]; }
  }) };
  globalThis.LockService = {
    getDocumentLock: () => ({ tryLock: () => { if (!unit.documentAvailable) return false; unit.locks++; return true; },
      releaseLock: () => { unit.locks--; unit.releases++; } }),
    getScriptLock: () => ({ tryLock: () => unit.scriptAvailable, releaseLock() { unit.scriptReleased = true; } })
  };
  globalThis.SpreadsheetApp = { flush() {}, getUi: () => ({ alert: message => { unit.message = message; } }) };
  unit.sheet = { getLastColumn: () => unit.rows[0].length, getLastRow: () => unit.rows.length,
    getDataRange: () => ({ getValues: () => unit.rows.map(row => [...row]) }),
    getParent: () => ({ getId: () => 'spreadsheet-test' }), getSheetId: () => 42,
    appendRow: row => { if (unit.locks !== 1) throw new Error('Missing audit lock'); unit.rows.push(row); },
    deleteRows(start, count) {
      if (unit.failDelete) throw new Error('Delete failed');
      if (unit.locks !== 1) throw new Error('Missing deletion lock');
      unit.deleted.push([start, count]); unit.rows.splice(start - 1, count);
      if (unit.ambiguousDelete) throw new Error('Delete response lost');
    }
  };
  globalThis.sheetService = { getSheet: () => unit.sheet };
  globalThis.Utilities = { DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' },
    computeDigest: text => [1,2,3], getUuid: () => 'batch-test', formatDate: () => '20260927_120000',
    newBlob(content, type, name) { return { content, type, name,
      getBytes: () => ({ length: unit.oversize ? 6000000 : content.length }),
      setName(value) { this.name = value; return this; }, getDataAsString: () => content }; }
  };
  globalThis.DriveApp = { getFolderById(id) {
    unit.folder = id;
    if (unit.folderError) throw new Error('Folder access denied');
    return { createFile(blob) {
      if (unit.locks) throw new Error('Drive called under document lock');
      if (unit.driveError) throw new Error('Drive failed');
      if (unit.onCreate) unit.onCreate();
      const file = { blob, getId: () => 'file-' + unit.files.indexOf(file),
        getUrl: () => 'https://example.invalid/archive',
        getBlob: () => ({ getDataAsString: () => unit.corrupt ? 'corrupt' : blob.content }) };
      unit.files.push(file); return file;
    } };
  } };
}
module.exports = '(' + setup.toString() + ')();';
