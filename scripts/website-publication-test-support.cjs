/** Alleen lokale VM-mocks; geen Google-services of echte WordPress-configuratie. */
function setup() {
  const unit = globalThis.unit = {
    sheets: {}, cache: {}, logs: [], requests: [], triggers: [], alerts: [],
    acquired: true, releases: 0, flushes: 0, uuid: 0,
    status: 201, body: { id: 2049, status: 'draft', type: 'event' },
    properties: { MQT_CALENDAR_ID: 'test', MQT_ADMIN_EMAIL: 'admin@example.invalid',
      WORDPRESS_BASE_URL: 'https://example.invalid/site/', WORDPRESS_USERNAME: 'test-user',
      WORDPRESS_APPLICATION_PASSWORD: 'dummy-application-password' },
    activeEmail: 'admin@example.invalid', time: new Date('2026-09-27T12:00:00Z')
  };
  globalThis.Session = { getScriptTimeZone: () => 'Europe/Brussels',
    getActiveUser: () => ({ getEmail: () => unit.activeEmail }) };
  globalThis.PropertiesService = { getScriptProperties: () => ({ getProperty: key => unit.properties[key] }) };
  globalThis.Utilities = {
    getUuid: () => 'generated-' + (++unit.uuid),
    base64Encode: value => { unit.encoded = value; return 'dummy-base64'; },
    formatDate(date, zone, pattern) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(date).map(part => [part.type, part.value]));
      if (pattern === 'yyyy-MM-dd') return parts.year + '-' + parts.month + '-' + parts.day;
      if (pattern === 'dd-MM-yyyy') return parts.day + '-' + parts.month + '-' + parts.year;
      if (pattern === 'HH:mm') return parts.hour + ':' + parts.minute;
      throw new Error('Unexpected date pattern');
    }
  };
  globalThis.logService = { forModule: module => ({
    info: (...args) => unit.logs.push(['info', module, ...args]),
    warn: (...args) => unit.logs.push(['warn', module, ...args]),
    error: (...args) => unit.logs.push(['error', module, ...args])
  }) };
  globalThis.CacheService = { getScriptCache: () => ({ get: key => unit.cache[key],
    put: (key, value) => { unit.cache[key] = value; }, remove: key => { delete unit.cache[key]; } }) };
  globalThis.LockService = { getScriptLock: () => ({ tryLock: () => unit.acquired,
    releaseLock: () => { unit.releases++; } }) };
  function range(sheet, row, column, rows = 1, columns = 1) {
    return {
      getSheet: () => sheet, getRow: () => row, getColumn: () => column,
      getNumRows: () => rows, getNumColumns: () => columns,
      getValues: () => Array.from({ length: rows }, (_, r) =>
        Array.from({ length: columns }, (_, c) => sheet.values[row + r - 1]?.[column + c - 1] ?? '')),
      getValue() { return this.getValues()[0][0]; },
      setValues(values) {
        if (unit.failWrite && unit.failWrite(sheet.name, row, column, values)) throw new Error('Sheet write failed');
        values.forEach((valuesRow, r) => valuesRow.forEach((value, c) => {
          if (!sheet.values[row + r - 1]) sheet.values[row + r - 1] = [];
          sheet.values[row + r - 1][column + c - 1] = value;
        }));
        return this;
      },
      setValue(value) { return this.setValues([[value]]); },
      setNumberFormat(format) { sheet.formats.push({ row, column, rows, columns, format }); return this; }
    };
  }
  unit.makeSheet = (name, values = []) => {
    const sheet = { name, values, formats: [], protections: [], maxRows: 100,
      getName: () => name, getLastRow: () => sheet.values.length,
      getLastColumn: () => Math.max(0, ...sheet.values.map(row => row.length)),
      getMaxRows: () => sheet.maxRows,
      insertRowsAfter: (after, count) => { sheet.maxRows += count; },
      insertColumnAfter: after => { sheet.values.forEach(row => row.splice(after, 0, '')); },
      getRange: (...args) => range(sheet, ...args),
      getDataRange: () => range(sheet, 1, 1, sheet.values.length, sheet.getLastColumn()),
      appendRow: row => { sheet.values.push([...row]); },
      setFrozenRows: rows => { sheet.frozenRows = rows; },
      getProtections: () => sheet.protections,
      protect() {
        const p = { editors: ['admin@example.invalid', 'other@example.invalid'], domain: true,
          setDescription(v) { this.description = v; return this; }, getDescription() { return this.description; },
          setWarningOnly(v) { this.warningOnly = v; }, addEditor(email) { this.editors.push(email); },
          getEditors() { return this.editors.map(email => ({ getEmail: () => email })); },
          removeEditors(editors) { this.editors = this.editors.filter(email => !editors.some(e => e.getEmail() === email)); },
          canDomainEdit() { return this.domain; }, setDomainEdit(v) { this.domain = v; },
          setUnprotectedRanges(ranges) { this.ranges = ranges; }
        };
        sheet.protections.push(p); return p;
      }
    };
    unit.sheets[name] = sheet; return sheet;
  };
  unit.select = (name, row, count = 1) => { unit.selection = [range(unit.sheets[name], row, 1, count)]; };
  globalThis.SpreadsheetApp = {
    ProtectionType: { SHEET: 'SHEET' },
    getActiveSpreadsheet: () => ({ getSheetByName: name => unit.sheets[name] || null,
      insertSheet: name => unit.makeSheet(name),
      getActiveRangeList: () => ({ getRanges: () => unit.selection || [] }) }),
    getUi: () => ({ alert: message => unit.alerts.push(message) }),
    flush() { unit.flushes++; if (unit.failFlush) throw new Error('Flush failed'); }
  };
  globalThis.UrlFetchApp = { fetch(url, options) {
    unit.requests.push({ url, options });
    if (unit.onFetch) unit.onFetch();
    if (unit.networkError) throw new Error('network failure with ' + unit.properties.WORDPRESS_APPLICATION_PASSWORD);
    return { getResponseCode: () => {
      if (unit.responseError) throw new Error('response failure with ' + unit.properties.WORDPRESS_APPLICATION_PASSWORD);
      return unit.status;
    },
      getContentText: () => unit.rawBody === undefined ? JSON.stringify(unit.body) : unit.rawBody };
  } };
  globalThis.ScriptApp = {
    getProjectTriggers: () => unit.triggers,
    deleteTrigger: trigger => { unit.triggers.splice(unit.triggers.indexOf(trigger), 1); },
    newTrigger: name => ({ timeBased() { return this; }, everyHours(n) { unit.interval = n; return this; },
      create() { if (unit.failTrigger) throw new Error('trigger create failed');
        unit.triggers.push({ getHandlerFunction: () => name }); } })
  };
  globalThis.systemStatusService = { update() { unit.statusUpdates = (unit.statusUpdates || 0) + 1; } };
}
module.exports = '(' + setup.toString() + ')();';
