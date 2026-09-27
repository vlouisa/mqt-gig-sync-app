/**
 * Schrijft een UUID naar een lege Gig ID-cel op het gig-input tabblad.
 * @param {number} rowNumber 1-based rijnummer.
 * @returns {void}
 */
function ensureGigId(rowNumber) {
  const sheet = sheetService.getSheet(CONFIG.entities.gig.sheetName);
  const headers = sheetService.getHeaders(sheet);
  const columnMap = sheetService.getColumnIndexMap(headers);

  const gigIdCell = sheet.getRange(rowNumber, columnMap[CONFIG.entities.gig.columns.gigId]);
  const currentGigId = gigIdCell.getValue();

  if (currentGigId) {
    return;
  }

  const newGigId = Utilities.getUuid();

  gigIdCell.setValue(newGigId);
}

/**
 * Vult een lege CreatedAt-cel op gig-input met het huidige tijdstip.
 * @param {number} rowNumber 1-based rijnummer.
 * @returns {void}
 */
function ensureCreatedAt(rowNumber) {
  const sheet = sheetService.getSheet(CONFIG.entities.gig.sheetName);
  const headers = sheetService.getHeaders(sheet);
  const columnMap = sheetService.getColumnIndexMap(headers);

  const createdAtCell = sheet.getRange(rowNumber, columnMap[CONFIG.entities.gig.columns.createdAt]);

  if (!createdAtCell.getValue()) {
    createdAtCell.setValue(new Date());
  }
}
