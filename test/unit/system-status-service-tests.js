/** Controleert statusrijen en opmaak via de publieke update-interface. */
function assertSystemStatusUpdate_(counts) {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const handlers = [TRIGGER_HANDLERS.autoSync, TRIGGER_HANDLERS.flightMailImport,
    TRIGGER_HANDLERS.hotelMailImport, TRIGGER_HANDLERS.notificationWorker, TRIGGER_HANDLERS.systemStatus, TRIGGER_HANDLERS.gigOptionExpiry];
  const names = ['Automatic Calendar Sync', 'Flight Mail Import', 'Hotel Mail Import',
    'Notification Worker', 'System Status Refresh', 'Gig Option Expiry'];
  unit.triggers = ['unrelatedHandler'];
  counts.forEach((count, index) => {
    for (let i = 0; i < count; i++) unit.triggers.push(handlers[index]);
  });
  const before = Date.now();
  systemStatusService.update();
  const after = Date.now();
  assertEquals(CONFIG.systemStatus.sheetName, unit.all('lookup')[0][0]);
  assertEquals(1, unit.all('clear').length);
  assertTrue(unit.calls.findIndex(call => call.name === 'clear') < unit.calls.findIndex(call => call.name === 'values'));
  const writes = unit.all('values');
  assertEquals(2, writes.length);
  assertEquals('[1,1,1,6]', JSON.stringify(writes[0][0]));
  assertEquals(JSON.stringify([['Component', 'Handler Function', 'Status', 'Trigger Count', 'Last Checked At', 'Recommendation']]), JSON.stringify(writes[0][1]));
  assertEquals('[2,1,6,6]', JSON.stringify(writes[1][0]));
  const rows = writes[1][1];
  assertEquals(6, rows.length);
  const backgrounds = unit.all('background');
  assertEquals(6, backgrounds.length);
  rows.forEach((row, index) => {
    const count = counts[index];
    const status = count === 0 ? 'MISSING' : count === 1 ? 'OK' : 'TOO_MANY';
    assertEquals(names[index], row[0]);
    assertEquals(handlers[index], row[1]);
    assertEquals(status, row[2]);
    assertEquals(count, row[3]);
    assertTrue(row[4] instanceof Date);
    assertTrue(row[4].getTime() >= before && row[4].getTime() <= after);
    assertEquals(rows[0][4].getTime(), row[4].getTime());
    assertEquals(count === 0 ? 'Install trigger(s)' : count === 1 ? '-' : 'Remove extra triggers and re-install', row[5]);
    assertEquals(JSON.stringify([index + 2, 3]), JSON.stringify(backgrounds[index][0]));
    assertEquals(status === 'OK' ? CONFIG.systemStatus.colors.statusOk : CONFIG.systemStatus.colors.statusError, backgrounds[index][1]);
  });
  assertEquals(1, unit.all('tab').length);
  assertEquals(counts.every(count => count === 1) ? CONFIG.systemStatus.colors.tabOk : CONFIG.systemStatus.colors.tabError, unit.all('tab')[0][0]);
}

/** Bestaand tabblad en uitsluitend correcte triggers. */
function testSystemStatusAllOk() {
  assertSystemStatusUpdate_([1, 1, 1, 1, 1, 1]);
  assertEquals(0, unit.all('insert').length);
}

/** Ontbrekende triggers en aanmaken van het statustabblad. */
function testSystemStatusMissingCreatesSheet() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.sheetExists = false;
  assertSystemStatusUpdate_([0, 0, 0, 0, 0, 0]);
  assertEquals(1, unit.all('insert').length);
  assertEquals(CONFIG.systemStatus.sheetName, unit.all('insert')[0][0]);
}

/** Gemengde statussen tellen triggers per handler en maken de tab rood. */
function testSystemStatusMixedTriggers() {
  assertSystemStatusUpdate_([2, 0, 1, 3, 1, 0]);
}
