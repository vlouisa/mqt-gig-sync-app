/**
 * Service voor generieke onEdit record-afhandeling.
 */
const onEditRecordService = (() => {
  /**
   * Verwerkt een wijziging in een recordrij.
   *
   * @param {Object} context onEdit context.
   * @returns {void}
   */
  function handleRecordEdit(context) {
    if (!context || !context.provider) return;

    if (shouldIgnoreEdit_(context)) return;

    const row = sheetService.getRowAsObject(
      context.rowNumber,
      context.sheetName
    );

    if (isNewRecord_(row, context.provider)) {
      handleCreatedRecord_(row, context);
      return;
    }

    if (shouldMarkNeedsSync_(row, context.provider)) {
      handleChangedAfterPublication_(row, context);
    }
  }

  /**
   * Bepaalt of de wijziging genegeerd moet worden.
   *
   * @param {Object} context onEdit context.
   * @returns {boolean} True als de wijziging genegeerd moet worden.
   */
  function shouldIgnoreEdit_(context) {
    const ignoredColumns = context.provider.ignoredColumns || [];

    return ignoredColumns.includes(context.columnName);
  }

  /**
   * Controleert of het record nog geen SyncStatus heeft.
   *
   * @param {Object} row Rij-object.
   * @param {Object} provider Providerconfiguratie.
   * @returns {boolean} True als het een nieuw record is.
   */
  function isNewRecord_(row, provider) {
    return !row[provider.syncStatusColumn];
  }

  /**
   * Controleert of een record na wijziging opnieuw gesynchroniseerd moet worden.
   *
   * Geldt voor records die al gepubliceerd zijn of in ERROR staan.
   *
   * @param {Object} row Rij-object.
   * @param {Object} provider Providerconfiguratie.
   * @returns {boolean} True als het record naar NEEDS_SYNC moet.
   */
  function shouldMarkNeedsSync_(row, provider) {
    const status = row[provider.syncStatusColumn];

    return (
      status === CONFIG.syncStatuses.synced ||
      status === CONFIG.syncStatuses.error
    );
  }

  /**
   * Handelt een nieuw record af.
   *
   * @param {Object} row Rij-object.
   * @param {Object} context onEdit context.
   * @returns {void}
   */
  function handleCreatedRecord_(row, context) {
    const transition = syncStatusService.setStatus(
      context.rowNumber,
      CONFIG.syncStatuses.draft,
      context.sheetName,
      context.provider.syncStatusColumn
    );

    auditService.log(context.provider.auditEntryFactory({
      action: context.provider.auditActions.created,
      record: row,
      details: `Column: ${context.columnName}`,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));
  }

  /**
   * Handelt een wijziging af op een al gepubliceerd of gefaald record.
   *
   * @param {Object} row Rij-object.
   * @param {Object} context onEdit context.
   * @returns {void}
   */
  function handleChangedAfterPublication_(row, context) {
    const transition = syncStatusService.setStatus(
      context.rowNumber,
      CONFIG.syncStatuses.needsSync,
      context.sheetName,
      context.provider.syncStatusColumn
    );

    auditService.log(context.provider.auditEntryFactory({
      action: context.provider.auditActions.changedAfterPublication,
      record: row,
      details: `Column: ${context.columnName}`,
      oldStatus: transition.fromStatus,
      newStatus: transition.toStatus
    }));
  }

  return {
    handleRecordEdit
  };
})();