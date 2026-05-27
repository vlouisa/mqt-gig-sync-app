/**
 * Synchronisatie-service voor flights naar Google Calendar.
 */
const flightSyncService = (() => {
  const MODULE_NAME = 'flight-sync-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Synchroniseert alle flight-rijen met een verwerkbare SyncStatus.
   *
   * @returns {void}
   */
  function sync() {
    const rows = sheetService.getRowsAsObjects(CONFIG.entities.flight.sheetName);

    rows.forEach(row => {
      const syncStatus = row[CONFIG.entities.flight.columns.syncStatus];

      if (!shouldProcessRow_(syncStatus)) return;

      processRow_(row, syncStatus);
    });
  }

  /**
   * Bepaalt of een flight-rij verwerkt moet worden.
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
   * Verwerkt één flight-rij.
   *
   * @param {Object} row Flight-record.
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
   * Publiceert of update één flight in Google Calendar.
   *
   * @param {Object} row Flight-record.
   * @returns {void}
   */
  function publishRowToCalendar_(row) {
    const log = getLog_();
    const columns = CONFIG.entities.flight.columns;

    log.info(
      'flight-publishing-started',
      'Flight wordt gepubliceerd naar Calendar.',
      `Row: ${row.rowNumber}, FlightId: ${row[columns.flightId] || ''}`
    );

    validateFlight_(row);

    const calendarEventId = flightCalendarService.createOrUpdateEvent(row);

    sheetService.updateCell(
      row.rowNumber,
      columns.calendarEventId,
      calendarEventId,
      CONFIG.entities.flight.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastSyncedAt,
      new Date(),
      CONFIG.entities.flight.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      '',
      CONFIG.entities.flight.sheetName
    );

    const transition = syncStatusService.setStatus(
      row.rowNumber,
      CONFIG.syncStatuses.synced,
      CONFIG.entities.flight.sheetName,
      columns.syncStatus
    );

    auditService.log(entry.flight({
      action: 'FLIGHT_PUBLISHED_TO_CALENDAR',
      record: row,
      details: `CalendarEventId: ${calendarEventId}`,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));

    log.info(
      'flight-published',
      'Flight succesvol gepubliceerd naar Calendar.',
      `Row: ${row.rowNumber}, CalendarEventId: ${calendarEventId}`
    );
  }

  /**
   * Verwijdert het gekoppelde Calendar-event voor één flight.
   *
   * @param {Object} row Flight-record.
   * @returns {void}
   */
  function deleteRowFromCalendar_(row) {
    const columns = CONFIG.entities.flight.columns;

    flightCalendarService.deleteEvent(row);

    sheetService.updateCell(
      row.rowNumber,
      columns.calendarEventId,
      '',
      CONFIG.entities.flight.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastSyncedAt,
      new Date(),
      CONFIG.entities.flight.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      '',
      CONFIG.entities.flight.sheetName
    );

    const transition = syncStatusService.setStatus(
      row.rowNumber,
      CONFIG.syncStatuses.deleted,
      CONFIG.entities.flight.sheetName,
      columns.syncStatus
    );

    auditService.log(entry.flight({
      action: 'FLIGHT_DELETED_FROM_CALENDAR',
      record: row,
      details: 'Calendar event verwijderd.',
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));
  }

  /**
   * Handelt fouten af tijdens flight-publicatie of verwijdering.
   *
   * @param {Object} row Flight-record.
   * @param {Error} error Opgetreden fout.
   * @returns {void}
   */
  function handlePublicationError_(row, error) {
    const log = getLog_();
    const columns = CONFIG.entities.flight.columns;

    log.error(
      'flight-publication-error',
      error.message,
      `Row: ${row.rowNumber}, FlightId: ${row[columns.flightId] || ''}`
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      error.message,
      CONFIG.entities.flight.sheetName
    );

    const transition = syncStatusService.setStatus(
      row.rowNumber,
      CONFIG.syncStatuses.error,
      CONFIG.entities.flight.sheetName,
      columns.syncStatus
    );

    syncFailedNotificationService.publish(NOTIFICATION_EVENTS.flightSyncFailed, {
      sourceId: row[columns.flightId],
      entity: 'Flight',
      recordTitle: row[columns.flightId],
      rowNumber: row.rowNumber,
      errorMessage: error.message
    });

    auditService.log(entry.flight({
      action: 'FLIGHT_PUBLICATION_ERROR',
      record: row,
      details: error.message,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));
  }

  /**
   * Valideert of een flight voldoende gegevens bevat.
   *
   * @param {Object} row Flight-record.
   * @throws {Error} Als verplichte velden ontbreken.
   * @returns {void}
   */
  function validateFlight_(row) {
    const columns = CONFIG.entities.flight.columns;

    [
      columns.flightId,
      columns.flightNumber,
      columns.departureDate,
      columns.departureTime,
      columns.arrivalDate,
      columns.arrivalTime
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