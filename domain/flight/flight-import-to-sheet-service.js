/**
 * Service voor het ophalen en opslaan van flightdata in de flight-input sheet.
 */
const flightImportToSheetService = (() => {
  const MODULE_NAME = 'flight-import-to-sheet-service';

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
      'flight-number-import-started',
      'Flight import via vluchtnummer gestart.',
      `${flightNumber}, ${departureDate}`
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
   * Importeert vluchtdata op basis van route en vertrektijd.
   *
   * Route/time wordt alleen gebruikt om het vluchtnummer te vinden.
   * Daarna wordt de normale flight-number lookup gebruikt voor volledige flightdata.
   *
   * @param {Object} search Route/time zoekopdracht.
   * @param {string} search.departureAirport Vertrek IATA-code.
   * @param {string} search.arrivalAirport Aankomst IATA-code.
   * @param {string} search.departureDate Vertrekdatum in yyyy-MM-dd.
   * @param {string} search.departureTime Vertrektijd in HH:mm.
   * @returns {{success: boolean, rowNumber: number, flight: Object}} Resultaatobject.
   */
  function importByRouteAndTime(search) {
    const log = getLog_();

    log.info(
      'flight-route-time-import-started',
      'Flight import via route/tijd gestart.',
      `${search.departureAirport} → ${search.arrivalAirport}, ${search.departureDate} ${search.departureTime}`
    );

    const candidates = flightApi.getFlightsByRouteAndTime(search);

    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error(
        `Geen vlucht gevonden voor ${search.departureAirport} → ${search.arrivalAirport} rond ${search.departureDate} ${search.departureTime}`
      );
    }

    if (candidates.length > 1) {
      throw new Error(
        `Meerdere mogelijke vluchten gevonden voor ${search.departureAirport} → ${search.arrivalAirport} rond ${search.departureDate} ${search.departureTime}. Handmatige controle nodig.`
      );
    }

    const resolvedFlightNumber = normalizeResolvedFlightNumber_(candidates[0]);

    log.info(
      'flight-route-time-resolved',
      'Route/time lookup heeft vluchtnummer gevonden.',
      resolvedFlightNumber
    );

    return importByFlightNumberAndDate(
      resolvedFlightNumber,
      search.departureDate
    );
  }

  /**
   * Normaliseert het vluchtnummer uit een route/time candidate.
   *
   * @param {Object} candidate AeroDataBox route/time candidate.
   * @returns {string} Genormaliseerd vluchtnummer.
   */
  function normalizeResolvedFlightNumber_(candidate) {
    const flightNumber = String(candidate.number || '')
      .replace(/\s+/g, '')
      .toUpperCase();

    if (!flightNumber) {
      throw new Error('Route/time lookup vond een kandidaat zonder vluchtnummer.');
    }

    return flightNumber;
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
    importByFlightNumberAndDate,
    importByRouteAndTime
  };
})();