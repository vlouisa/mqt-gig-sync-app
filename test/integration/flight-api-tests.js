/**
 * Test het ophalen van een vlucht via flightApi.
 *
 * Verwachting:
 * - geeft een array terug;
 * - array bevat minimaal één vlucht;
 * - bij een cache-miss wordt de response opgeslagen in flight-cache.
 *
 * Controleert alleen arraytype en minimaal één resultaat, niet de cache-inhoud.
 * Kan de externe API aanroepen en de cache wijzigen; expliciete toestemming vereist.
 */
function testflightApiGetFlightByNumberAndDate() {
  const result = flightApi.getFlightByNumberAndDate('HV6036', '2025-12-20');

  if (!Array.isArray(result)) {
    throw new Error('Resultaat moet een array zijn.');
  }

  if (result.length === 0) {
    throw new Error('Geen vlucht gevonden.');
  }

  console.log(JSON.stringify(result, null, 2));
}

/**
 * Test het ophalen van een vlucht via route en vertrektijd.
 *
 * Verwachting:
 * - geeft een array terug;
 * - array bevat precies één of meer flight candidates;
 * - candidates zijn gefilterd op FCO → BRU rond 2026-06-05 10:10;
 * - bij een cache-miss wordt het resultaat opgeslagen in flight-cache.
 *
 * Controleert alleen arraytype en minimaal één resultaat, niet route, tijd of cache-inhoud.
 * Kan de externe API aanroepen en de cache wijzigen; expliciete toestemming vereist.
 *
 * Deze test gebruikt het Brussels Airlines scenario zonder vluchtnummer.
 *
 * @returns {void}
 */
function testflightApiGetFlightsByRouteAndTime() {
  const result = flightApi.getFlightsByRouteAndTime({
    departureAirport: 'FCO',
    arrivalAirport: 'BRU',
    departureDate: '2026-06-05',
    departureTime: '10:10'
  });

  if (!Array.isArray(result)) {
    throw new Error('Resultaat moet een array zijn.');
  }

  if (result.length === 0) {
    throw new Error('Geen vlucht gevonden.');
  }

  console.log(JSON.stringify(result, null, 2));
}
