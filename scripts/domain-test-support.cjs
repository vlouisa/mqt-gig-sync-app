/** Bouwt uitsluitend lokale mocks binnen de VM, nooit in Apps Script. */
function bootstrap(domain, kind, serviceName) {
  const calls = [];
  const rows = [];
  const record = {
    rowNumber: 2, 'Gig ID': 'G-1', 'Flight ID': 'F-1', 'Hotel ID': 'H-1', 'Block ID': 'B-1',
    'Gig Status': 'CONFIRMED', Title: 'Show', Date: new Date(2026, 11, 31), Start: '23:00', End: '01:00',
    Location: 'Venue', Description: 'Details', 'Sound Engineer': 'Engineer',
    Flight: 'HV 123', Airline: 'Airline', 'Departure Airport': 'BRU', 'Arrival Airport': 'FCO',
    'Departure Date': '2026-12-31', 'Departure Time': '10:00',
    'Arrival Date': '2026-12-31', 'Arrival Time': '12:00', 'Arrival Location': '41, 12',
    Hotel: 'Hotel', Address: 'Street', Country: 'BE', 'Reservation Reference': 'BOOK-1',
    'Check-in Date': '2026-12-31', 'Check-out Date': '2027-01-02',
    Name: 'Member', Startdate: new Date(2026, 11, 31), Enddate: new Date(2026, 11, 31),
    SyncStatus: 'NEEDS_SYNC', LastError: 'old error', CalendarEventId: '',
    CreatedAt: new Date(2020, 0, 1)
  };
  const unit = globalThis.unit = {
    domain, kind, serviceName, calls, rows, record, existingEvent: null,
    threads: [], parsed: {}, imports: [], cache: [['header']], cacheExists: true,
    response: [], statusCode: 200, apiKey: 'fake-unit-key',
    getService() { return eval(serviceName); },
    call(name, ...args) { calls.push({ name, args }); },
    count(name) { return calls.filter(c => c.name === name).length; },
    last(name) { return calls.filter(c => c.name === name).at(-1)?.args; }
  };
  globalThis.appPropertiesService = {
    getCalendarId: () => 'unit-calendar', getAdminEmail: () => 'unit@example.invalid'
  };
  globalThis.logService = { forModule: () => ({
    info: (...args) => unit.call('info', ...args),
    warn: (...args) => unit.call('warn', ...args),
    error: (...args) => unit.call('error', ...args)
  }) };
  globalThis.Session = { getScriptTimeZone: () => 'Europe/Brussels' };
  globalThis.Utilities = {
    getUuid: () => 'unit-uuid',
    formatDate(date, zone, pattern) {
      if (zone !== 'Europe/Brussels') throw new Error('Unexpected timezone');
      const pad = n => String(n).padStart(2, '0');
      if (pattern === 'yyyy-MM-dd') return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      if (pattern === 'HH:mm') return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
      throw new Error('Unsupported test format: ' + pattern);
    }
  };
  globalThis.sheetService = {
    getRowsAsObjects: () => rows,
    getRowAsObject: number => rows.find(row => row.rowNumber === number),
    updateCell(number, column, value) {
      unit.call('updateCell', number, column, value);
      rows.find(row => row.rowNumber === number)[column] = value;
    },
    appendRowFromObject(sheet, row) { unit.call('append', sheet, row); rows.push(row); },
    getColumnIndexMapCached: () => ({ Name: 1, Email: 2, 'User ID': 3 }),
    getSheet: () => ({ getLastRow: () => rows.length + 1 })
  };
  const event = unit.event = { getId: () => 'event-1' };
  for (const method of ['setTitle', 'setTime', 'setAllDayDates', 'setDescription', 'setLocation', 'deleteEvent']) {
    event[method] = (...args) => unit.call(method, ...args);
  }
  globalThis.CalendarApp = { getCalendarById(id) {
    unit.call('calendar', id);
    return {
      getEventById(id) { unit.call('getEvent', id); return unit.existingEvent; },
      createEvent(...args) { unit.call('createEvent', ...args); return event; },
      createAllDayEvent(...args) { unit.call('createAllDayEvent', ...args); return event; }
    };
  } };
  if (kind === 'sync') {
    globalThis[domain + 'CalendarService'] = {
      createOrUpdateEvent(row) {
        unit.call('publish', row);
        if (row.fail) throw new Error('Calendar unavailable');
        return 'event-1';
      },
      deleteEvent(row) { unit.call('delete', row); if (row.fail) throw new Error('Calendar unavailable'); }
    };
    globalThis.syncStatusService = { setStatus(number, status) {
      const row = rows.find(row => row.rowNumber === number);
      const fromStatus = row.SyncStatus;
      row.SyncStatus = status;
      unit.call('status', number, status);
      return { fromStatus, toStatus: status, changed: fromStatus !== status };
    } };
    globalThis.entry = {};
    for (const key of ['gig', 'flight', 'hotel', 'blockedDate']) entry[key] = params => params;
    globalThis.auditService = { log: params => unit.call('audit', params) };
    globalThis.gigNotificationService = { publishGigPublished: row => unit.call('successNotification', row) };
    globalThis.syncFailedNotificationService = { publish: (...args) => unit.call('failureNotification', ...args) };
  }
  globalThis.initNotifications = () => unit.call('initNotifications');
  globalThis.Notify = {
    notificationFingerprintService: { create(values) { unit.call('fingerprint', values); return 'fingerprint-1'; } },
    notificationPublisher: { publish(...args) { unit.call('notify', ...args); } }
  };
  if (kind === 'import') {
    globalThis.flightApi = {
      getFlightByNumberAndDate(...args) { unit.call('numberLookup', ...args); return unit.response; },
      getFlightsByRouteAndTime(search) { unit.call('routeLookup', search); return unit.candidates; }
    };
    globalThis.flightToRecordMapper = { map(flight) {
      unit.call('map', flight);
      if (unit.mappingError) throw new Error('Mapping failed');
      return { Flight: flight.number, SyncStatus: 'NEEDS_SYNC' };
    } };
  }
  if (kind === 'mail') {
    globalThis.GmailApp = { getUserLabelByName(name) {
      if (name === unit.missingLabel) return null;
      return { name, getThreads: () => unit.threads };
    } };
    const parse = body => {
      unit.call('parse', body);
      const result = unit.parsed[body];
      if (result instanceof Error) throw result;
      return result;
    };
    globalThis.Flight = { FlightEmailParserService: { parse } };
    globalThis.Hotel = { HotelEmailParserService: { parse } };
    const imported = (...args) => unit.imports.push(args);
    globalThis.flightImportToSheetService = { importByFlightNumberAndDate: imported, importByRouteAndTime: imported };
    globalThis.hotelImportToSheetService = { import: imported };
    unit.thread = (...bodies) => {
      const thread = { labels: [], removed: [], getId: () => 'thread-1',
        getMessages: () => bodies.map(body => ({ getPlainBody: () => body })),
        addLabel: label => thread.labels.push(label.name),
        removeLabel: label => thread.removed.push(label.name)
      };
      unit.threads.push(thread);
      return thread;
    };
  }
  if (kind === 'api') {
    const cacheSheet = {
      getLastRow: () => unit.cache.length, getLastColumn: () => 13,
      getRange: () => ({ getValues: () => unit.cache.slice(1) }),
      appendRow: row => unit.cache.push(row),
      setFrozenRows: n => unit.call('freeze', n), hideSheet: () => unit.call('hide')
    };
    globalThis.SpreadsheetApp = { getActiveSpreadsheet: () => ({
      getSheetByName: () => unit.cacheExists ? cacheSheet : null,
      insertSheet(name) { unit.call('insertSheet', name); unit.cacheExists = true; return cacheSheet; }
    }) };
    globalThis.PropertiesService = { getScriptProperties: () => ({ getProperty: () => unit.apiKey }) };
    globalThis.UrlFetchApp = { fetch(url, options) {
      unit.call('fetch', url, options);
      return { getResponseCode: () => unit.statusCode,
        getContentText: () => unit.rawResponse === undefined ? JSON.stringify(unit.response) : unit.rawResponse };
    } };
  }
}

module.exports = (domain, kind, serviceName) =>
  `(${bootstrap.toString()})(${JSON.stringify(domain)}, ${JSON.stringify(kind)}, ${JSON.stringify(serviceName)});`;
