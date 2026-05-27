/**
 * Synchronisatie-service voor het publiceren van gigdata naar Google Calendar.
 *
 * Verantwoordelijkheden:
 * - leest alle gig-rijen uit de Sheet;
 * - verwerkt rijen met SyncStatus = NEEDS_SYNC of DELETE_REQUESTED;
 * - valideert verplichte gigdata vóór publicatie;
 * - maakt, update of verwijdert Google Calendar-events;
 * - schrijft technische velden terug;
 * - schrijft audit-logregels.
 */
const gigSyncService = (() => {
  const MODULE_NAME = 'gig-sync-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Verwerkt alle gigs die klaarstaan voor publicatie of verwijdering.
   *
   * @returns {void}
   */
  function sync() {
    const rows = sheetService.getRowsAsObjects(CONFIG.entities.gig.sheetName);

    rows.forEach(row => {
      const syncStatus = row[CONFIG.entities.gig.columns.syncStatus];

      if (!shouldProcessRow_(syncStatus)) {
        return;
      }

      processRow_(row, syncStatus);
    });
  }

  /**
   * Bepaalt of een rij verwerkt moet worden.
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
   * Verwerkt één gig-rij.
   *
   * @param {Object} row Gig-record uit de Sheet.
   * @param {string} syncStatus SyncStatus van de rij.
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
   * Publiceert of update één gig in Google Calendar.
   *
   * @param {Object} row Gig-record uit de Sheet.
   * @returns {void}
   */
  function publishRowToCalendar_(row) {
    const log = getLog_();
    const columns = CONFIG.entities.gig.columns;

    log.info(
      'row-publishing-started',
      'Rij wordt gepubliceerd naar Calendar.',
      `Row: ${row.rowNumber}, GigId: ${row[columns.gigId] || ''}`
    );

    ensureTechnicalFields_(row);

    const refreshedRow = sheetService.getRowAsObject(
      row.rowNumber,
      CONFIG.entities.gig.sheetName
    );

    validateGig_(refreshedRow);

    const calendarEventId = gigCalendarService.createOrUpdateEvent(refreshedRow);

    sheetService.updateCell(
      refreshedRow.rowNumber,
      columns.calendarEventId,
      calendarEventId,
      CONFIG.entities.gig.sheetName
    );

    sheetService.updateCell(
      refreshedRow.rowNumber,
      columns.lastSyncedAt,
      new Date(),
      CONFIG.entities.gig.sheetName
    );

    sheetService.updateCell(
      refreshedRow.rowNumber,
      columns.lastError,
      '',
      CONFIG.entities.gig.sheetName
    );

    const transition = syncStatusService.setStatus(
      refreshedRow.rowNumber,
      CONFIG.syncStatuses.synced,
      CONFIG.entities.gig.sheetName,
      columns.syncStatus
    );

    gigNotificationService.publishGigPublished(refreshedRow);

    auditService.log(entry.gig({
      action: 'GIG_PUBLISHED_TO_CALENDAR',
      record: refreshedRow,
      details: `CalendarEventId: ${calendarEventId}`,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));

    log.info(
      'row-published',
      'Rij succesvol gepubliceerd naar Calendar.',
      `Row: ${refreshedRow.rowNumber}, CalendarEventId: ${calendarEventId}`
    );
  }

  /**
   * Verwijdert het gekoppelde Calendar-event voor één gig.
   *
   * @param {Object} row Gig-record uit de Sheet.
   * @returns {void}
   */
  function deleteRowFromCalendar_(row) {
    const columns = CONFIG.entities.gig.columns;

    gigCalendarService.deleteEvent(row);

    sheetService.updateCell(
      row.rowNumber,
      columns.calendarEventId,
      '',
      CONFIG.entities.gig.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastSyncedAt,
      new Date(),
      CONFIG.entities.gig.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      '',
      CONFIG.entities.gig.sheetName
    );

    const transition = syncStatusService.setStatus(
      row.rowNumber,
      CONFIG.syncStatuses.deleted,
      CONFIG.entities.gig.sheetName,
      columns.syncStatus
    );

    auditService.log(entry.gig({
      action: 'GIG_DELETED_FROM_CALENDAR',
      record: row,
      details: 'Calendar event verwijderd.',
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));
  }

  /**
   * Handelt fouten af tijdens publicatie of verwijdering.
   *
   * @param {Object} row Gig-record uit de Sheet.
   * @param {Error} error Opgetreden fout.
   * @returns {void}
   */
  function handlePublicationError_(row, error) {
    const log = getLog_();
    const columns = CONFIG.entities.gig.columns;

    log.error(
      'row-publication-error',
      error.message,
      `Row: ${row.rowNumber}, GigId: ${row[columns.gigId] || ''}`
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      error.message,
      CONFIG.entities.gig.sheetName
    );

    const transition = syncStatusService.setStatus(
      row.rowNumber,
      CONFIG.syncStatuses.error,
      CONFIG.entities.gig.sheetName,
      columns.syncStatus
    );

    syncFailedNotificationService.publish(NOTIFICATION_EVENTS.gigSyncFailed, {
      sourceId: row[columns.gigId],
      entity: 'Gig',
      recordTitle: row[columns.gigId],
      rowNumber: row.rowNumber,
      errorMessage: error.message
    });

    auditService.log(entry.gig({
      action: 'GIG_PUBLICATION_ERROR',
      record: row,
      details: error.message,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));
  }

  /**
   * Valideert of een gig voldoende gegevens bevat om veilig gepubliceerd te worden.
   *
   * @param {Object} row Gig-record uit de Sheet.
   * @throws {Error} Als verplichte velden ontbreken of End niet later is dan Start.
   * @returns {void}
   */
  function validateGig_(row) {
    const columns = CONFIG.entities.gig.columns;

    const requiredFields = [
      columns.gigId,
      columns.gigStatus,
      columns.title,
      columns.date,
      columns.start,
      columns.end
    ];

    requiredFields.forEach(field => {
      if (!row[field]) {
        throw new Error(`Verplicht veld ontbreekt: ${field}`);
      }
    });

    const startDateTime = calendarService.buildDateTime(
      row[columns.date],
      row[columns.start]
    );

    const endDateTime = calendarService.buildDateTime(
      row[columns.date],
      row[columns.end]
    );

    if (endDateTime <= startDateTime) {
      throw new Error('End moet later zijn dan Start.');
    }
  }

  /**
   * Zorgt dat technische velden voor een gig gevuld zijn.
   *
   * @param {Object} row Gig-record uit de Sheet.
   * @returns {void}
   */
  function ensureTechnicalFields_(row) {
    const columns = CONFIG.entities.gig.columns;

    if (!row[columns.gigId]) {
      sheetService.updateCell(
        row.rowNumber,
        columns.gigId,
        Utilities.getUuid(),
        CONFIG.entities.gig.sheetName
      );
    }

    if (!row[columns.createdAt]) {
      sheetService.updateCell(
        row.rowNumber,
        columns.createdAt,
        new Date(),
        CONFIG.entities.gig.sheetName
      );
    }

    sheetService.updateCell(
      row.rowNumber,
      columns.updatedAt,
      new Date(),
      CONFIG.entities.gig.sheetName
    );
  }

  return {
    sync
  };
})();