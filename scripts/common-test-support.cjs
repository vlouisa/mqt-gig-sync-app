/** Bouwt per service uitsluitend in-memory afhankelijkheden voor de unit-runner. */
module.exports = function commonSetup(kind) {
  const base = `
    const unit = {
      calls: [], properties: {}, cache: {}, sheets: {}, row: {}, columnMap: { Status: 3 },
      status: 'DRAFT', allowed: true, activeEmail: 'admin@example.invalid',
      context: null, userHandled: false, statusHandled: false, failAt: '',
      record(name, ...args) {
        this.calls.push({ name, args });
        if (this.failAt === name) throw new Error(name + ' failed');
      },
      all(name) { return this.calls.filter(call => call.name === name).map(call => call.args); }
    };
    const PropertiesService = { getScriptProperties: () => ({ getProperty(key) {
      unit.record('property', key); return unit.properties[key] ?? null;
    } }) };
    const Session = {
      getActiveUser: () => ({ getEmail: () => unit.activeEmail }),
      getScriptTimeZone: () => 'Europe/Brussels'
    };
    const Utilities = { formatDate(date, zone, pattern) {
      unit.record('format', date, zone, pattern);
      return pattern === 'dd-MM-yyyy hh' ? '25-09-2026 08' : '25-09-2026 08:15:30';
    } };
  `;
  const properties = kind === 'properties' ? '' : `
    const appPropertiesService = {
      getCalendarId: () => 'unit-calendar', getAdminEmail: () => 'admin@example.invalid'
    };
  `;
  const logging = kind === 'log' ? `
    const console = { log: value => unit.record('console', value) };
  ` : `
    const logService = { forModule: module => ({
      info: (...args) => unit.record('info', module, ...args),
      warn: (...args) => unit.record('warn', module, ...args),
      error: (...args) => unit.record('error', module, ...args)
    }) };
  `;
  const sheets = `
    function makeSheet(name, values) {
      const sheet = {
        getName: () => name,
        getLastColumn: () => values[0].length,
        getMaxRows: () => 100,
        getDataRange: () => ({ getValues: () => values }),
        appendRow(row) { unit.record('append', name, row); },
        getProtections(type) { unit.record('protections', name, type); return unit.protections || []; },
        getRange(row, column, rows, columns) {
          unit.record('range', name, row, column, rows, columns);
          return {
            getValues: () => values.slice(row - 1, row - 1 + rows).map(value => value.slice(column - 1, column - 1 + columns)),
            getValue: () => unit.status,
            setValue(value) { unit.record('set', name, row, column, value); },
            protect() {
              unit.record('protect', name, row, column, rows, columns);
              return {
                setDescription: value => unit.record('description', value),
                setWarningOnly: value => unit.record('warningOnly', value),
                getEditors: () => ['old@example.invalid'],
                removeEditors: editors => unit.record('removeEditors', editors),
                addEditor: editor => unit.record('addEditor', editor)
              };
            }
          };
        }
      };
      unit.sheets[name] = sheet;
      return sheet;
    }
    const SpreadsheetApp = {
      ProtectionType: { RANGE: 'RANGE' },
      getActiveSpreadsheet: () => ({ getSheetByName(name) {
        unit.record('sheet', name); return unit.sheets[name] || null;
      } })
    };
    const CacheService = { getScriptCache: () => ({
      get(key) { unit.record('cacheGet', key); return unit.cache[key] || null; },
      put(key, value, ttl) { unit.record('cachePut', key, value, ttl); unit.cache[key] = value; },
      remove(key) { unit.record('cacheRemove', key); delete unit.cache[key]; }
    }) };
  `;
  const sheetStub = `
    const sheetService = {
      getSheet(name) { unit.record('sheet', name); return unit.sheets[name]; },
      getHeaders(sheet) { unit.record('headers', sheet); return unit.headers; },
      getColumnIndexMapCached(name) { unit.record('columnMap', name); return unit.columnMap; },
      getRowAsObject(...args) { unit.record('row', ...args); return unit.row; }
    };
  `;
  const edits = `
    const entry = Object.fromEntries(['gig', 'flight', 'hotel', 'blockedDate'].map(name =>
      [name, params => ({ domain: name, ...params })]));
    const auditService = { log: value => unit.record('audit', value) };
    function makeContext(columnName = 'Title') {
      return {
        sheetName: 'input', rowNumber: 4, columnNumber: 2, columnName,
        event: { range: { setValue: value => unit.record('restore', value) } },
        provider: { syncStatusColumn: 'Status', ignoredColumns: ['ID', 'Status'],
          auditEntryFactory: entry.gig,
          auditActions: { created: 'CREATED', changedAfterPublication: 'CHANGED' } }
      };
    }
  `;
  const statusStub = `
    const syncStatusService = {
      canTransition(...args) { unit.record('canTransition', ...args); return unit.allowed; },
      setStatus(row, to, sheet, column) {
        unit.record('transition', row, to, sheet, column);
        return { fromStatus: unit.row[column] || '', toStatus: to, changed: true };
      }
    };
  `;
  const setups = {
    properties: '', calendar: '', log: '',
    sheet: sheets,
    status: sheets + sheetStub,
    protection: sheets + sheetStub,
    context: sheetStub + edits,
    record: sheetStub + edits + statusStub,
    manual: sheetStub + edits + statusStub,
    dispatch: `
      const userOnEditService = { handle(e) { unit.record('user', e); return unit.userHandled; } };
      const onEditContextProvider = { getContext(e) { unit.record('context', e); return unit.context; } };
      const onEditSyncStatusService = { handleSyncStatusEdit(context) { unit.record('statusEdit', context); return unit.statusHandled; } };
      const onEditRecordService = { handleRecordEdit(context) { unit.record('recordEdit', context); } };
    `,
    notification: `
      function initNotifications() { unit.record('init'); }
      const Notify = {
        notificationFingerprintService: { create(values) { unit.record('fingerprint', values); return 'unit-fingerprint'; } },
        notificationPublisher: { publish(...args) { unit.record('publish', ...args); } }
      };
    `,
    menu: `
      const SpreadsheetApp = { getUi() {
        unit.record('ui');
        return { createMenu(name) {
          unit.record('menu', name);
          return {
            name,
            addItem(label, handler) { unit.record('item', name, label, handler); return this; },
            addSeparator() { return this; },
            addSubMenu(menu) { unit.record('submenu', name, menu.name); return this; },
            addToUi() { unit.record('addToUi', name); }
          };
        } };
      } };
    `
  };
  if (!Object.hasOwn(setups, kind)) throw new Error('Onbekende common-suite: ' + kind);
  return base + properties + logging + setups[kind];
};
