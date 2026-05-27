/**
 * Provider voor generieke onEdit-contextinformatie.
 */
const onEditContextProvider = (() => {
  /**
   * Geeft contextinformatie terug voor een onEdit event.
   *
   * @param {GoogleAppsScript.Events.SheetsOnEdit} e Apps Script onEdit event.
   * @returns {Object|null} Contextobject of null als de sheet niet ondersteund wordt.
   */
  function getContext(e) {
    if (!e || !e.range) {
      return null;
    }

    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();

    const provider = resolveProvider_(sheetName);

    if (!provider) {
      return null;
    }

    const headers = sheetService.getHeaders(sheet);
    const editedColumnIndex = e.range.getColumn();
    const editedColumnName = headers[editedColumnIndex - 1];

    return {
      event: e,
      sheet,
      sheetName,
      rowNumber: e.range.getRow(),
      columnNumber: editedColumnIndex,
      columnName: editedColumnName,
      provider
    };
  }

  /**
   * Resolve een providerconfiguratie op basis van sheetnaam.
   *
   * @param {string} sheetName Naam van het tabblad.
   * @returns {Object|null} Providerconfiguratie of null.
   */
  function resolveProvider_(sheetName) {
    const providers = getProviders_();

    return providers[sheetName] || null;
  }

  /**
   * Geeft alle onEdit providers terug.
   *
   * @returns {Object.<string, Object>} Providerconfiguraties per sheetnaam.
   */
  function getProviders_() {
    return {
      [CONFIG.entities.gig.sheetName]: {
        syncStatusColumn: CONFIG.entities.gig.columns.syncStatus,
        columns: CONFIG.entities.gig.columns,
        ignoredColumns: [
          CONFIG.entities.gig.columns.gigId,
          CONFIG.entities.gig.columns.syncStatus,
          CONFIG.entities.gig.columns.calendarEventId,
          CONFIG.entities.gig.columns.lastSyncedAt,
          CONFIG.entities.gig.columns.lastError,
          CONFIG.entities.gig.columns.createdAt,
          CONFIG.entities.gig.columns.updatedAt
        ],
        auditEntryFactory: entry.gig,
        auditActions: {
          created: 'GIG_CREATED',
          changedAfterPublication: 'GIG_CHANGED_AFTER_PUBLICATION'
        }
      },

      [CONFIG.entities.flight.sheetName]: {
        syncStatusColumn: CONFIG.entities.flight.columns.syncStatus,
        columns: CONFIG.entities.flight.columns,
        ignoredColumns: [
          CONFIG.entities.flight.columns.flightId,
          CONFIG.entities.flight.columns.syncStatus,
          CONFIG.entities.flight.columns.calendarEventId,
          CONFIG.entities.flight.columns.lastSyncedAt,
          CONFIG.entities.flight.columns.lastError,
          CONFIG.entities.flight.columns.createdAt,
          CONFIG.entities.flight.columns.updatedAt
        ],
        auditEntryFactory: entry.flight,
        auditActions: {
          created: 'FLIGHT_CREATED',
          changedAfterPublication: 'FLIGHT_CHANGED_AFTER_PUBLICATION'
        }
      },

      [CONFIG.entities.hotel.sheetName]: {
        syncStatusColumn: CONFIG.entities.hotel.columns.syncStatus,
        columns: CONFIG.entities.hotel.columns,
        ignoredColumns: [
          CONFIG.entities.hotel.columns.hotelId,
          CONFIG.entities.hotel.columns.syncStatus,
          CONFIG.entities.hotel.columns.calendarEventId,
          CONFIG.entities.hotel.columns.lastSyncedAt,
          CONFIG.entities.hotel.columns.lastError,
          CONFIG.entities.hotel.columns.createdAt,
          CONFIG.entities.hotel.columns.updatedAt
        ],
        auditEntryFactory: entry.hotel,
        auditActions: {
          created: 'HOTEL_CREATED',
          changedAfterPublication: 'HOTEL_CHANGED_AFTER_PUBLICATION'
        }
      }
    };
  }

  return {
    getContext
  };
})();