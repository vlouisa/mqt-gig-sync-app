/**
 * Service voor het scannen en importeren van hotel-mails.
 */
const hotelMailImportService = (() => {
  const MODULE_NAME = 'hotel-mail-import-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Scant hotel-mails en importeert herkende boekingen.
   *
   * @returns {void}
   */
  function scanAndImport() {
    const log = getLog_();

    const threads = getInboxThreads_();

    log.info(
      'hotel-mail-scan-started',
      'Hotel mail scan gestart.',
      `Threads: ${threads.length}`
    );

    threads.forEach(thread => {
      processThread_(thread);
    });

    log.info(
      'hotel-mail-scan-finished',
      'Hotel mail scan afgerond.',
      `Threads: ${threads.length}`
    );
  }

  /**
   * Verwerkt één Gmail-thread.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {void}
   */
  function processThread_(thread) {
    try {
      const message = getLatestMessage_(thread);

      const parsedHotel = parseHotelMail_(message);

      if (!parsedHotel) {
        moveThreadToDiscarded_(thread);
        return;
      }

      if (isDuplicateHotel_(parsedHotel)) {
        moveThreadToProcessed_(thread);
        return;
      }

      importHotel_(parsedHotel);

      moveThreadToProcessed_(thread);
    } catch (error) {
      handleThreadError_(thread, error);
    }
  }

  /**
   * Geeft de nieuwste message uit een Gmail-thread terug.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {GoogleAppsScript.Gmail.GmailMessage} Gmail-message.
   */
  function getLatestMessage_(thread) {
    const messages = thread.getMessages();

    return messages[messages.length - 1];
  }

  /**
   * Parse een hotel-mail naar gestructureerde data.
   *
   * @param {GoogleAppsScript.Gmail.GmailMessage} message Gmail-message.
   * @returns {Object|null} Parsed hoteldata of null.
   */
  function parseHotelMail_(message) {
    const rawText = message.getPlainBody();

    return Hotel.HotelEmailParserService.parse(rawText);
  }

  /**
   * Controleert of een hotelboeking al bestaat.
   *
   * @param {Object} parsedHotel Parsed hoteldata.
   * @returns {boolean} True als de hotelboeking al bestaat.
   */
  function isDuplicateHotel_(parsedHotel) {
    const columns = CONFIG.entities.hotel.columns;

    const rows = sheetService.getRowsAsObjects(
      CONFIG.entities.hotel.sheetName
    );

    return rows.some(row => {
      return (
        row[columns.hotel] === parsedHotel.hotel &&
        row[columns.checkInDate] === parsedHotel.checkInDate &&
        row[columns.checkOutDate] === parsedHotel.checkOutDate
      );
    });
  }

  /**
   * Importeert een parsed hotelboeking naar de sheet.
   *
   * @param {Object} parsedHotel Parsed hoteldata.
   * @returns {void}
   */
  function importHotel_(parsedHotel) {
    hotelImportToSheetService.import(parsedHotel);
  }

  /**
   * Verplaatst een Gmail-thread naar de processed-label.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {void}
   */
  function moveThreadToProcessed_(thread) {
    moveThread_(
      thread,
      CONFIG.entities.hotel.mailImport.processedLabel
    );
  }

  /**
   * Verplaatst een Gmail-thread naar de discarded-label.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {void}
   */
  function moveThreadToDiscarded_(thread) {
    moveThread_(
      thread,
      CONFIG.entities.hotel.mailImport.discardedLabel
    );
  }

  /**
   * Verplaatst een Gmail-thread naar de error-label.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @returns {void}
   */
  function moveThreadToError_(thread) {
    moveThread_(
      thread,
      CONFIG.entities.hotel.mailImport.errorLabel
    );
  }

  /**
   * Verplaatst een Gmail-thread naar een doel-label.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @param {string} targetLabelName Naam van het doel-label.
   * @returns {void}
   */
  function moveThread_(thread, targetLabelName) {
    const labels = CONFIG.entities.hotel.mailImport;

    const inboxLabel = GmailApp.getUserLabelByName(labels.inboxLabel);
    const targetLabel = GmailApp.getUserLabelByName(targetLabelName);

    thread.removeLabel(inboxLabel);
    thread.addLabel(targetLabel);
  }

  /**
   * Geeft alle inbox-threads terug voor hotel-import.
   *
   * @returns {Array<GoogleAppsScript.Gmail.GmailThread>} Gmail-threads.
   */
  function getInboxThreads_() {
    const label = GmailApp.getUserLabelByName(
      CONFIG.entities.hotel.mailImport.inboxLabel
    );

    return label.getThreads();
  }

  /**
   * Handelt fouten af tijdens thread-verwerking.
   *
   * @param {GoogleAppsScript.Gmail.GmailThread} thread Gmail-thread.
   * @param {Error} error Opgetreden fout.
   * @returns {void}
   */
  function handleThreadError_(thread, error) {
    const log = getLog_();

    log.error(
      'hotel-mail-import-error',
      error.message,
      `ThreadId: ${thread.getId()}`
    );

    moveThreadToError_(thread);
  }

  return {
    scanAndImport
  };
})();