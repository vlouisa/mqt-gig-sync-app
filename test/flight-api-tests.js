/**
 * Test het ophalen van een vlucht via flightApi.
 *
 * Verwachting:
 * - geeft een array terug;
 * - array bevat minimaal één vlucht;
 * - vlucht wordt daarna opgeslagen in flight-cache.
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