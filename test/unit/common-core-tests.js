/** Beide publieke getters lezen de juiste Script Property. */
function testCommonPropertiesValues() {
  requireCommonUnit_();
  unit.properties = { MQT_CALENDAR_ID: 'calendar@example.invalid', MQT_ADMIN_EMAIL: 'admin@example.invalid' };
  assertEquals('calendar@example.invalid', appPropertiesService.getCalendarId());
  assertEquals('admin@example.invalid', appPropertiesService.getAdminEmail());
  assertCommonData_([['MQT_CALENDAR_ID'], ['MQT_ADMIN_EMAIL']], unit.all('property'));
}

/** Ontbrekende en lege properties geven een fout met uitsluitend de key. */
function testCommonPropertiesMissing() {
  requireCommonUnit_();
  [null, '', undefined].forEach(value => {
    unit.properties = { MQT_CALENDAR_ID: value, MQT_ADMIN_EMAIL: value };
    assertThrows(() => appPropertiesService.getCalendarId(), 'Script property ontbreekt: MQT_CALENDAR_ID');
    assertThrows(() => appPropertiesService.getAdminEmail(), 'Script property ontbreekt: MQT_ADMIN_EMAIL');
  });
}

/** Waarden worden niet getrimd of permanent gecachet. */
function testCommonPropertiesFreshRead() {
  requireCommonUnit_();
  unit.properties.MQT_CALENDAR_ID = ' first ';
  assertEquals(' first ', appPropertiesService.getCalendarId());
  unit.properties.MQT_CALENDAR_ID = 'second';
  assertEquals('second', appPropertiesService.getCalendarId());
}

/** Lokale datum- en klokvelden worden gecombineerd zonder invoermutatie. */
function testCommonCalendarDateObjects() {
  requireCommonUnit_();
  const date = new Date(2026, 8, 25, 12, 34, 56, 789);
  const time = new Date(2000, 0, 1, 20, 15, 30, 123);
  const before = [date.getTime(), time.getTime()];
  const result = calendarService.buildDateTime(date, time);
  assertEquals(new Date(2026, 8, 25, 20, 15, 30).getTime(), result.getTime());
  assertCommonData_(before, [date.getTime(), time.getTime()]);
  assertTrue(result !== date && result !== time);
}

/** Datumstrings en tijden met en zonder seconden worden ondersteund. */
function testCommonCalendarStrings() {
  requireCommonUnit_();
  assertEquals(new Date(2026, 8, 25, 0, 0).getTime(), calendarService.buildDateTime('2026-09-25', '00:00').getTime());
  assertEquals(new Date(2026, 8, 25, 23, 59, 42).getTime(), calendarService.buildDateTime('2026-09-25', '23:59:42').getTime());
}

/** Ongeldige datum- en tijdwaarden falen met een gerichte foutmelding. */
function testCommonCalendarInvalid() {
  requireCommonUnit_();
  assertThrows(() => calendarService.buildDateTime('invalid', '20:00'), 'Ongeldige datumwaarde: invalid');
  assertThrows(() => calendarService.buildDateTime(new Date(NaN), '20:00'), 'Ongeldige datumwaarde: Invalid Date');
  ['invalid', '25:00', '', undefined].forEach(time => {
    assertThrows(() => calendarService.buildDateTime('2026-09-25', time), `Ongeldige tijdwaarde: ${time}`);
  });
  assertThrows(() => calendarService.buildDateTime('2026-09-25', new Date(NaN)), 'Ongeldige tijdwaarde: Invalid Date');
}

/** Alle loglevels schrijven gestructureerde JSON met een geldig timestamp. */
function testCommonLogLevels() {
  requireCommonUnit_();
  const before = Date.now();
  const log = logService.forModule('unit-module');
  ['info', 'warn', 'error'].forEach(level => log[level]('action', 'Bericht', 'Details'));
  const after = Date.now();
  assertEquals(3, unit.all('console').length);
  unit.all('console').forEach(([value], index) => {
    const parsed = JSON.parse(value);
    const timestamp = Date.parse(parsed.timestamp);
    assertTrue(timestamp >= before && timestamp <= after);
    assertEquals(new Date(timestamp).toISOString(), parsed.timestamp);
    delete parsed.timestamp;
    assertCommonData_({ level: ['INFO', 'WARN', 'ERROR'][index], module: 'unit-module', action: 'action', message: 'Bericht', details: 'Details' }, parsed);
  });
}

/** Defaults, escaping en modulenaam blijven onafhankelijk per logger. */
function testCommonLogDefaults() {
  requireCommonUnit_();
  const first = logService.forModule('first');
  const second = logService.forModule('second');
  first.info('action', 'Regel 1\n"Regel 2"');
  second.warn('warn', 'Bericht');
  first.error('error', 'Bericht');
  const logs = unit.all('console').map(([value]) => JSON.parse(value));
  assertCommonData_(['first', 'second', 'first'], logs.map(log => log.module));
  assertCommonData_(['', '', ''], logs.map(log => log.details));
  assertEquals('Regel 1\n"Regel 2"', logs[0].message);
}

/** Notify ontvangt bron-ID, foutdetails en de fingerprint van deze fout en dit uur. */
function testCommonFailureNotification() {
  requireCommonUnit_();
  const payload = { sourceId: 'gig-1', entity: 'gig', recordTitle: 'Concert', rowNumber: 4, errorMessage: 'Calendar failed' };
  const before = Date.now();
  syncFailedNotificationService.publish('GIG_SYNC_FAILED', payload);
  const after = Date.now();
  assertEquals('init', unit.calls[0].name);
  assertCommonData_([['GIG_SYNC_FAILED', 'gig-1', 'Calendar failed', '25-09-2026 08']], unit.all('fingerprint').map(args => args[0]));
  assertCommonData_([['GIG_SYNC_FAILED', { sourceId: 'gig-1', notificationFingerprint: 'unit-fingerprint',
    entity: 'gig', recordTitle: 'Concert', date: '25-09-2026 08:15:30', rowNumber: 4, errorMessage: 'Calendar failed' }]], unit.all('publish'));
  const formats = unit.all('format');
  assertEquals(2, formats.length);
  assertCommonData_(['dd-MM-yyyy hh', 'dd-MM-yyyy hh:mm:ss'], formats.map(args => args[2]));
  formats.forEach(([date, zone]) => {
    assertTrue(date instanceof Date && date.getTime() >= before && date.getTime() <= after);
    assertEquals('Europe/Brussels', zone);
  });
  assertEquals(undefined, payload.notificationFingerprint);
}

/** Initialisatie-, fingerprint- en publicatiefouten blijven zichtbaar, zonder retry. */
function testCommonFailureNotificationErrors() {
  requireCommonUnit_();
  ['init', 'fingerprint', 'publish'].forEach(stage => {
    unit.calls = [];
    unit.failAt = stage;
    assertThrows(() => syncFailedNotificationService.publish('FAILED', { sourceId: 'id', errorMessage: 'error' }), `${stage} failed`);
    assertEquals(stage === 'publish' ? 1 : 0, unit.all('publish').length);
    assertEquals(1, unit.all(stage).length);
  });
}

/** De veilige variant gebruikt dezelfde payload en publiceert precies eenmaal. */
function testCommonTryFailureNotification() {
  requireCommonUnit_();
  const payload = { sourceId: 'gig-1', entity: 'Gig', rowNumber: 4, errorMessage: 'Calendar failed' };
  syncFailedNotificationService.publish('GIG_SYNC_FAILED', payload);
  const expected = unit.all('publish')[0];
  unit.calls = [];
  syncFailedNotificationService.tryPublish('GIG_SYNC_FAILED', payload);
  assertCommonData_([expected], unit.all('publish'));
  assertEquals(1, unit.all('init').length);
  assertEquals(0, unit.all('warn').length + unit.all('error').length);
}

/** Zonder identiteit wordt Notify niet geïnitialiseerd of aangeroepen. */
function testCommonTryFailureNotificationMissingId() {
  requireCommonUnit_();
  syncFailedNotificationService.tryPublish('HOTEL_SYNC_FAILED', { entity: 'Hotel', rowNumber: 3 });
  assertEquals(0, unit.all('init').length + unit.all('publish').length);
  assertEquals(1, unit.all('warn').length);
  assertCommonData_(['sync-failed-notification-service', 'sync-failed-notification-skipped',
    'Foutnotificatie overgeslagen: bron-ID ontbreekt.',
    'Event: HOTEL_SYNC_FAILED, Entity: Hotel, SourceId: , Row: 3'], unit.all('warn')[0]);
}

/** Elke publicatiestap mag falen; de fout blijft gelogd zonder exception of retry. */
function testCommonTryFailureNotificationErrors() {
  requireCommonUnit_();
  for (const stage of ['init', 'fingerprint', 'format', 'publish']) {
    unit.calls = [];
    unit.failAt = stage;
    syncFailedNotificationService.tryPublish('FLIGHT_SYNC_FAILED', {
      sourceId: 'F-1', entity: 'Flight', rowNumber: 2, errorMessage: 'Calendar failed'
    });
    assertEquals(1, unit.all(stage).length);
    assertEquals(stage === 'publish' ? 1 : 0, unit.all('publish').length);
    assertEquals(1, unit.all('error').length);
    assertCommonData_(['sync-failed-notification-service', 'sync-failed-notification-error',
      stage + ' failed', 'Event: FLIGHT_SYNC_FAILED, Entity: Flight, SourceId: F-1, Row: 2'],
      unit.all('error')[0]);
  }
}
