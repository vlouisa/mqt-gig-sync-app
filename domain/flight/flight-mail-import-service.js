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
   * flights teruggeven.
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
   * Parse een flight-mail naar één of meer flights.
   *
   * @param {GoogleAppsScript.Gmail.GmailMessage} message Gmail-message.
   * @returns {Array<{flightNumber: string, departureDate: string}>} Parsed flights.
   */
  function parseFlightMail_(message) {
    const rawText = message.getPlainBody();
    const flights = Flight.FlightEmailParserService.parse(rawText);

    return Array.isArray(flights) ? flights : [];
  }

  /**
   * Controleert of een flight al bestaat.
   *
   * @param {{flightNumber: string, departureDate: string}} parsedFlight Parsed flightdata.
   * @returns {boolean} True als de flight al bestaat.
   */
  function isDuplicateFlight_(parsedFlight) {
    const columns = CONFIG.entities.flight.columns;

    const rows = sheetService.getRowsAsObjects(
      CONFIG.entities.flight.sheetName
    );

    return rows.some(row => {
      return (
        String(row[columns.flightNumber]).trim() === String(parsedFlight.flightNumber).trim() &&
        normalizeDate_(row[columns.departureDate]) === normalizeDate_(parsedFlight.departureDate)
      );
    });
  }

  /**
   * Importeert een parsed flight naar de flight-input sheet.
   *
   * @param {{flightNumber: string, departureDate: string}} parsedFlight Parsed flightdata.
   * @returns {void}
   */
  function importFlight_(parsedFlight) {
    flightImportToSheetService.importByFlightNumberAndDate(
      parsedFlight.flightNumber,
      parsedFlight.departureDate
    );
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
   * Normaliseert een datumwaarde naar yyyy-MM-dd.
   *
   * @param {*} value Datumwaarde.
   * @returns {string} Genormaliseerde datum.
   */
  function normalizeDate_(value) {
    if (!value) return '';

    if (value instanceof Date) {
      return Utilities.formatDate(
        value,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd'
      );
    }

    return String(value).trim().slice(0, 10);
  }

  return {
    scanAndImport
  };
})();