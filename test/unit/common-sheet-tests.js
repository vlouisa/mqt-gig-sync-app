/** Headergestuurde rijen houden datatypes, lege rijen en 1-based rijnummers vast. */
function testCommonSheetReadRows() {
  requireCommonUnit_();
  const date = new Date(2026, 8, 25);
  const sheet = makeSheet('input', [['Title', 'Count', 'Active', 'Date'], ['Concert', 0, false, date], ['', '', '', '']]);
  assertEquals(sheet, sheetService.getSheet('input'));
  assertCommonData_(['Title', 'Count', 'Active', 'Date'], sheetService.getHeaders(sheet));
  const rows = sheetService.getRowsAsObjects('input');
  assertEquals(2, rows.length);
  assertEquals(date, rows[0].Date);
  assertCommonData_({ rowNumber: 2, Title: 'Concert', Count: 0, Active: false, Date: date }, rows[0]);
  assertCommonData_({ rowNumber: 3, Title: '', Count: '', Active: '', Date: '' }, rows[1]);
  assertCommonData_(rows[0], sheetService.getRowAsObject(2, 'input'));
  assertTrue(unit.all('range').some(args => JSON.stringify(args) === JSON.stringify(['input', 2, 1, 1, 4])));
}

/** Een tabblad met alleen headers heeft geen datarijen. */
function testCommonSheetEmptyAndMissing() {
  requireCommonUnit_();
  makeSheet('empty', [['Title']]);
  assertCommonData_([], sheetService.getRowsAsObjects('empty'));
  assertThrows(() => sheetService.getSheet('missing'), 'Sheet niet gevonden: missing');
}

/** Append gebruikt headervolgorde, bewaart falsy waarden en negeert inherited keys. */
function testCommonSheetAppendMapping() {
  requireCommonUnit_();
  makeSheet('input', [['Count', 'Title', 'Active', 'Missing', 'Inherited', 'Null']]);
  const row = Object.assign(Object.create({ Inherited: 'ignored' }), { Title: 'Concert', Count: 0, Active: false, Null: null, Extra: 'ignored' });
  sheetService.appendRowFromObject('input', row);
  assertCommonData_([['input', [0, 'Concert', false, '', '', null]]], unit.all('append'));
  assertEquals('Concert', row.Title);
}

/** Kolommen zijn 1-based, ook wanneer de header-volgorde verandert. */
function testCommonSheetColumnMap() {
  requireCommonUnit_();
  assertCommonData_({ Status: 1, Title: 2 }, sheetService.getColumnIndexMap(['Status', 'Title']));
  assertCommonData_({}, sheetService.getColumnIndexMap([]));
}

/** Cache-miss leest headers; cache-hit leest geen tabblad; wissen vernieuwt de map. */
function testCommonSheetCacheLifecycle() {
  requireCommonUnit_();
  const values = [['Title', 'Status']];
  makeSheet('input', values);
  assertCommonData_({ Title: 1, Status: 2 }, sheetService.getColumnIndexMapCached('input'));
  assertCommonData_([['column-map-input', '{"Title":1,"Status":2}', 21600]], unit.all('cachePut'));
  values[0] = ['Status', 'Title'];
  unit.calls = [];
  assertCommonData_({ Title: 1, Status: 2 }, sheetService.getColumnIndexMapCached('input'));
  assertEquals(0, unit.all('sheet').length);
  sheetService.clearColumnIndexMapCache('input');
  assertCommonData_([['column-map-input']], unit.all('cacheRemove'));
  assertCommonData_({ Status: 1, Title: 2 }, sheetService.getColumnIndexMapCached('input'));
  makeSheet('other', [['Different']]);
  assertCommonData_({ Different: 1 }, sheetService.getColumnIndexMapCached('other'));
}

/** updateCell schrijft uitsluitend de op naam gevonden cel. */
function testCommonSheetUpdateCell() {
  requireCommonUnit_();
  makeSheet('input', [['Title', 'Status']]);
  sheetService.updateCell(7, 'Status', false, 'input');
  assertCommonData_([['input', 7, 2, false]], unit.all('set'));
  assertThrows(() => sheetService.updateCell(7, 'Missing', 'value', 'input'), 'Kolom niet gevonden: Missing in sheet input');
  assertEquals(1, unit.all('set').length);
}

/** Statusnormalisatie trimt, maar wijzigt geen hoofdletters. */
function testCommonStatusNormalization() {
  requireCommonUnit_();
  assertEquals('SYNCED', syncStatusService.normalizeStatus(' SYNCED '));
  assertEquals('synced', syncStatusService.normalizeStatus('synced'));
  [null, undefined, '', false, 0].forEach(value => assertEquals('', syncStatusService.normalizeStatus(value)));
  assertEquals('123', syncStatusService.normalizeStatus(123));
}

/** De volledige workflowmatrix wordt tegen expliciete toegestane overgangen getest. */
function testCommonStatusTransitions() {
  requireCommonUnit_();
  const allowed = {
    '': ['DRAFT'], DRAFT: ['NEEDS_SYNC', ''], NEEDS_SYNC: ['SYNCED', 'ERROR'],
    SYNCED: ['NEEDS_SYNC', 'DELETE_REQUESTED'], ERROR: ['NEEDS_SYNC', 'DELETE_REQUESTED'],
    DELETE_REQUESTED: ['DELETED', 'ERROR'], DELETED: [], UNKNOWN: []
  };
  Object.keys(allowed).forEach(from => Object.keys(allowed).forEach(to => {
    assertEquals(from === to || allowed[from].includes(to), syncStatusService.canTransition(from, to), `${from} -> ${to}`);
  }));
  assertTrue(syncStatusService.canTransition(' DRAFT ', ' NEEDS_SYNC '));
  syncStatusService.assertCanTransition('DRAFT', 'NEEDS_SYNC');
  assertThrows(() => syncStatusService.assertCanTransition('', 'SYNCED'), 'Ongeldige SyncStatus overgang: (leeg) → SYNCED');
}

/** setStatus leest en schrijft de ingestelde kolom en retourneert de overgang. */
function testCommonStatusWrite() {
  requireCommonUnit_();
  makeSheet('input', [['Title', 'Other', 'Status']]);
  unit.status = ' DRAFT ';
  assertCommonData_({ fromStatus: 'DRAFT', toStatus: 'NEEDS_SYNC', changed: true }, syncStatusService.setStatus(4, ' NEEDS_SYNC ', 'input', 'Status'));
  assertCommonData_([['input', 4, 3, 'NEEDS_SYNC']], unit.all('set'));
  assertCommonData_([['input']], unit.all('columnMap'));
}

/** Een identieke status veroorzaakt geen write. */
function testCommonStatusNoChange() {
  requireCommonUnit_();
  makeSheet('input', [['Status']]);
  unit.status = ' DRAFT ';
  assertCommonData_({ fromStatus: 'DRAFT', toStatus: 'DRAFT', changed: false }, syncStatusService.setStatus(4, 'DRAFT', 'input', 'Status'));
  assertEquals(0, unit.all('set').length);
}

/** Onvolledige aanroepen en verboden overgangen schrijven geen status. */
function testCommonStatusInvalid() {
  requireCommonUnit_();
  assertThrows(() => syncStatusService.setStatus(4, 'SYNCED', '', 'Status'), 'sheetName ontbreekt bij setStatus().');
  assertThrows(() => syncStatusService.setStatus(4, 'SYNCED', 'input', ''), 'syncStatusColumnName ontbreekt bij setStatus().');
  assertEquals(0, unit.calls.length);
  makeSheet('input', [['Status']]);
  assertThrows(() => syncStatusService.setStatus(4, 'SYNCED', 'input', 'Missing'), 'SyncStatus kolom niet gevonden: Missing in sheet input');
  assertThrows(() => syncStatusService.setStatus(4, 'SYNCED', 'input', 'Status'), 'Ongeldige SyncStatus overgang: DRAFT → SYNCED');
  assertEquals(0, unit.all('set').length);
}
