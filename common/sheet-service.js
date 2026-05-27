/**
 * Generic Sheet helper service.
 */
const sheetService = (() => {
  const MODULE_NAME = 'sheet-service';
  const HEADER_ROW = 1;
  const FIRST_COLUMN = 1;
  const FIRST_DATA_ROW_INDEX = 1;
  const CACHE_TTL_SECONDS = 21600;

  /**
   * Haalt een sheet op basis van sheetnaam.
   *
   * @param {string} sheetName Naam van het tabblad.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} Het gevonden sheet-tabblad.
   * @throws {Error} Als het tabblad niet bestaat.
   */
  function getSheet(sheetName) {
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(`Sheet niet gevonden: ${sheetName}`);
    }

    return sheet;
  }

  /**
   * Leest de headers uit de header-rij van een sheet.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Sheet waaruit headers gelezen worden.
   * @returns {string[]} Array met kolomnamen.
   */
  function getHeaders(sheet) {
    return sheet
      .getRange(HEADER_ROW, FIRST_COLUMN, 1, sheet.getLastColumn())
      .getValues()[0];
  }

  /**
   * Bouwt een mapping van kolomnaam naar 1-based kolomindex.
   *
   * @param {string[]} headers Array met kolomnamen.
   * @returns {Object.<string, number>} Mapping van kolomnaam naar 1-based kolomindex.
   */
  function getColumnIndexMap(headers) {
    const map = {};

    headers.forEach((header, index) => {
      map[header] = index + 1;
    });

    return map;
  }

  /**
   * Haalt een gecachte kolomindex-map op voor een sheet.
   *
   * @param {string} sheetName Naam van het tabblad.
   * @returns {Object.<string, number>} Mapping van kolomnaam naar kolomindex.
   */
  function getColumnIndexMapCached(sheetName) {
    const cache = CacheService.getScriptCache();
    const cacheKey = buildColumnMapCacheKey_(sheetName);

    const cached = cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const sheet = getSheet(sheetName);
    const headers = getHeaders(sheet);
    const columnMap = getColumnIndexMap(headers);

    cache.put(cacheKey, JSON.stringify(columnMap), CACHE_TTL_SECONDS);

    return columnMap;
  }

  /**
   * Leegt de gecachte column index map voor een sheet.
   *
   * @param {string} sheetName Naam van het tabblad.
   * @returns {void}
   */
  function clearColumnIndexMapCache(sheetName) {
    const log = logService.forModule(MODULE_NAME);
    const cache = CacheService.getScriptCache();
    const cacheKey = buildColumnMapCacheKey_(sheetName);

    cache.remove(cacheKey);

    log.info(
      'column-map-cache-cleared',
      'Column index map cache geleegd.',
      `Sheet: ${sheetName}`
    );
  }

  /**
   * Leest alle datarijen van een sheet als objecten.
   *
   * @param {string} sheetName Naam van het tabblad.
   * @returns {Object[]} Array met rij-objecten.
   */
  function getRowsAsObjects(sheetName) {
    const sheet = getSheet(sheetName);
    const headers = getHeaders(sheet);
    const values = sheet.getDataRange().getValues();

    const rows = [];

    for (let r = FIRST_DATA_ROW_INDEX; r < values.length; r++) {
      rows.push(buildRowObject_(headers, values[r], r + 1));
    }

    return rows;
  }

  /**
   * Leest één rij uit een sheet als object.
   *
   * @param {number} rowNumber 1-based rij nummer.
   * @param {string} sheetName Naam van het tabblad.
   * @returns {Object} Rij-object met rowNumber property.
   */
  function getRowAsObject(rowNumber, sheetName) {
    const sheet = getSheet(sheetName);
    const headers = getHeaders(sheet);
    const row = sheet
      .getRange(rowNumber, FIRST_COLUMN, 1, sheet.getLastColumn())
      .getValues()[0];

    return buildRowObject_(headers, row, rowNumber);
  }

  /**
   * Voegt een rij toe aan een sheet op basis van kolomnamen.
   *
   * @param {string} sheetName Naam van het tabblad.
   * @param {Object.<string, *>} rowObject Object met kolomnaam → waarde.
   * @returns {void}
   */
  function appendRowFromObject(sheetName, rowObject) {
    const sheet = getSheet(sheetName);
    const headers = getHeaders(sheet);
    const row = buildSheetRow_(headers, rowObject);

    sheet.appendRow(row);
  }

  /**
   * Werkt één cel bij op basis van rij nummer en kolomnaam.
   *
   * @param {number} rowNumber 1-based rij nummer.
   * @param {string} columnName Headernaam van de kolom.
   * @param {*} value Waarde die geschreven moet worden.
   * @param {string} sheetName Naam van het tabblad.
   * @returns {void}
   */
  function updateCell(rowNumber, columnName, value, sheetName) {
    const sheet = getSheet(sheetName);
    const columnMap = getColumnIndexMapCached(sheetName);
    const columnIndex = columnMap[columnName];

    if (!columnIndex) {
      throw new Error(`Kolom niet gevonden: ${columnName} in sheet ${sheetName}`);
    }

    sheet
      .getRange(rowNumber, columnIndex)
      .setValue(value);
  }

  /**
   * Bouwt een cache-key voor een sheet column map.
   *
   * @param {string} sheetName Naam van het tabblad.
   * @returns {string} Cache-key.
   */
  function buildColumnMapCacheKey_(sheetName) {
    return `column-map-${sheetName}`;
  }

  /**
   * Bouwt een rij-object op basis van headers en rijwaarden.
   *
   * @param {string[]} headers Headernamen.
   * @param {Array<*>} row Rijwaarden.
   * @param {number} rowNumber 1-based rij nummer.
   * @returns {Object} Rij-object.
   */
  function buildRowObject_(headers, row, rowNumber) {
    const obj = {
      rowNumber
    };

    headers.forEach((header, index) => {
      obj[header] = row[index];
    });

    return obj;
  }

  /**
   * Bouwt een sheetrij-array op basis van headers en een object.
   *
   * @param {string[]} headers Headernamen.
   * @param {Object.<string, *>} rowObject Object met kolomnaam → waarde.
   * @returns {Array<*>} Rijwaarden in sheetvolgorde.
   */
  function buildSheetRow_(headers, rowObject) {
    return headers.map(header => {
      return Object.prototype.hasOwnProperty.call(rowObject, header)
        ? rowObject[header]
        : '';
    });
  }

  return {
    getSheet,
    getHeaders,
    getColumnIndexMap,
    getColumnIndexMapCached,
    clearColumnIndexMapCache,
    getRowsAsObjects,
    getRowAsObject,
    appendRowFromObject,
    updateCell
  };
})();