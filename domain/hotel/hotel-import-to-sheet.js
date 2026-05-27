/**
 * Service voor het importeren van hoteldata naar de hotel-input sheet.
 */
const hotelImportToSheetService = (() => {
  const MODULE_NAME = 'hotel-import-to-sheet-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Importeert parsed hoteldata naar de hotel-input sheet.
   *
   * Contract HotelEmailParserService:
   * hotel, address, country, checkInDate, checkOutDate,
   * reservationReference, description.
   *
   * @param {Object} parsedHotel Parsed hoteldata.
   * @returns {{success: boolean, rowNumber: number}} Resultaatobject.
   */
  function importHotel(parsedHotel) {
    const log = getLog_();

    log.info(
      'hotel-import-started',
      'Hotel import gestart.',
      `Hotel: ${parsedHotel.hotel || ''}`
    );

    validateParsedHotel_(parsedHotel);

    const row = mapParsedHotelToRow_(parsedHotel);
    const rowNumber = appendHotelRow_(row);

    log.info(
      'hotel-imported',
      'Hotel succesvol geïmporteerd.',
      `Row: ${rowNumber}, Hotel: ${parsedHotel.hotel || ''}`
    );

    return {
      success: true,
      rowNumber
    };
  }

  /**
   * Valideert parsed hoteldata.
   *
   * @param {Object} parsedHotel Parsed hoteldata.
   * @throws {Error} Als verplichte velden ontbreken.
   * @returns {void}
   */
  function validateParsedHotel_(parsedHotel) {
    [
      'hotel',
      'checkInDate',
      'checkOutDate'
    ].forEach(field => {
      if (!parsedHotel[field]) {
        throw new Error(`Parsed hotel mist verplicht veld: ${field}`);
      }
    });
  }

  /**
   * Zet parsed hoteldata om naar een sheetrecord.
   *
   * @param {Object} parsedHotel Parsed hoteldata.
   * @returns {Object} Sheetrecord.
   */
  function mapParsedHotelToRow_(parsedHotel) {
    const columns = CONFIG.entities.hotel.columns;

    return {
      [columns.hotelId]: Utilities.getUuid(),
      [columns.hotel]: parsedHotel.hotel || '',
      [columns.address]: parsedHotel.address || '',
      [columns.country]: parsedHotel.country || '',
      [columns.checkInDate]: parsedHotel.checkInDate || '',
      [columns.checkOutDate]: parsedHotel.checkOutDate || '',
      [columns.reservationReference]: parsedHotel.reservationReference || '',
      [columns.description]: parsedHotel.description || '',
      [columns.syncStatus]: CONFIG.syncStatuses.needsSync,
      [columns.createdAt]: new Date(),
      [columns.updatedAt]: new Date()
    };
  }

  /**
   * Voegt een hotelrecord toe aan de hotel-input sheet.
   *
   * @param {Object} row Sheetrecord.
   * @returns {number} Toegevoegde row number.
   */
  function appendHotelRow_(row) {
    sheetService.appendRowFromObject(
      CONFIG.entities.hotel.sheetName,
      row
    );

    return sheetService
      .getSheet(CONFIG.entities.hotel.sheetName)
      .getLastRow();
  }

  return {
    import: importHotel
  };
})();