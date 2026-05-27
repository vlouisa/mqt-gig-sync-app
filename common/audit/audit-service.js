/**
 * Service voor append-only audit logging.
 */
const auditService = (() => {
  const MODULE_NAME = 'audit-service';

  /**
   * Schrijft een audit-entry naar de audit-log sheet.
   *
   * @param {BaseAuditEntry} auditEntry Audit-entry.
   * @returns {void}
   */
  function log(auditEntry) {
    validateAuditEntry_(auditEntry);

    const row = auditEntry.toRow();

    sheetService
      .getSheet(CONFIG.auditLog.sheetName)
      .appendRow(row);

    logService
      .forModule(MODULE_NAME)
      .info(
        'audit-entry-written',
        'Audit-entry geschreven.',
        `Action: ${row[1] || '-'}`
      );
  }

  /**
   * Valideert een audit-entry vóór logging.
   *
   * @param {*} auditEntry Audit-entry.
   * @throws {Error} Als de audit-entry ongeldig is.
   * @returns {void}
   */
  function validateAuditEntry_(auditEntry) {
    if (!auditEntry) {
      throw new Error('Audit-entry ontbreekt.');
    }

    if (typeof auditEntry.toRow !== 'function') {
      throw new Error('Audit-entry mist functie toRow().');
    }
  }

  return {
    log
  };
})();