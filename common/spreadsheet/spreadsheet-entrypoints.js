/**
 * Google Sheets simple trigger.
 *
 * Wordt automatisch aangeroepen bij edits in de spreadsheet.
 * Delegeert alle inhoudelijke logica naar onEditService.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e Het edit-event.
 */
function onEdit(e) {
  onEditService.handle(e);
}

/**
 * Beschermt technische kolommen in alle input sheets.
 *
 * @returns {void}
 */
function protectTechnicalColumns() {
  sheetProtectionService.protectTechnicalColumns();
}
