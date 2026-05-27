/**
 * Service voor het ophalen en opslaan van flightdata in de flight-input sheet.
 */
const flightImportToSheetService = (() => {
  const MODULE_NAME = 'flight-api-to-sheet-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Importeert vluchtdata op basis van vluchtnummer en vertrekdatum.
   *
   * @param {string} flightNumber Vluchtnummer.
   * @param {string} departureDate Vertrekdatum.
   * @returns {{success: boolean, rowNumber: number, flight: Object}} Resultaatobject.
   */
  function importByFlightNumberAndDate(flightNumber, departureDate) {
    const log = getLog_();

    log.info(
      'flight-import-started',
      'Flight import gestart.',
      `Flight: ${flightNumber}, Date: ${departureDate}`
    );

    const apiResponse = flightApi.getFlightByNumberAndDate(
      flightNumber,
      departureDate
    );

    const flight = Array.isArray(apiResponse)
      ? apiResponse[0]
      : apiResponse;

    if (!flight) {
      throw new Error(
        `Geen vluchtdata gevonden voor ${flightNumber} op ${departureDate}`
      );
    }

    const row = flightToRecordMapper.map(flight);
    const rowNumber = appendFlightRow_(row);

    log.info(
      'flight-imported',
      'Flight succesvol geïmporteerd.',
      `Row: ${rowNumber}, Flight: ${flightNumber}`
    );

    return {
      success: true,
      rowNumber,
      flight
    };
  }

  /**
   * Zet flight API-data om naar een sheetrecord.
   *
   * @param {Object} flight Flight API-response.
   * @param {string} fallbackFlightNumber Fallback vluchtnummer.
   * @returns {Object} Sheetrecord.
   */
  function mapFlightToSheetRow_(flight, fallbackFlightNumber) {
    const columns = CONFIG.entities.flight.columns;

    const departureLocal = flight.departure?.scheduledTime?.local || '';
    const arrivalLocal = flight.arrival?.scheduledTime?.local || '';

    return {
      [columns.flightId]: Utilities.getUuid(),
      [columns.flightNumber]: flight.number || fallbackFlightNumber,
      [columns.airline]: flight.airline?.name || '',
      [columns.departureAirport]: flight.departure?.airport?.iata || '',
      [columns.arrivalAirport]: flight.arrival?.airport?.iata || '',
      [columns.departureDate]: departureLocal ? departureLocal.slice(0, 10) : '',
      [columns.departureTime]: departureLocal ? departureLocal.slice(11, 16) : '',
      [columns.arrivalDate]: arrivalLocal ? arrivalLocal.slice(0, 10) : '',
      [columns.arrivalTime]: arrivalLocal ? arrivalLocal.slice(11, 16) : '',
      [columns.syncStatus]: CONFIG.syncStatuses.needsSync,
      [columns.createdAt]: new Date(),
      [columns.updatedAt]: new Date()
    };
  }

  /**
   * Voegt een flightrecord toe aan de flight-input sheet.
   *
   * @param {Object} row Sheetrecord.
   * @returns {number} Toegevoegde row number.
   */
  function appendFlightRow_(row) {
    sheetService.appendRowFromObject(
      CONFIG.entities.flight.sheetName,
      row
    );

    return sheetService
      .getSheet(CONFIG.entities.flight.sheetName)
      .getLastRow();
  }

  return {
    importByFlightNumberAndDate
  };
})();