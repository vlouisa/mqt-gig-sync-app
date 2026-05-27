/**
 * Centrale orchestratie-service voor onEdit events.
 */
const onEditService = (() => {
  const MODULE_NAME = 'on-edit-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

/**
 * Verwerkt een Apps Script onEdit event.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e Apps Script onEdit event.
 * @returns {void}
 */
function handle(e) {
  const handledAsUserEdit = userOnEditService.handle(e);
  if (handledAsUserEdit) {
    return;
  }

  const log = getLog_();
  try {
    const context = onEditContextProvider.getContext(e);

    if (!context) {
      return;
    }

    const handledAsSyncStatusEdit =
      onEditSyncStatusService.handleSyncStatusEdit(context);

    if (handledAsSyncStatusEdit) {
      return;
    }

    onEditRecordService.handleRecordEdit(context);

    log.info(
      'on-edit-processed',
      'onEdit succesvol verwerkt.',
      `Sheet: ${context.sheetName}, Row: ${context.rowNumber}, Column: ${context.columnName}`
    );
  } catch (error) {
    handleError_(error, e);
  }
}

  /**
   * Handelt fouten af tijdens onEdit verwerking.
   *
   * @param {Error} error Opgetreden fout.
   * @param {GoogleAppsScript.Events.SheetsOnEdit} e Apps Script onEdit event.
   * @returns {void}
   */
  function handleError_(error, e) {
    const log = getLog_();

    const sheetName = e?.range?.getSheet?.().getName?.() || '-';
    const rowNumber = e?.range?.getRow?.() || '-';
    const columnNumber = e?.range?.getColumn?.() || '-';

    log.error(
      'on-edit-error',
      error.message,
      `Sheet: ${sheetName}, Row: ${rowNumber}, Column: ${columnNumber}`
    );
  }

  return {
    handle
  };
})();