/**
 * Service voor het beschermen van technische kolommen in input sheets.
 */
const sheetProtectionService = (() => {
  const MODULE_NAME = 'sheet-protection-service';

  /**
   * Beschermt technische kolommen voor alle entity input sheets.
   *
   * @returns {void}
   */
  function protectTechnicalColumns() {
    const log = logService.forModule(MODULE_NAME);

    Object.keys(CONFIG.entities).forEach(entityKey => {
      const entityConfig = CONFIG.entities[entityKey];

      log.info(
        'protect-entity-started',
        'Start protection voor entity.',
        `Entity: ${entityKey}, Sheet: ${entityConfig.sheetName}, Keys: ${(entityConfig.technicalColumnKeys || []).join(', ')}`
      );

      protectEntityTechnicalColumns_(entityConfig);
    });

    log.info(
      'technical-columns-protected',
      'Technische kolommen beschermd.',
      ''
    );
  }

  /**
   * Beschermt technische kolommen voor één entity.
   *
   * @param {Object} entityConfig Entity-configuratie.
   * @returns {void}
   */
  function protectEntityTechnicalColumns_(entityConfig) {
    const technicalColumns = getTechnicalColumns_(entityConfig);

    technicalColumns.forEach(columnName => {
      protectColumn_(entityConfig.sheetName, columnName);
    });
  }

  /**
   * Geeft de technische kolomnamen terug voor een entity.
   *
   * Resolveert technicalColumnKeys via entityConfig.columns.
   *
   * @param {Object} entityConfig Entity-configuratie.
   * @returns {string[]} Technische kolomnamen.
   */
  function getTechnicalColumns_(entityConfig) {
    return (entityConfig.technicalColumnKeys || [])
      .map(key => entityConfig.columns[key])
      .filter(Boolean);
  }

  /**
   * Beschermt één kolom op basis van kolomnaam.
   *
   * @param {string} sheetName Naam van het tabblad.
   * @param {string} columnName Headernaam van de kolom.
   * @returns {void}
   */
  function protectColumn_(sheetName, columnName) {
    const log = logService.forModule(MODULE_NAME);
    const sheet = sheetService.getSheet(sheetName);
    const columnMap = sheetService.getColumnIndexMapCached(sheetName);
    const columnIndex = columnMap[columnName];

    if (!columnIndex) {
      throw new Error(`Kolom niet gevonden voor protection: ${columnName} in ${sheetName}`);
    }

    log.info(
      'protect-column',
      'Kolom wordt beschermd.',
      `Sheet: ${sheetName}, Column: ${columnName}`
    );

    removeExistingProtection_(sheet, columnName);

    const range = sheet.getRange(1, columnIndex, sheet.getMaxRows(), 1);
    const protection = range.protect();

    protection.setDescription(
      buildProtectionDescription_(sheetName, columnName)
    );

    protection.setWarningOnly(false);

    protection.removeEditors(protection.getEditors());
    protection.addEditor(CONFIG.adminEmail);
  }

  /**
   * Verwijdert bestaande protection voor dezelfde technische kolom.
   *
   * Voorkomt dubbele protections bij opnieuw uitvoeren.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Sheet.
   * @param {string} columnName Headernaam van de kolom.
   * @returns {void}
   */
  function removeExistingProtection_(sheet, columnName) {
    const description = buildProtectionDescription_(
      sheet.getName(),
      columnName
    );

    sheet
      .getProtections(SpreadsheetApp.ProtectionType.RANGE)
      .filter(protection => protection.getDescription() === description)
      .forEach(protection => protection.remove());
  }

  /**
   * Bouwt een vaste protection description.
   *
   * @param {string} sheetName Naam van het tabblad.
   * @param {string} columnName Headernaam van de kolom.
   * @returns {string} Protection description.
   */
  function buildProtectionDescription_(sheetName, columnName) {
    return `Protected technical column: ${sheetName}.${columnName}`;
  }

  return {
    protectTechnicalColumns
  };
})();