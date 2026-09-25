/** In-memory afhankelijkheden voor audit-tests; geen echte Google-services. */
module.exports = `
  const unit = {
    activeEmail: 'active@example.invalid', effectiveEmail: 'effective@example.invalid',
    effectiveCalls: 0, rows: [], sheets: [], logs: [], appendError: null
  };
  const appPropertiesService = {
    getCalendarId: () => 'unit-calendar',
    getAdminEmail: () => 'admin@example.invalid'
  };
  const Session = {
    getActiveUser: () => ({ getEmail: () => unit.activeEmail }),
    getEffectiveUser() {
      unit.effectiveCalls++;
      return { getEmail: () => unit.effectiveEmail };
    }
  };
  const sheetService = { getSheet(name) {
    unit.sheets.push(name);
    return { appendRow(row) {
      if (unit.appendError) throw unit.appendError;
      unit.rows.push(row);
    } };
  } };
  const logService = { forModule: module => ({
    info: (...args) => unit.logs.push({ module, args })
  }) };
`;
