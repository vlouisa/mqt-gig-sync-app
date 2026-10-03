/** Hergebruik de lokale websitefixture; voeg alleen paneel- en triggermocks toe. */
module.exports = require('./website-publication-test-support.cjs') + `
  unit.actions = [];
  const originalMakeSheet = unit.makeSheet;
  unit.makeSheet = (name, values) => {
    const sheet = originalMakeSheet(name, values);
    sheet.getSheetId = () => Object.keys(unit.sheets).indexOf(name) + 1;
    return sheet;
  };
  const originalSpreadsheet = SpreadsheetApp.getActiveSpreadsheet;
  SpreadsheetApp.getActiveSpreadsheet = () => ({ ...originalSpreadsheet(), getUrl: () => 'https://docs.google.com/spreadsheets/d/test/edit' });
  HtmlService = { createTemplateFromFile: name => ({ evaluate() {
    unit.template = { name, section: this.initialSection };
    return { setTitle: title => ({ title }) };
  } }) };
  SpreadsheetApp.getUi = () => ({ showSidebar: html => { unit.sidebar = html; } });
  Utilities.DigestAlgorithm = { SHA_256: 'SHA_256' };
  Utilities.Charset = { UTF_8: 'UTF_8' };
  // Testdouble controleert inhoudsverschillen, niet het Google-hashalgoritme.
  Utilities.computeDigest = (algorithm, text) => Array.from(text).map(character => character.charCodeAt(0));
  const originalTrigger = ScriptApp.newTrigger;
  ScriptApp.newTrigger = name => {
    const builder = originalTrigger(name);
    builder.everyMinutes = n => { unit.interval = n; return builder; };
    return builder;
  };
  function action(name) { unit.actions.push(name); }
  const gigSyncService = { sync: () => action('gig') };
  const flightSyncService = { sync: () => action('flight') };
  const hotelSyncService = { sync: () => action('hotel') };
  const blockedDateSyncService = { sync: () => action('blocked') };
  const flightMailImportService = { scanAndImport: () => action('flight-import') };
  const hotelMailImportService = { scanAndImport: () => action('hotel-import') };
  const scheduledNotificationService = { check: () => action('notification-check') };
  const sheetProtectionService = { protectTechnicalColumns: () => action('protection') };
  const auditMaintenanceService = { archive: () => { action('archive'); return 'Archief gecontroleerd.'; } };
  function initNotifications() { action('init-notify'); }
  const Notify = { notificationWorker: { process: () => action('notify-worker') } };
`;
