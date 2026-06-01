/**
 * Service voor het scannen en importeren van flight-mails.
 */
const flightMailImportService = (() => {
  const MODULE_NAME = 'flight-mail-import-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Scant flight-mails en importeert herkende vluchten.
   *
   * @returns {void}
   */
  function scanAndImport() {
    const log = getLog_();
    const threads = getInboxThreads_();

    log.info(
      'flight-mail-scan-started',
      'Flight mail scan gestart.',
      `Threads: ${threads.length}`
    );

    threads.forEach(thread => {
      processThread_(thread);
    });

    log.info(
      'flight-mail-scan-finished',
      'Flight mail scan afgerond.',
      `Threads: ${threads.length}`
    );
  }

  /**
   * Verwerkt één Gmail-thread.
   *
   * Een thread kan meerdere berichten bevatten en een parser kan meerdere
   * flight candidates teruggeven.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {void}
   */
  function processThread_(thread) {
    try {
      const messages = thread.getMessages();
      let importedCount = 0;

      messages.forEach(message => {
        const flights = parseFlightMail_(message);

        flights.forEach(parsedFlight => {
          if (isDuplicateFlight_(parsedFlight)) {
            logDuplicateFlight_(parsedFlight, thread);
            return;
          }

          importFlight_(parsedFlight);
          importedCount++;
        });
      });

      if (importedCount > 0) {
        moveThreadToProcessed_(thread);
        return;
      }

      moveThreadToDiscarded_(thread);
    } catch (error) {
      handleThreadError_(thread, error);
    }
  }

  /**
   * Parse een flight-mail naar één of meer flight candidates.
   *
   * Mogelijke candidates:
   * - FLIGHT_NUMBER: flightNumber + departureDate;
   * - ROUTE_TIME: departureAirport + arrivalAirport + departureDate + departureTime.
   *
   * @param {GoogleAppsScript.Gmail.GmailMessage} message Gmail-message.
   * @returns {Object[]} Parsed flight candidates.
   */
  function parseFlightMail_(message) {
    const rawText = message.getPlainBody();
    const flights = Flight.FlightEmailParserService.parse(rawText);

    return Array.isArray(flights) ? flights : [];
  }

  /**
   * Controleert of een parsed flight al bestaat.
   *
   * @param {Object} parsedFlight Parsed flightdata.
   * @returns {boolean} True als de flight al bestaat.
   */
  function isDuplicateFlight_(parsedFlight) {
    const strategy = getLookupStrategy_(parsedFlight);

    if (strategy === 'ROUTE_TIME') {
      return isDuplicateRouteTimeFlight_(parsedFlight);
    }

    return isDuplicateFlightNumberFlight_(parsedFlight);
  }

  /**
   * Controleert duplicaat op basis van vluchtnummer + vertrekdatum.
   *
   * @param {Object} parsedFlight Parsed flightdata.
   * @returns {boolean} True als duplicaat.
   */
  function isDuplicateFlightNumberFlight_(parsedFlight) {
    const columns = CONFIG.entities.flight.columns;
    const rows = sheetService.getRowsAsObjects(CONFIG.entities.flight.sheetName);

    return rows.some(row => {
      return (
        normalizeFlightNumber_(row[columns.flightNumber]) === normalizeFlightNumber_(parsedFlight.flightNumber) &&
        normalizeDate_(row[columns.departureDate]) === normalizeDate_(parsedFlight.departureDate)
      );
    });
  }

  /**
   * Controleert duplicaat op basis van route + vertrekdatum + vertrektijd.
   *
   * Dit is vooral een fallback voordat route/time is resolved naar een echt vluchtnummer.
   *
   * @param {Object} parsedFlight Parsed flightdata.
   * @returns {boolean} True als duplicaat.
   */
  function isDuplicateRouteTimeFlight_(parsedFlight) {
    const columns = CONFIG.entities.flight.columns;
    const rows = sheetService.getRowsAsObjects(CONFIG.entities.flight.sheetName);

    return rows.some(row => {
      return (
        normalizeAirport_(row[columns.departureAirport]) === normalizeAirport_(parsedFlight.departureAirport) &&
        normalizeAirport_(row[columns.arrivalAirport]) === normalizeAirport_(parsedFlight.arrivalAirport) &&
        normalizeDate_(row[columns.departureDate]) === normalizeDate_(parsedFlight.departureDate) &&
        normalizeTime_(row[columns.departureTime]) === normalizeTime_(parsedFlight.departureTime)
      );
    });
  }

  /**
   * Importeert een parsed flight naar de flight-input sheet.
   *
   * Ondersteunt:
   * - FLIGHT_NUMBER lookup via vluchtnummer + datum;
   * - ROUTE_TIME lookup via route + vertrekdatum/tijd.
   *
   * @param {Object} parsedFlight Parsed flightdata uit de parser-library.
   * @returns {void}
   */
  function importFlight_(parsedFlight) {
    const strategy = getLookupStrategy_(parsedFlight);
    const flightNumber = normalizeFlightNumber_(parsedFlight.flightNumber);

    getLog_().info(
      'flight-mail-parsed-flight',
      'Parsed flight candidate.',
      JSON.stringify(parsedFlight)
    );

    if (strategy === 'ROUTE_TIME') {
      flightImportToSheetService.importByRouteAndTime({
        departureAirport: parsedFlight.departureAirport,
        arrivalAirport: parsedFlight.arrivalAirport,
        departureDate: parsedFlight.departureDate,
        departureTime: parsedFlight.departureTime
      });
      return;
    }

    if (strategy === 'FLIGHT_NUMBER' || flightNumber) {
      flightImportToSheetService.importByFlightNumberAndDate(
        flightNumber,
        parsedFlight.departureDate
      );
      return;
    }

    throw new Error(`Onbekende flight lookup strategy: ${strategy || '-'}`);
  }

  /**
   * Bepaalt de lookup strategy voor een parsed flight.
   *
   * @param {Object} parsedFlight Parsed flightdata.
   * @returns {string} Lookup strategy.
   */
  function getLookupStrategy_(parsedFlight) {
    const strategy = String(parsedFlight.lookupStrategy || '')
      .trim()
      .toUpperCase();

    if (strategy) {
      return strategy;
    }

    if (normalizeFlightNumber_(parsedFlight.flightNumber)) {
      return 'FLIGHT_NUMBER';
    }

    if (
      parsedFlight.departureAirport &&
      parsedFlight.arrivalAirport &&
      parsedFlight.departureDate &&
      parsedFlight.departureTime
    ) {
      return 'ROUTE_TIME';
    }

    return '';
  }

  /**
   * Geeft alle inbox-threads terug voor flight-import.
   *
   * @returns {Array<GoogleAppsScript.Gmail.GmailThread>} Gmail-threads.
   */
  function getInboxThreads_() {
    const label = GmailApp.getUserLabelByName(
      CONFIG.entities.flight.mailImport.inboxLabel
    );

    if (!label) {
      throw new Error(
        `Flight inbox label niet gevonden: ${CONFIG.entities.flight.mailImport.inboxLabel}`
      );
    }

    return label.getThreads();
  }

  /**
   * Verplaatst een Gmail-thread naar de processed-label.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {void}
   */
  function moveThreadToProcessed_(thread) {
    moveThread_(thread, CONFIG.entities.flight.mailImport.processedLabel);
  }

  /**
   * Verplaatst een Gmail-thread naar de discarded-label.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {void}
   */
  function moveThreadToDiscarded_(thread) {
    moveThread_(thread, CONFIG.entities.flight.mailImport.discardedLabel);
  }

  /**
   * Verplaatst een Gmail-thread naar de error-label.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {void}
   */
  function moveThreadToError_(thread) {
    moveThread_(thread, CONFIG.entities.flight.mailImport.errorLabel);
  }

  /**
   * Verplaatst een Gmail-thread naar een doel-label.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @param {string} targetLabelName Naam van het doel-label.
   * @returns {void}
   */
  function moveThread_(thread, targetLabelName) {
    const labels = CONFIG.entities.flight.mailImport;

    const inboxLabel = GmailApp.getUserLabelByName(labels.inboxLabel);
    const targetLabel = GmailApp.getUserLabelByName(targetLabelName);

    if (!targetLabel) {
      throw new Error(`Flight import label niet gevonden: ${targetLabelName}`);
    }

    if (inboxLabel) {
      thread.removeLabel(inboxLabel);
    }

    thread.addLabel(targetLabel);
  }

  /**
   * Handelt fouten af tijdens thread-verwerking.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @param {Error} error Opgetreden fout.
   * @returns {void}
   */
  function handleThreadError_(thread, error) {
    getLog_().error(
      'flight-mail-import-error',
      error.message,
      `ThreadId: ${thread.getId()}`
    );

    moveThreadToError_(thread);
  }

  /**
   * Normaliseert een vluchtnummer.
   *
   * @param {*} value Vluchtnummerwaarde.
   * @returns {string} Genormaliseerd vluchtnummer.
   */
  function normalizeFlightNumber_(value) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  /**
   * Normaliseert een airport code.
   *
   * @param {*} value Airportwaarde.
   * @returns {string} Genormaliseerde airport code.
   */
  function normalizeAirport_(value) {
    return String(value || '')
      .trim()
      .toUpperCase();
  }

  /**
   * Normaliseert een datumwaarde naar yyyy-MM-dd.
   *
   * @param {*} value Datumwaarde.
   * @returns {string} Genormaliseerde datum.
   */
  function normalizeDate_(value) {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return Utilities.formatDate(
        value,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd'
      );
    }

    return String(value).trim().slice(0, 10);
  }

  /**
   * Normaliseert een tijdwaarde naar HH:mm.
   *
   * @param {*} value Tijdwaarde.
   * @returns {string} Genormaliseerde tijd.
   */
  function normalizeTime_(value) {
    if (!value) {
      return '';
    }

    const match = String(value).trim().match(/\b(\d{1,2}):(\d{2})\b/);

    if (!match) {
      return '';
    }

    return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  }

  /**
   * Logt dat een parsed flight is overgeslagen omdat deze al bestaat.
   *
   * @param {Object} parsedFlight Parsed flightdata.
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {void}
   */
  function logDuplicateFlight_(parsedFlight, thread) {
    const strategy = getLookupStrategy_(parsedFlight);

    getLog_().info(
      'flight-mail-duplicate-skipped',
      'Flight import overgeslagen omdat deze al bestaat.',
      JSON.stringify({
        strategy,
        flightNumber: parsedFlight.flightNumber || '',
        departureDate: parsedFlight.departureDate || '',
        departureTime: parsedFlight.departureTime || '',
        departureAirport: parsedFlight.departureAirport || '',
        arrivalAirport: parsedFlight.arrivalAirport || '',
        threadId: thread.getId()
      })
    );
  }

  return {
    scanAndImport
  };
})();