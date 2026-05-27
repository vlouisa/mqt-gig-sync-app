/**
 * Service voor het bijwerken van de system-status sheet.
 */
const systemStatusService = (() => {
  const MODULE_NAME = 'system-status-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Werkt de volledige system-status sheet bij.
   *
   * @returns {void}
   */
  function update() {
    const log = getLog_();
    const layout = CONFIG.systemStatus.layout;

    const sheet = getOrCreateSheet_();
    const rows = buildRows_();
    const columnCount = rows[0].length;
    const dataRowCount = rows.length - 1;

    sheet.clearContents();

    sheet
      .getRange(layout.headerRow, layout.firstColumn, 1, columnCount)
      .setValues([rows[0]]);

    if (dataRowCount > 0) {
      sheet
        .getRange(layout.firstDataRow, layout.firstColumn, dataRowCount, columnCount)
        .setValues(rows.slice(1));
    }

    applyStatusFormatting_(sheet, rows);

    log.info(
      'system-status-updated',
      'System-status sheet bijgewerkt.',
      `Rows: ${dataRowCount}`
    );
  }

  /**
   * Bouwt alle rijen voor de system-status sheet.
   *
   * @returns {Array<Array<string|number|Date>>} Header- en datarijen.
   */
  function buildRows_() {
    const columns = CONFIG.systemStatus.columns;
    const checkedAt = new Date();

    const rows = [[
      columns.component,
      columns.handlerFunction,
      columns.status,
      columns.triggerCount,
      columns.lastCheckedAt,
      columns.recommendation
    ]];

    getTriggerComponents_().forEach(component => {
      const triggerCount = countTriggersForHandler_(component.handlerFunction);
      const status = resolveStatus_(triggerCount, component.expectedTriggerCount);
      const recommendation = resolveRecommendation_(status);

      rows.push([
        component.name,
        component.handlerFunction,
        status,
        triggerCount,
        checkedAt,
        recommendation
      ]);
    });

    return rows;
  }

  /**
   * Geeft de trigger-componenten terug die bewaakt moeten worden.
   *
   * @returns {Array<{name: string, handlerFunction: string, expectedTriggerCount: number}>} Componentdefinities.
   */
  function getTriggerComponents_() {
    return [
      {
        name: 'Automatic Calendar Sync',
        handlerFunction: TRIGGER_HANDLERS.autoSync,
        expectedTriggerCount: 1
      },
      {
        name: 'Flight Mail Import',
        handlerFunction: TRIGGER_HANDLERS.flightMailImport,
        expectedTriggerCount: 2
      },
      {
        name: 'Hotel Mail Import',
        handlerFunction: TRIGGER_HANDLERS.hotelMailImport,
        expectedTriggerCount: 2
      },
      {
        name: 'Notification Worker',
        handlerFunction: TRIGGER_HANDLERS.notificationWorker,
        expectedTriggerCount: 1
      },
      {
        name: 'System Status Refresh',
        handlerFunction: TRIGGER_HANDLERS.systemStatus,
        expectedTriggerCount: 1
      }
    ];
  }

  /**
   * Telt hoeveel installable triggers bestaan voor een handlerfunctie.
   *
   * @param {string} handlerFunction Naam van de Apps Script handlerfunctie.
   * @returns {number} Aantal gevonden triggers.
   */
  function countTriggersForHandler_(handlerFunction) {
    return ScriptApp.getProjectTriggers()
      .filter(trigger => trigger.getHandlerFunction() === handlerFunction)
      .length;
  }

  /**
   * Bepaalt de status op basis van het actuele en verwachte aantal triggers.
   *
   * @param {number} triggerCount Aantal gevonden triggers.
   * @param {number} expectedTriggerCount Verwacht aantal triggers.
   * @returns {string} Statuswaarde.
   */
  function resolveStatus_(triggerCount, expectedTriggerCount) {
    if (triggerCount === expectedTriggerCount) return 'OK';
    if (triggerCount === 0) return 'MISSING';
    if (triggerCount < expectedTriggerCount) return 'INCOMPLETE';
    return 'TOO_MANY';
  }

  /**
   * Geeft een aanbeveling op basis van de triggerstatus.
   *
   * @param {string} status Triggerstatus.
   * @returns {string} Aanbevolen actie.
   */
  function resolveRecommendation_(status) {
    if (status === 'OK') return '-';
    if (status === 'MISSING') return 'Install trigger(s)';
    if (status === 'INCOMPLETE') return 'Install missing trigger(s)';
    if (status === 'TOO_MANY') return 'Remove extra triggers and re-install';
    return 'Check manually';
  }

  /**
   * Haalt de system-status sheet op of maakt deze aan.
   *
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} De system-status sheet.
   */
  function getOrCreateSheet_() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = CONFIG.systemStatus.sheetName;

    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }

    return sheet;
  }

  /**
   * Past statuskleuren toe op de statuskolom en zet de tabkleur.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet De system-status sheet.
   * @param {Array<Array<string|number|Date>>} rows Header- en datarijen.
   * @returns {void}
   */
  function applyStatusFormatting_(sheet, rows) {
    const layout = CONFIG.systemStatus.layout;
    const colors = CONFIG.systemStatus.colors;
    const columns = CONFIG.systemStatus.columns;
    const statusColumnIndex = rows[0].indexOf(columns.status) + 1;
    const dataRowCount = rows.length - 1;

    if (dataRowCount === 0) {
      sheet.setTabColor(colors.tabOk);
      return;
    }

    const statuses = rows
      .slice(1)
      .map(row => row[statusColumnIndex - 1]);

    const allOk = statuses.every(status => status === 'OK');

    statuses.forEach((status, index) => {
      sheet
        .getRange(layout.firstDataRow + index, statusColumnIndex)
        .setBackground(status === 'OK' ? colors.statusOk : colors.statusError);
    });

    sheet.setTabColor(allOk ? colors.tabOk : colors.tabError);
  }

  return {
    update
  };
})();