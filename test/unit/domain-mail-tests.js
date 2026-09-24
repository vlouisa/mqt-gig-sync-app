/** Gmail-flowtests: alle threads, parsers, labels en imports zijn lokale mocks. */

/** Flight verwerkt alle berichten; hotel alleen het laatste bericht. */
function testDomainMailImport() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const thread = unit.thread('first', 'last');
  if (unit.domain === 'flight') {
    unit.parsed.first = [{ flightNumber: ' hv 123 ', departureDate: '2026-12-31' }];
    unit.parsed.last = [{ departureAirport: 'BRU', arrivalAirport: 'FCO', departureDate: '2026-12-31', departureTime: '10:00' }];
  } else {
    unit.parsed.last = { hotel: 'Stay', checkInDate: '2026-12-31', checkOutDate: '2027-01-02' };
  }
  unit.getService().scanAndImport();
  assertEquals(unit.domain === 'flight' ? 2 : 1, unit.imports.length);
  assertEquals(unit.domain === 'flight' ? 2 : 1, unit.count('parse'));
  if (unit.domain === 'flight') {
    assertEquals('HV123', unit.imports[0][0]);
    assertEquals('BRU', unit.imports[1][0].departureAirport);
  } else assertEquals('last', unit.last('parse')[0]);
  const config = CONFIG.entities[unit.domain].mailImport;
  assertEquals(config.processedLabel, thread.labels[0]);
  assertEquals(config.inboxLabel, thread.removed[0]);
}

/** Duplicaten worden niet geïmporteerd; domeinspecifieke labelflow blijft behouden. */
function testDomainMailDuplicate() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const thread = unit.thread('booking');
  if (unit.domain === 'flight') {
    unit.rows.push({ Flight: 'HV 123', 'Departure Date': '2026-12-31' });
    unit.parsed.booking = [{ flightNumber: 'hv123', departureDate: '2026-12-31' }];
  } else {
    unit.rows.push({ Hotel: 'Stay', 'Check-in Date': '2026-12-31', 'Check-out Date': '2027-01-02' });
    unit.parsed.booking = { hotel: 'Stay', checkInDate: '2026-12-31', checkOutDate: '2027-01-02' };
  }
  unit.getService().scanAndImport();
  assertEquals(0, unit.imports.length);
  assertEquals(CONFIG.entities[unit.domain].mailImport[unit.domain === 'flight' ? 'discardedLabel' : 'processedLabel'], thread.labels[0]);
}

/** Een parserfout markeert alleen de betreffende thread; volgende threads gaan door. */
function testDomainMailErrorIsolation() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const bad = unit.thread('bad');
  const good = unit.thread('good');
  unit.parsed.bad = new Error('Parser failed');
  unit.parsed.good = unit.domain === 'flight'
    ? [{ flightNumber: 'HV123', departureDate: '2026-12-31' }]
    : { hotel: 'Stay', checkInDate: '2026-12-31', checkOutDate: '2027-01-02' };
  unit.getService().scanAndImport();
  assertEquals(CONFIG.entities[unit.domain].mailImport.errorLabel, bad.labels[0]);
  assertEquals(CONFIG.entities[unit.domain].mailImport.processedLabel, good.labels[0]);
  assertEquals(1, unit.imports.length);
}

/** Route/tijd-duplicaten worden genormaliseerd vóór vergelijking. */
function testFlightMailRouteDuplicate() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const thread = unit.thread('route');
  unit.rows.push({ 'Departure Airport': ' bru ', 'Arrival Airport': 'fco',
    'Departure Date': '2026-12-31', 'Departure Time': '09:05' });
  unit.parsed.route = [{ departureAirport: 'BRU', arrivalAirport: 'FCO', departureDate: '2026-12-31', departureTime: '9:05' }];
  flightMailImportService.scanAndImport();
  assertEquals(0, unit.imports.length);
  assertEquals(CONFIG.entities.flight.mailImport.discardedLabel, thread.labels[0]);
}

/** Een lege kandidaatlijst wordt discarded; een onbekende strategie wordt error. */
function testFlightMailEmptyAndUnknown() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const empty = unit.thread('empty');
  const unknown = unit.thread('unknown');
  unit.parsed.empty = [];
  unit.parsed.unknown = [{ lookupStrategy: 'UNSUPPORTED' }];
  flightMailImportService.scanAndImport();
  assertEquals(CONFIG.entities.flight.mailImport.discardedLabel, empty.labels[0]);
  assertEquals(CONFIG.entities.flight.mailImport.errorLabel, unknown.labels[0]);
  assertEquals(0, unit.imports.length);
}
