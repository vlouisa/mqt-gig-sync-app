/**
 * Service voor automatische User ID-afhandeling op het user-input tabblad.
 */
const userOnEditService = (() => {
  /**
   * Verwerkt een onEdit-event voor het user-input tabblad.
   *
   * @param {GoogleAppsScript.Events.SheetsOnEdit} e Apps Script onEdit-event.
   * @returns {boolean} True als de edit door deze service is afgehandeld.
   */
  function handle(e) {
    if (!e || !e.range) {
      return false;
    }

    const sheet = e.range.getSheet();

    if (sheet.getName() !== CONFIG.entities.user.sheetName) {
      return false;
    }

    const rowNumber = e.range.getRow();

    if (rowNumber === 1) {
      return true;
    }

    ensureUserId_(sheet, rowNumber);

    return true;
  }

  /**
   * Zorgt dat een user-rij automatisch een User ID krijgt zodra Naam of Email is ingevuld.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet User-input tabblad.
   * @param {number} rowNumber 1-based rijnummer.
   * @returns {void}
   */
  function ensureUserId_(sheet, rowNumber) {
    const columns = CONFIG.entities.user.columns;
    const columnMap = sheetService.getColumnIndexMapCached(CONFIG.entities.user.sheetName);

    const name = sheet.getRange(rowNumber, columnMap[columns.name]).getValue();
    const email = sheet.getRange(rowNumber, columnMap[columns.email]).getValue();
    const userIdCell = sheet.getRange(rowNumber, columnMap[columns.userId]);
    const userId = userIdCell.getValue();

    if ((!name && !email) || userId) {
      return;
    }

    userIdCell.setValue(generateUserId_());
  }

  /**
   * Genereert een nieuwe stabiele User ID.
   *
   * @returns {string} Nieuwe User ID.
   */
  function generateUserId_() {
    return `USER-${Utilities.getUuid()}`;
  }

  return {
    handle
  };
})();