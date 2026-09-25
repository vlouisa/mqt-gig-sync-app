/** Voorkomt dat deze tests echte Session- of Sheet-services gebruiken. */
function requireAuditUnit_() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
}

/** Controleert timestamp en de vaste volgorde van alle acht auditkolommen. */
function assertAuditRow_(auditEntry, expected) {
  requireAuditUnit_();
  const before = Date.now();
  const row = auditEntry.toRow();
  const after = Date.now();
  assertEquals(8, row.length);
  assertTrue(row[0] instanceof Date);
  assertTrue(row[0].getTime() >= before && row[0].getTime() <= after);
  assertEquals(JSON.stringify(expected), JSON.stringify(row.slice(1)));
}

/** Basisvelden blijven in de juiste kolommen staan; entityvelden zijn leeg. */
function testAuditBaseRow() {
  requireAuditUnit_();
  const auditEntry = new BaseAuditEntry({
    action: 'PUBLISHED', oldStatus: 'NEEDS_SYNC', newStatus: 'SYNCED', details: 'CalendarEventId: event-1'
  });
  assertEquals('', auditEntry.getEntityType());
  assertAuditRow_(auditEntry, ['PUBLISHED', '', '', 'NEEDS_SYNC', 'SYNCED', unit.activeEmail, 'CalendarEventId: event-1']);
  assertEquals(0, unit.effectiveCalls);
}

/** Ontbrekende en null-velden krijgen de bestaande lege defaults. */
function testAuditBaseDefaults() {
  requireAuditUnit_();
  [{}, { action: null, oldStatus: null, newStatus: null, details: null }].forEach(params => {
    assertAuditRow_(new BaseAuditEntry(params), ['', '', '', '', '', unit.activeEmail, '']);
  });
}

/** Zonder actieve gebruiker wordt de effectieve gebruiker vastgelegd. */
function testAuditEffectiveUserFallback() {
  requireAuditUnit_();
  unit.activeEmail = '';
  assertAuditRow_(new BaseAuditEntry({}), ['', '', '', '', '', unit.effectiveEmail, '']);
  assertEquals(1, unit.effectiveCalls);
}

/** Zonder beschikbare e-mailadressen wordt unknown vastgelegd. */
function testAuditUnknownUserFallback() {
  requireAuditUnit_();
  unit.activeEmail = '';
  unit.effectiveEmail = '';
  assertAuditRow_(new BaseAuditEntry({}), ['', '', '', '', '', 'unknown', '']);
}

/** Het compatibiliteitsargument overschrijft de Session-identiteit niet. */
function testAuditIgnoresUserArgument() {
  requireAuditUnit_();
  assertEquals(unit.activeEmail, new BaseAuditEntry({}).toRow('supplied@example.invalid')[6]);
}

/** Fixtures gebruiken de geconfigureerde headers voor iedere domeinklasse. */
function auditDomainCases_() {
  requireAuditUnit_();
  const columns = CONFIG.entities;
  return [
    { factory: entry.gig, type: GigAuditEntry, entity: 'gig', title: 'Concert',
      record: { [columns.gig.columns.gigId]: 'id-1', [columns.gig.columns.title]: 'Concert' } },
    { factory: entry.flight, type: FlightAuditEntry, entity: 'flight', title: 'BRU -> LHR',
      record: { [columns.flight.columns.flightId]: 'id-1',
        [columns.flight.columns.departureAirport]: 'BRU', [columns.flight.columns.arrivalAirport]: 'LHR' } },
    { factory: entry.hotel, type: HotelAuditEntry, entity: 'hotel', title: 'Test Hotel',
      record: { [columns.hotel.columns.hotelId]: 'id-1', [columns.hotel.columns.hotel]: 'Test Hotel' } },
    { factory: entry.blockedDate, type: BlockedDateAuditEntry, entity: 'blocked-date', title: 'Test User',
      record: { [columns.blockedDate.columns.blockId]: 'id-1', [columns.blockedDate.columns.name]: 'Test User' } }
  ];
}

/** Alle subclasses serialiseren hun record en de overgeërfde statusvelden. */
function testAuditDomainRows() {
  auditDomainCases_().forEach(testCase => {
    const auditEntry = new testCase.type({ record: testCase.record, action: 'UPDATED',
      oldStatus: 'SYNCED', newStatus: 'NEEDS_SYNC', details: 'Column: Title' });
    assertTrue(auditEntry instanceof BaseAuditEntry);
    assertEquals(testCase.entity, auditEntry.getEntityType());
    assertAuditRow_(auditEntry, ['UPDATED', 'id-1', testCase.title, 'SYNCED', 'NEEDS_SYNC', unit.activeEmail, 'Column: Title']);
  });
}

/** Iedere factory kiest de juiste klasse en geeft alle parameters door. */
function testAuditFactories() {
  auditDomainCases_().forEach(testCase => {
    const auditEntry = testCase.factory({ record: testCase.record, action: 'DELETED',
      oldStatus: 'DELETE_REQUESTED', newStatus: 'DELETED', details: 'Removed' });
    assertTrue(auditEntry instanceof testCase.type);
    assertEquals(testCase.entity, auditEntry.getEntityType());
    assertAuditRow_(auditEntry, ['DELETED', 'id-1', testCase.title, 'DELETE_REQUESTED', 'DELETED', unit.activeEmail, 'Removed']);
  });
}

/** Ontbrekende records crashen niet; vlucht behoudt de huidige routetitel. */
function testAuditMissingRecords() {
  auditDomainCases_().forEach(testCase => {
    [{}, { record: null }, { record: {} }].forEach(params => {
      const auditEntry = new testCase.type(params);
      assertEquals(testCase.entity, auditEntry.getEntityType());
      assertAuditRow_(auditEntry, ['', '', testCase.entity === 'flight' ? 'undefined -> undefined' : '', '', '', unit.activeEmail, '']);
    });
  });
}

/** Gedeeltelijke en lege vluchtroutes behouden het bestaande formaat. */
function testAuditPartialFlightRoute() {
  requireAuditUnit_();
  const columns = CONFIG.entities.flight.columns;
  assertEquals('BRU -> undefined', new FlightAuditEntry({ record: { [columns.departureAirport]: 'BRU' } }).getEntityTitle());
  assertEquals('undefined -> LHR', new FlightAuditEntry({ record: { [columns.arrivalAirport]: 'LHR' } }).getEntityTitle());
  assertEquals(' -> ', new FlightAuditEntry({ record: { [columns.departureAirport]: '', [columns.arrivalAirport]: '' } }).getEntityTitle());
}

/** De service voegt elke entry eenmaal toe aan het ingestelde tabblad. */
function testAuditServiceAppend() {
  requireAuditUnit_();
  const auditEntry = entry.gig({ action: 'CREATED', record: {
    [CONFIG.entities.gig.columns.gigId]: 'gig-1', [CONFIG.entities.gig.columns.title]: 'Concert'
  } });
  auditService.log(auditEntry);
  auditService.log(new BaseAuditEntry({}));
  assertEquals(JSON.stringify([CONFIG.auditLog.sheetName, CONFIG.auditLog.sheetName]), JSON.stringify(unit.sheets));
  assertEquals(2, unit.rows.length);
  assertTrue(unit.rows[0][0] instanceof Date);
  assertEquals(JSON.stringify(['CREATED', 'gig-1', 'Concert', '', '', unit.activeEmail, '']), JSON.stringify(unit.rows[0].slice(1)));
  assertEquals(2, unit.logs.length);
  assertEquals('audit-service', unit.logs[0].module);
  assertEquals(JSON.stringify(['audit-entry-written', 'Audit-entry geschreven.', 'Action: CREATED']), JSON.stringify(unit.logs[0].args));
  assertEquals('Action: -', unit.logs[1].args[2]);
}

/** Validatie faalt voordat het tabblad wordt benaderd. */
function testAuditServiceValidation() {
  requireAuditUnit_();
  [undefined, null].forEach(value => assertThrows(() => auditService.log(value), 'Audit-entry ontbreekt.'));
  [{}, { toRow: 'invalid' }].forEach(value => assertThrows(() => auditService.log(value), 'Audit-entry mist functie toRow().'));
  assertEquals(0, unit.sheets.length);
  assertEquals(0, unit.logs.length);
}

/** Het publieke toRow-contract vereist geen BaseAuditEntry-instance. */
function testAuditServiceToRowContract() {
  requireAuditUnit_();
  const row = [new Date(), 'CUSTOM', 'id', 'Title', '', '', 'user@example.invalid', 'Details'];
  let calls = 0;
  auditService.log({ toRow() { calls++; return row; } });
  assertEquals(1, calls);
  assertEquals(1, unit.rows.length);
  assertEquals(row, unit.rows[0]);
}

/** Serialisatiefouten leiden niet tot een write of succeslog. */
function testAuditServiceSerializationFailure() {
  requireAuditUnit_();
  assertThrows(() => auditService.log({ toRow() { throw new Error('serialize failed'); } }), 'serialize failed');
  assertEquals(0, unit.sheets.length);
  assertEquals(0, unit.logs.length);
}

/** Schrijffouten blijven zichtbaar en worden niet als succes gelogd. */
function testAuditServiceAppendFailure() {
  requireAuditUnit_();
  unit.appendError = new Error('append failed');
  assertThrows(() => auditService.log(new BaseAuditEntry({})), 'append failed');
  assertEquals(1, unit.sheets.length);
  assertEquals(0, unit.rows.length);
  assertEquals(0, unit.logs.length);
}
