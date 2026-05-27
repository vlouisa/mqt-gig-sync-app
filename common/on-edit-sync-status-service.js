/**
 * Service voor het verwerken van handmatige SyncStatus-wijzigingen.
 */
const onEditSyncStatusService = (() => {
  /**
   * Verwerkt een handmatige wijziging van de SyncStatus kolom.
   *
   * @param {Object} context onEdit context.
   * @returns {boolean} True als de wijziging een SyncStatus-edit was.
   */
  function handleSyncStatusEdit(context) {
    if (!context || !context.provider) return false;

    if (!isSyncStatusColumn_(context)) return false;

    validateManualStatusChange_(context);

    return true;
  }

  /**
   * Controleert of de gewijzigde kolom de SyncStatus kolom is.
   *
   * @param {Object} context onEdit context.
   * @returns {boolean} True als de SyncStatus kolom gewijzigd werd.
   */
  function isSyncStatusColumn_(context) {
    return context.columnName === context.provider.syncStatusColumn;
  }

  /**
   * Valideert een handmatige SyncStatus wijziging.
   *
   * Zet bij een ongeldige overgang de oude waarde terug.
   *
   * @param {Object} context onEdit context.
   * @throws {Error} Als de overgang ongeldig is.
   * @returns {void}
   */
  function validateManualStatusChange_(context) {
    const oldStatus = normalizeStatus_(context.event.oldValue);
    const newStatus = normalizeStatus_(context.event.value);

    if (!newStatus) return;

    if (syncStatusService.canTransition(oldStatus, newStatus)) {
      return;
    }

    restoreOldStatus_(context, oldStatus);
    auditService.log(context.provider.auditEntryFactory({
      action: 'INVALID_SYNC_STATUS_TRANSITION',
      record: sheetService.getRowAsObject(context.rowNumber, context.sheetName),
      details: `Manual change rejected: ${oldStatus || '(leeg)'} → ${newStatus}`,
      oldStatus,
      newStatus
    }));



    throw new Error(
      `Ongeldige SyncStatus overgang: ${oldStatus || '(leeg)'} → ${newStatus}`
    );
  }

  /**
   * Zet de oude SyncStatus terug in de bewerkte cel.
   *
   * @param {Object} context onEdit context.
   * @param {string} oldStatus Oude SyncStatus.
   * @returns {void}
   */
  function restoreOldStatus_(context, oldStatus) {
    context.event.range.setValue(oldStatus);
  }

  /**
   * Normaliseert een SyncStatus waarde.
   *
   * @param {*} value SyncStatus waarde.
   * @returns {string} Genormaliseerde SyncStatus.
   */
  function normalizeStatus_(value) {
    return String(value || '').trim();
  }

  return {
    handleSyncStatusEdit
  };
})();