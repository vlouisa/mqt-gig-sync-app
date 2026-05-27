/**
 * Synchronisatie-service voor hotels naar Google Calendar.
 */
const hotelSyncService = (() => {
  const MODULE_NAME = 'hotel-sync-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Synchroniseert alle hotel-rijen met een verwerkbare SyncStatus.
   *
   * @returns {void}
   */
  function sync() {
    const rows = sheetService.getRowsAsObjects(CONFIG.entities.hotel.sheetName);

    rows.forEach(row => {
      const syncStatus = row[CONFIG.entities.hotel.columns.syncStatus];

      if (!shouldProcessRow_(syncStatus)) return;

      processRow_(row, syncStatus);
    });
  }

  /**
   * Bepaalt of een hotel-rij verwerkt moet worden.
   *
   * @param {string} syncStatus SyncStatus van de rij.
   * @returns {boolean} True als de rij verwerkt moet worden.
   */
  function shouldProcessRow_(syncStatus) {
    return (
      syncStatus === CONFIG.syncStatuses.needsSync ||
      syncStatus === CONFIG.syncStatuses.deleteRequested
    );
  }

  /**
   * Verwerkt één hotel-rij.
   *
   * @param {Object} row Hotel-record.
   * @param {string} syncStatus SyncStatus.
   * @returns {void}
   */
  function processRow_(row, syncStatus) {
    try {
      if (syncStatus === CONFIG.syncStatuses.deleteRequested) {
        deleteRowFromCalendar_(row);
        return;
      }

      publishRowToCalendar_(row);
    } catch (error) {
      handlePublicationError_(row, error);
    }
  }

  /**
   * Publiceert of update één hotel in Google Calendar.
   *
   * @param {Object} row Hotel-record.
   * @returns {void}
   */
  function publishRowToCalendar_(row) {
    const log = getLog_();
    const columns = CONFIG.entities.hotel.columns;

    log.info(
      'hotel-publishing-started',
      'Hotel wordt gepubliceerd naar Calendar.',
      `Row: ${row.rowNumber}, HotelId: ${row[columns.hotelId] || ''}`
    );

    validateHotel_(row);

    const calendarEventId = hotelCalendarService.createOrUpdateEvent(row);

    sheetService.updateCell(
      row.rowNumber,
      columns.calendarEventId,
      calendarEventId,
      CONFIG.entities.hotel.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastSyncedAt,
      new Date(),
      CONFIG.entities.hotel.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      '',
      CONFIG.entities.hotel.sheetName
    );

    const transition = syncStatusService.setStatus(
      row.rowNumber,
      CONFIG.syncStatuses.synced,
      CONFIG.entities.hotel.sheetName,
      columns.syncStatus
    );

    auditService.log(entry.hotel({
      action: 'HOTEL_PUBLISHED_TO_CALENDAR',
      record: row,
      details: `CalendarEventId: ${calendarEventId}`,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));

    log.info(
      'hotel-published',
      'Hotel succesvol gepubliceerd naar Calendar.',
      `Row: ${row.rowNumber}, CalendarEventId: ${calendarEventId}`
    );
  }

  /**
   * Verwijdert het gekoppelde Calendar-event voor één hotel.
   *
   * @param {Object} row Hotel-record.
   * @returns {void}
   */
  function deleteRowFromCalendar_(row) {
    const columns = CONFIG.entities.hotel.columns;

    hotelCalendarService.deleteEvent(row);

    sheetService.updateCell(
      row.rowNumber,
      columns.calendarEventId,
      '',
      CONFIG.entities.hotel.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastSyncedAt,
      new Date(),
      CONFIG.entities.hotel.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      '',
      CONFIG.entities.hotel.sheetName
    );

    const transition = syncStatusService.setStatus(
      row.rowNumber,
      CONFIG.syncStatuses.deleted,
      CONFIG.entities.hotel.sheetName,
      columns.syncStatus
    );

    auditService.log(entry.hotel({
      action: 'HOTEL_DELETED_FROM_CALENDAR',
      record: row,
      details: 'Calendar event verwijderd.',
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));
  }

  /**
   * Handelt fouten af tijdens hotel-publicatie of verwijdering.
   *
   * @param {Object} row Hotel-record.
   * @param {Error} error Opgetreden fout.
   * @returns {void}
   */
  function handlePublicationError_(row, error) {
    const log = getLog_();
    const columns = CONFIG.entities.hotel.columns;

    log.error(
      'hotel-publication-error',
      error.message,
      `Row: ${row.rowNumber}, HotelId: ${row[columns.hotelId] || ''}`
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      error.message,
      CONFIG.entities.hotel.sheetName
    );

    const transition = syncStatusService.setStatus(
      row.rowNumber,
      CONFIG.syncStatuses.error,
      CONFIG.entities.hotel.sheetName,
      columns.syncStatus
    );

    syncFailedNotificationService.publish(NOTIFICATION_EVENTS.hotelSyncFailed, {
      sourceId: row[columns.hotelId],
      entity: 'Hotel',
      recordTitle: row[columns.hotelId],
      rowNumber: row.rowNumber,
      errorMessage: error.message
    });

    auditService.log(entry.hotel({
      action: 'HOTEL_PUBLICATION_ERROR',
      record: row,
      details: error.message,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));
  }

  /**
   * Valideert of een hotel voldoende gegevens bevat.
   *
   * @param {Object} row Hotel-record.
   * @throws {Error} Als verplichte velden ontbreken.
   * @returns {void}
   */
  function validateHotel_(row) {
    const columns = CONFIG.entities.hotel.columns;

    [
      columns.hotelId,
      columns.hotel,
      columns.checkInDate,
      columns.checkOutDate
    ].forEach(field => {
      if (!row[field]) {
        throw new Error(`Verplicht veld ontbreekt: ${field}`);
      }
    });
  }

  return {
    sync
  };
})();