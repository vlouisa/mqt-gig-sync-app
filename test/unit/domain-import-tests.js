/** Flight-/hotelimport met lokale fixtures en spies op mapping en opslag. */

/** Flightimport kiest de eerste API-flight en retourneert het bronobject. */
function testFlightImportNumber() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const flight = { number: 'HV 123' };
  unit.response = [flight, { number: 'OTHER' }];
  const result = flightImportToSheetService.importByFlightNumberAndDate('HV123', '2026-12-31');
  assertEquals(flight, result.flight);
  assertEquals(true, result.success);
  assertEquals(2, result.rowNumber);
  assertEquals(flight, unit.last('map')[0]);
  assertEquals('flight-input', unit.last('append')[0]);
  assertEquals('NEEDS_SYNC', unit.rows[0].SyncStatus);
}

/** Een ontbrekende flight of falende mapper mag geen rij toevoegen. */
function testFlightImportFailure() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  assertThrows(() => flightImportToSheetService.importByFlightNumberAndDate('HV123', '2026-12-31'),
    'Geen vluchtdata gevonden voor HV123 op 2026-12-31');
  unit.response = { number: 'HV123' };
  unit.mappingError = true;
  assertThrows(() => flightImportToSheetService.importByFlightNumberAndDate('HV123', '2026-12-31'), 'Mapping failed');
  assertEquals(0, unit.count('append'));
}

/** Routeimport resolveert een genormaliseerd nummer en haalt volledige flightdata op. */
function testFlightImportRoute() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const search = { departureAirport: 'BRU', arrivalAirport: 'FCO', departureDate: '2026-12-31', departureTime: '10:00' };
  unit.candidates = [{ number: ' hv 123 ' }];
  unit.response = { number: 'HV123' };
  flightImportToSheetService.importByRouteAndTime(search);
  assertEquals('HV123', unit.last('numberLookup')[0]);
  assertEquals(search.departureDate, unit.last('numberLookup')[1]);
  assertEquals(1, unit.count('append'));
}

/** Ambigue, lege en nummerloze zoekresultaten mogen geen rij toevoegen. */
function testFlightImportRouteRejected() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const search = { departureAirport: 'BRU', arrivalAirport: 'FCO', departureDate: '2026-12-31', departureTime: '10:00' };
  for (const candidates of [[], [{ number: 'A' }, { number: 'B' }], [{}]]) {
    unit.candidates = candidates;
    let error;
    try { flightImportToSheetService.importByRouteAndTime(search); } catch (caught) { error = caught; }
    assertTrue(error instanceof Error);
  }
  assertEquals(0, unit.count('append') + unit.count('numberLookup'));
}

/** Hotelmapping behoudt boekingsvelden en initialiseert technische velden. */
function testHotelImportMapping() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const booking = { hotel: 'Stay', checkInDate: '2026-12-31', checkOutDate: '2027-01-02',
    address: 'Street', country: 'BE', reservationReference: 'R1', description: 'Room' };
  const result = hotelImportToSheetService.import(booking);
  assertEquals(true, result.success);
  assertEquals(2, result.rowNumber);
  const row = unit.last('append')[1];
  assertEquals('hotel-input', unit.last('append')[0]);
  for (const [key, column] of Object.entries(CONFIG.entities.hotel.columns)) {
    if (Object.prototype.hasOwnProperty.call(booking, key)) assertEquals(booking[key], row[column]);
  }
  assertEquals('unit-uuid', row['Hotel ID']);
  assertEquals('NEEDS_SYNC', row.SyncStatus);
  assertTrue(row.CreatedAt instanceof Date);
  assertTrue(row.UpdatedAt instanceof Date);
}

/** Elk vereist hotelveld wordt vóór opslag gecontroleerd. */
function testHotelImportValidation() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  for (const field of ['hotel', 'checkInDate', 'checkOutDate']) {
    const booking = { hotel: 'Stay', checkInDate: '2026-12-31', checkOutDate: '2027-01-02' };
    delete booking[field];
    assertThrows(() => hotelImportToSheetService.import(booking), 'Parsed hotel mist verplicht veld: ' + field);
  }
  assertEquals(0, unit.count('append'));
}
