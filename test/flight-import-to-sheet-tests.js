/**
 * Happy flow test voor flightImportToSheetService.
 *
 * Verwachting:
 * - haalt vluchtdata op via flightApi;
 * - mapt API-data naar flight-input formaat;
 * - voegt één nieuwe rij toe aan flight-input;
 * - zet SyncStatus op NEEDS_SYNC;
 * - vult basisvelden zoals Flight, Airline, Departure/Arrival airport.
 */
function testflightImportToSheetServiceHappyFlow() {
  const sheet = sheetService.getSheet(CONFIG.entities.flight.sheetName);
  const beforeLastRow = sheet.getLastRow();

  const mappedFlight = flightImportToSheetService.importByFlightNumberAndDate('HV6036', '2025-12-20');

  const afterLastRow = sheet.getLastRow();

  if (afterLastRow !== beforeLastRow + 1) {
    throw new Error(`Verwachtte 1 nieuwe flight-input rij. Voor: ${beforeLastRow}, Na: ${afterLastRow}`);
  }

  const row = sheetService.getRowAsObject(afterLastRow, CONFIG.entities.flight.sheetName);
  const columns = CONFIG.entities.flight.columns;

  if (row[columns.syncStatus] !== CONFIG.syncStatuses.needsSync) {
    throw new Error(`SyncStatus moet NEEDS_SYNC zijn, maar is: ${row[columns.syncStatus]}`);
  }

  if (!row[columns.flightNumber]) {
    throw new Error('Flight ontbreekt in nieuwe rij.');
  }

  if (!row[columns.airline]) {
    throw new Error('Airline ontbreekt in nieuwe rij.');
  }

  if (!row[columns.departureAirport]) {
    throw new Error('Departure Airport ontbreekt in nieuwe rij.');
  }

  if (!row[columns.arrivalAirport]) {
    throw new Error('Arrival Airport ontbreekt in nieuwe rij.');
  }

  console.log(JSON.stringify({
    status: 'OK',
    insertedRow: afterLastRow,
    mappedFlight,
    sheetRow: row
  }, null, 2));
}