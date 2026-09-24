/** AeroDataBox-wrappertests zonder netwerk: HTTP en cache worden in-memory nagebootst. */

/** Normalisatie, requestheaders en cache-hit voorkomen een tweede request. */
function testFlightApiNumberCache() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.response = [{ number: 'HV123', departure: { airport: { iata: 'BRU', location: { lat: 50, lon: 4 } } } }];
  const first = flightApi.getFlightByNumberAndDate(' hv 123 ', '2026-12-31');
  assertEquals('HV123', first[0].number);
  assertTrue(unit.last('fetch')[0].includes('/Number/HV123/2026-12-31/2026-12-31'));
  assertEquals('fake-unit-key', unit.last('fetch')[1].headers['X-RapidAPI-Key']);
  assertEquals('get', unit.last('fetch')[1].method);
  assertEquals('HV123|2026-12-31', unit.cache[1][0]);
  assertEquals('50, 4', unit.cache[1][4]);
  flightApi.getFlightByNumberAndDate('HV123', '2026-12-31');
  assertEquals(1, unit.count('fetch'));
  assertEquals(2, unit.cache.length);
}

/** De wrapper kan het ontbrekende cachetabblad initialiseren en verbergen. */
function testFlightApiCreatesCache() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.cacheExists = false;
  unit.cache = [];
  flightApi.getFlightByNumberAndDate('HV123', '2026-12-31');
  assertEquals('flight-cache', unit.last('insertSheet')[0]);
  assertEquals(1, unit.last('freeze')[0]);
  assertEquals(1, unit.count('hide'));
  assertEquals('rawJson', unit.cache[0][11]);
}

/** Routefilter accepteert grensminuten, maar wijst verkeerde bestemming en tijd af. */
function testFlightApiRouteWindow() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const candidate = (airport, time) => ({ number: 'HV123', movement: { airport: { iata: airport }, scheduledTime: { local: time } } });
  unit.response = { departures: [
    candidate('FCO', '2026-12-31 09:59:00'), candidate('fco', '2026-12-31 10:01:00'),
    candidate('FCO', '2026-12-31 10:02:00'), candidate('LHR', '2026-12-31 10:00:00'),
    candidate('FCO', 'invalid')
  ] };
  const search = { departureAirport: ' bru ', arrivalAirport: 'fco', departureDate: '2026-12-31', departureTime: '10:00' };
  assertEquals(2, flightApi.getFlightsByRouteAndTime(search).length);
  const url = decodeURIComponent(unit.last('fetch')[0]);
  assertTrue(url.includes('/iata/BRU/2026-12-31T09:59/2026-12-31T10:01'));
  assertEquals(2, flightApi.getFlightsByRouteAndTime(search).length);
  assertEquals(1, unit.count('fetch'));
}

/** Een HTTP-fout wordt doorgegeven en niet als succesvolle response gecachet. */
function testFlightApiHttpError() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.statusCode = 503;
  unit.rawResponse = 'unavailable';
  assertThrows(() => flightApi.getFlightByNumberAndDate('HV123', '2026-12-31'), 'AeroDataBox API error 503: unavailable');
  assertEquals(1, unit.cache.length);
}

/** Ongeldige JSON wordt niet opgeslagen. */
function testFlightApiInvalidJson() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.rawResponse = '{';
  let caught;
  try { flightApi.getFlightByNumberAndDate('HV123', '2026-12-31'); } catch (error) { caught = error; }
  assertTrue(caught instanceof SyntaxError);
  assertEquals(1, unit.cache.length);
}

/** Ontbrekende nummer/datum en ongeldige IATA worden vóór HTTP afgewezen. */
function testFlightApiValidation() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  assertThrows(() => flightApi.getFlightByNumberAndDate('', '2026-12-31'), 'Vluchtnummer is verplicht.');
  assertThrows(() => flightApi.getFlightByNumberAndDate('HV123', ''), 'Vertrekdatum is verplicht.');
  assertThrows(() => flightApi.getFlightsByRouteAndTime({ departureAirport: 'BRUSSELS' }), 'Vertrekluchthaven moet een geldige IATA-code zijn.');
  assertEquals(0, unit.count('fetch'));
}
