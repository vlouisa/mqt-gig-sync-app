/** In-memory Google-mocks; uitsluitend voor de lokale unit-runner. */
module.exports = `
  const unit = {
    triggers: [], sheetExists: true, calls: [], formats: [],
    record(name, ...args) { this.calls.push({ name, args }); },
    all(name) { return this.calls.filter(call => call.name === name).map(call => call.args); }
  };
  const appPropertiesService = {
    getCalendarId: () => 'unit-calendar',
    getAdminEmail: () => 'unit@example.invalid'
  };
  const logService = { forModule: () => ({ info: (...args) => unit.record('info', ...args) }) };
  const ScriptApp = { getProjectTriggers: () => unit.triggers.map(handler => ({ getHandlerFunction: () => handler })) };
  const sheet = {
    clearContents() { unit.record('clear'); },
    getRange(...range) {
      return {
        setValues(values) { unit.record('values', range, values); },
        setBackground(color) { unit.record('background', range, color); }
      };
    },
    setTabColor(color) { unit.record('tab', color); }
  };
  const SpreadsheetApp = { getActiveSpreadsheet: () => ({
    getSheetByName(name) { unit.record('lookup', name); return unit.sheetExists ? sheet : null; },
    insertSheet(name) { unit.record('insert', name); return sheet; }
  }) };
  const Session = { getScriptTimeZone: () => 'Europe/Brussels' };
  const Utilities = { formatDate(date, zone, pattern) {
    unit.formats.push({ date, zone, pattern });
    return pattern === 'dd-MM-yyyy' ? '24-09-2026' : '20:30';
  } };
`;
