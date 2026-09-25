/** Niet-adminaccounts bouwen geen spreadsheetmenu. */
function testCommonMenuNonAdmin() {
  requireCommonUnit_();
  ['user@example.invalid', '', 'ADMIN@example.invalid'].forEach(email => {
    unit.activeEmail = email;
    onOpen();
  });
  assertEquals(0, unit.calls.length);
}

/** Het adminmenu bevat alle bestaande stringgebaseerde entrypoints. */
function testCommonMenuAdmin() {
  requireCommonUnit_();
  onOpen();
  assertCommonData_([['MQT Gig Sync']], unit.all('addToUi'));
  assertCommonData_(['MQT Gig Sync', 'Import', 'Triggers', 'Notificaties', 'Systeem'], unit.all('menu').map(args => args[0]));
  assertCommonData_(['Import', 'Triggers', 'Notificaties', 'Systeem'], unit.all('submenu').map(args => args[1]));
  assertCommonData_([
    'syncEventsToCalendar', 'scanFlightEmailsAndImport', 'scanHotelEmailsAndImport',
    'installAutoSyncTrigger', 'removeAutoSyncTriggers',
    'installFlightMailImportTrigger', 'removeFlightMailImportTriggers',
    'installHotelMailImportTrigger', 'removeHotelMailImportTriggers',
    'installNotificationWorkerTrigger', 'removeNotificationWorkerTriggers',
    'installSystemStatusTrigger', 'removeSystemStatusTriggers',
    'processEventQueueNotifications', 'protectTechnicalColumns', 'refreshSystemStatus'
  ], unit.all('item').map(args => args[2]));
  assertEquals(1, unit.all('info').length);
}

/** Iedere geconfigureerde technische kolom wordt over alle rijen beschermd. */
function testCommonProtectionAllEntities() {
  requireCommonUnit_();
  const expected = [];
  unit.columnMap = {};
  Object.values(CONFIG.entities).forEach(config => {
    makeSheet(config.sheetName, [Object.values(config.columns)]);
    (config.technicalColumnKeys || []).forEach(key => {
      const column = config.columns[key];
      if (!unit.columnMap[column]) unit.columnMap[column] = Object.keys(unit.columnMap).length + 2;
      expected.push({ sheet: config.sheetName, column, index: unit.columnMap[column] });
    });
  });
  sheetProtectionService.protectTechnicalColumns();
  assertEquals(24, expected.length);
  assertCommonData_(expected.map(item => [item.sheet, 1, item.index, 100, 1]), unit.all('protect'));
  assertCommonData_(expected.map(item => [`Protected technical column: ${item.sheet}.${item.column}`]), unit.all('description'));
  assertCommonData_(expected.map(() => [false]), unit.all('warningOnly'));
  assertCommonData_(expected.map(() => [['old@example.invalid']]), unit.all('removeEditors'));
  assertCommonData_(expected.map(() => [CONFIG.adminEmail]), unit.all('addEditor'));
  assertFalse(unit.all('sheet').some(args => args[0] === CONFIG.entities.user.sheetName));
}

/** Alleen bestaande protections met dezelfde beschrijving worden vervangen. */
function testCommonProtectionReplacement() {
  requireCommonUnit_();
  CONFIG.entities = { test: { sheetName: 'input', columns: { id: 'ID' }, technicalColumnKeys: ['id', 'unknown'] },
    empty: { sheetName: 'unused', columns: {} } };
  makeSheet('input', [['Other', 'ID']]);
  unit.columnMap = { ID: 2 };
  unit.protections = [
    { getDescription: () => 'Protected technical column: input.ID', remove: () => unit.record('removeMatching') },
    { getDescription: () => 'Manual protection', remove: () => unit.record('removeOther') },
    { getDescription: () => 'Protected technical column: other.ID', remove: () => unit.record('removeOther') }
  ];
  sheetProtectionService.protectTechnicalColumns();
  assertEquals(1, unit.all('removeMatching').length);
  assertEquals(0, unit.all('removeOther').length);
  assertEquals(1, unit.all('protect').length);
  assertCommonData_([['input', 'RANGE']], unit.all('protections'));
  assertTrue(unit.calls.findIndex(call => call.name === 'removeMatching') < unit.calls.findIndex(call => call.name === 'protect'));
}

/** Een ontbrekende header faalt voordat een protection wordt verwijderd. */
function testCommonProtectionMissingColumn() {
  requireCommonUnit_();
  CONFIG.entities = { test: { sheetName: 'input', columns: { id: 'ID' }, technicalColumnKeys: ['id'] } };
  makeSheet('input', [['Other']]);
  unit.columnMap = {};
  assertThrows(() => sheetProtectionService.protectTechnicalColumns(), 'Kolom niet gevonden voor protection: ID in input');
  assertEquals(0, unit.all('protections').length);
  assertEquals(0, unit.all('protect').length);
  assertFalse(unit.all('info').some(args => args[1] === 'technical-columns-protected'));
}

/** Fouten bij aanmaken van protection worden niet als succes gerapporteerd. */
function testCommonProtectionFailure() {
  requireCommonUnit_();
  CONFIG.entities = { test: { sheetName: 'input', columns: { id: 'ID' }, technicalColumnKeys: ['id'] } };
  makeSheet('input', [['ID']]);
  unit.columnMap = { ID: 1 };
  unit.failAt = 'protect';
  assertThrows(() => sheetProtectionService.protectTechnicalColumns(), 'protect failed');
  assertEquals(0, unit.all('addEditor').length);
  assertFalse(unit.all('info').some(args => args[1] === 'technical-columns-protected'));
}
