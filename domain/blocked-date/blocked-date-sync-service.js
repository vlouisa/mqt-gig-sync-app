/**
 * Synchronisatie-service voor het publiceren van blocked dates naar Google Calendar.
 *
 * Verantwoordelijkheden:
 * - leest blocked-date rijen uit de Sheet;
 * - verwerkt rijen met SyncStatus = NEEDS_SYNC of DELETE_REQUESTED;
 * - valideert verplichte blocked-date data;
 * - maakt, update of verwijdert Google Calendar-events;
 * - schrijft technische velden terug.
 * - schrijft audit-logregels.
 */
const blockedDateSyncService = (() => {
  const MODULE_NAME = 'blocked-date-sync-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Verwerkt alle blocked dates die klaarstaan voor publicatie of verwijdering.
   *
   * @returns {void}
   */
  function sync() {
    const rows = sheetService.getRowsAsObjects(CONFIG.entities.blockedDate.sheetName);

    rows.forEach(row => {
      const syncStatus = row[CONFIG.entities.blockedDate.columns.syncStatus];

      if (!shouldProcessRow_(syncStatus)) {
        return;
      }

      processRow_(row, syncStatus);
    });
  }

  /**
   * Bepaalt of een blocked-date rij verwerkt moet worden.
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
   * Verwerkt één blocked-date rij.
   *
   * @param {Object} row Blocked-date record uit de Sheet.
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
      handleSyncError_(row, error);
    }
  }

  /**
   * Publiceert of update één blocked date in Google Calendar.
   *
   * @param {Object} row Blocked-date record uit de Sheet.
   * @returns {void}
   */
  function publishRowToCalendar_(row) {
    const log = getLog_();
    const columns = CONFIG.entities.blockedDate.columns;

    log.info(
      'blocked-date-publishing-started',
      'Blocked date wordt gepubliceerd naar Calendar.',
      `Row: ${row.rowNumber}, BlockId: ${row[columns.blockId] || ''}`
    );

    ensureTechnicalFields_(row);

    const refreshedRow = sheetService.getRowAsObject(
      row.rowNumber,
      CONFIG.entities.blockedDate.sheetName
    );

    validateBlockedDate_(refreshedRow);

    const calendarEventId = blockedDateCalendarService.createOrUpdateEvent(refreshedRow);

    sheetService.updateCell(
      refreshedRow.rowNumber,
      columns.calendarEventId,
      calendarEventId,
      CONFIG.entities.blockedDate.sheetName
    );

    sheetService.updateCell(
      refreshedRow.rowNumber,
      columns.lastSyncedAt,
      new Date(),
      CONFIG.entities.blockedDate.sheetName
    );

    sheetService.updateCell(
      refreshedRow.rowNumber,
      columns.lastError,
      '',
      CONFIG.entities.blockedDate.sheetName
    );

    const transition = syncStatusService.setStatus(
      refreshedRow.rowNumber,
      CONFIG.syncStatuses.synced,
      CONFIG.entities.blockedDate.sheetName,
      columns.syncStatus
    );

    auditService.log(entry.blockedDate({
      action: 'BLOCKED_DATE_PUBLISHED_TO_CALENDAR',
      record: refreshedRow,
      details: `CalendarEventId: ${calendarEventId}`,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));

    log.info(
      'blocked-date-published',
      'Blocked date succesvol gepubliceerd naar Calendar.',
      `Row: ${refreshedRow.rowNumber}, CalendarEventId: ${calendarEventId}`
    );
  }

  /**
   * Verwijdert het gekoppelde Calendar-event voor één blocked date.
   *
   * @param {Object} row Blocked-date record uit de Sheet.
   * @returns {void}
   */
  function deleteRowFromCalendar_(row) {
    const columns = CONFIG.entities.blockedDate.columns;

    blockedDateCalendarService.deleteEvent(row);

    sheetService.updateCell(
      row.rowNumber,
      columns.calendarEventId,
      '',
      CONFIG.entities.blockedDate.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastSyncedAt,
      new Date(),
      CONFIG.entities.blockedDate.sheetName
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      '',
      CONFIG.entities.blockedDate.sheetName
    );

    const transition = syncStatusService.setStatus(
      refreshedRow.rowNumber,
      CONFIG.syncStatuses.deleted,
      CONFIG.entities.blockedDate.sheetName,
      columns.syncStatus
    );
    
    auditService.log(entry.blockedDate({
      action: 'BLOCKED_DATE_DELETED_FROM_CALENDAR',
      record: row,
      details: 'Calendar event verwijderd.',
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));

  }

  /**
   * Handelt fouten af tijdens publicatie of verwijdering.
   *
   * @param {Object} row Blocked-date record uit de Sheet.
   * @param {Error} error Opgetreden fout.
   * @returns {void}
   */
  function handleSyncError_(row, error) {
    const log = getLog_();
    const columns = CONFIG.entities.blockedDate.columns;

    log.error(
      'blocked-date-sync-error',
      error.message,
      `Row: ${row.rowNumber}, BlockId: ${row[columns.blockId] || ''}`
    );

    sheetService.updateCell(
      row.rowNumber,
      columns.lastError,
      error.message,
      CONFIG.entities.blockedDate.sheetName
    );

    const transition = syncStatusService.setStatus(
      refreshedRow.rowNumber,
      CONFIG.syncStatuses.error,
      CONFIG.entities.blockedDate.sheetName,
      columns.syncStatus
    );

    auditService.log(entry.blockedDate({
      action: 'BLOCKED_DATE_PUBLICATION_ERROR',
      record: row,
      details: error.message,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));

  }

  /**
   * Valideert of een blocked date voldoende gegevens bevat om gepubliceerd te worden.
   *
   * @param {Object} row Blocked-date record uit de Sheet.
   * @throws {Error} Als verplichte velden ontbreken of datums ongeldig zijn.
   * @returns {void}
   */
  function validateBlockedDate_(row) {
    const columns = CONFIG.entities.blockedDate.columns;

    const requiredFields = [
      columns.name,
      columns.startDate,
      columns.endDate,
      columns.blockId
    ];

    requiredFields.forEach(field => {
      if (!row[field]) {
        throw new Error(`Verplicht veld ontbreekt: ${field}`);
      }
    });

    if (!(row[columns.startDate] instanceof Date)) {
      throw new Error('Startdatum moet een geldige datum zijn.');
    }

    if (!(row[columns.endDate] instanceof Date)) {
      throw new Error('Einddatum moet een geldige datum zijn.');
    }

    if (row[columns.endDate] < row[columns.startDate]) {
      throw new Error('Einddatum mag niet vóór Startdatum liggen.');
    }
  }

  /**
   * Zorgt dat technische velden voor een blocked date gevuld zijn.
   *
   * @param {Object} row Blocked-date record uit de Sheet.
   * @returns {void}
   */
  function ensureTechnicalFields_(row) {
    const columns = CONFIG.entities.blockedDate.columns;

    if (!row[columns.blockId]) {
      sheetService.updateCell(
        row.rowNumber,
        columns.blockId,
        Utilities.getUuid(),
        CONFIG.entities.blockedDate.sheetName
      );
    }

    if (!row[columns.createdAt]) {
      sheetService.updateCell(
        row.rowNumber,
        columns.createdAt,
        new Date(),
        CONFIG.entities.blockedDate.sheetName
      );
    }

    sheetService.updateCell(
      row.rowNumber,
      columns.updatedAt,
      new Date(),
      CONFIG.entities.blockedDate.sheetName
    );
  }

  return {
    sync
  };
})();