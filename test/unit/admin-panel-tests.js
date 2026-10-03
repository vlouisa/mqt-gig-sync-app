function requireAdminPanelUnit_() {
  if (typeof unit === 'undefined' || !unit.actions) throw new Error('Alleen via de lokale unit-runner uitvoeren.');
}

function testAdminPanelAuthorization() {
  requireAdminPanelUnit_();
  unit.activeEmail = 'other@example.invalid';
  [[showAdminPanel, 'Beheerpaneel openen'], [showAdminHelp, 'Beheerpaneel openen'],
    [getAdminPanelSnapshot, 'Beheeroverzicht bekijken'], [getAdminPanelSelection, 'Publicatie bekijken'],
    [() => runAdminPanelAction('calendar'), 'Beheeractie uitvoeren'],
    [() => manageAdminPanelTrigger('calendar', 'install'), 'Automatisering beheren'],
    [() => runAdminPanelPublication('skip', {}), 'Websitepublicatie verwerken']]
    .forEach(([call, action]) => assertThrows(call, `Alleen ${CONFIG.adminEmail} mag '${action}'.`));
  assertEquals(0, unit.actions.length);
  assertEquals(0, unit.triggers.length);
  assertFalse(Boolean(unit.sidebar));
}

function testAdminPanelOpenAndHelp() {
  requireAdminPanelUnit_();
  showAdminPanel();
  assertEquals('overview', unit.template.section);
  showAdminHelp();
  assertEquals('help', unit.template.section);
  assertEquals(0, Object.keys(unit.sheets).length);
}

function testAdminPanelReadOnlyOverview() {
  requireAdminPanelUnit_();
  const c = CONFIG.entities.gig.columns;
  const sheet = unit.makeSheet(CONFIG.entities.gig.sheetName, [
    [c.lastError, c.syncStatus, c.title], ['Probleem', 'ERROR', 'Test'], ['', 'NEEDS_SYNC', 'Wacht'],
    ['', 'DELETE_REQUESTED', 'Verwijderen'], ['', 'SYNCED', 'Gereed'], ['', 'DRAFT', 'Concept']
  ]);
  const before = JSON.stringify(sheet.values);
  unit.triggers = [TRIGGER_HANDLERS.autoSync, TRIGGER_HANDLERS.autoSync, 'unrelated'].map(name => ({ getHandlerFunction: () => name }));
  const result = getAdminPanelSnapshot();
  const gig = result.sources.find(source => source.id === 'gig');
  assertEquals(2, gig.waiting);
  assertEquals(1, gig.errorCount);
  assertEquals(2, gig.errors[0].row);
  assertTrue(gig.errors[0].url.endsWith('&range=A2'));
  assertEquals(2, result.triggers.find(trigger => trigger.id === 'calendar').count);
  assertEquals(4, result.sources.filter(source => source.issue).length);
  assertEquals(before, JSON.stringify(sheet.values));
  assertEquals(1, Object.keys(unit.sheets).length);
  assertEquals('{}', JSON.stringify(unit.cache));
  assertEquals(0, unit.actions.length);
  assertEquals(0, unit.flushes);
  assertEquals(JSON.stringify(result), JSON.stringify(JSON.parse(JSON.stringify(result))));
}

function testAdminPanelInvalidHeadersAndErrorLimit() {
  requireAdminPanelUnit_();
  unit.makeSheet('flight-input', [['SyncStatus', 'SyncStatus', 'LastError']]);
  unit.makeSheet('gig-input', [['SyncStatus', 'LastError'], ...Array.from({ length: 12 }, () => ['ERROR', '<script>'])]);
  const result = getAdminPanelSnapshot();
  assertTrue(Boolean(result.sources.find(source => source.id === 'flight').issue));
  const gig = result.sources.find(source => source.id === 'gig');
  assertEquals(12, gig.errorCount);
  assertEquals(10, gig.errors.length);
}

function testAdminPanelDispatchAndLockOutcomes() {
  requireAdminPanelUnit_();
  assertThrows(() => runAdminPanelAction('constructor'), 'Onbekende beheeractie.');
  runAdminPanelAction('flights');
  assertEquals('flight-import', unit.actions[0]);
  unit.acquired = false;
  assertEquals('warning', runAdminPanelAction('calendar').tone);
  assertEquals('warning', runAdminPanelAction('notifications').tone);
  assertThrows(() => manageAdminPanelTrigger('calendar', 'install'), 'Een andere verwerking is actief. Probeer later opnieuw.');
  assertThrows(() => runAdminPanelAction('archive'), 'Een andere verwerking is actief. Probeer later opnieuw.');
  assertEquals(1, unit.actions.length);
  assertThrows(() => manageAdminPanelTrigger('calendar', 'constructor'), 'Onbekende triggeractie.');
}

function testAdminPanelTriggerReplacement() {
  requireAdminPanelUnit_();
  ['calendar', 'flights', 'hotels', 'website', 'notifications', 'worker', 'status'].forEach(id => {
    unit.triggers = [{ getHandlerFunction: () => 'unrelated' }];
    manageAdminPanelTrigger(id, 'install');
    const previous = unit.triggers[1];
    assertEquals(2, unit.triggers.length);
    unit.failTrigger = true;
    assertThrows(() => manageAdminPanelTrigger(id, 'install'), 'trigger create failed');
    assertTrue(unit.triggers.includes(previous));
    unit.failTrigger = false;
    manageAdminPanelTrigger(id, 'install');
    assertEquals(2, unit.triggers.length);
    assertFalse(unit.triggers.includes(previous));
    manageAdminPanelTrigger(id, 'remove');
    assertEquals(1, unit.triggers.length);
    assertEquals('unrelated', unit.triggers[0].getHandlerFunction());
  });
}

function testAdminPanelInvalidIntervalPreservesTriggers() {
  requireAdminPanelUnit_();
  [[CONFIG.autoSync, 'calendar'], [CONFIG.entities.flight.mailImport.autoSync, 'flights'],
    [CONFIG.entities.hotel.mailImport.autoSync, 'hotels']].forEach(([config, id]) => {
    manageAdminPanelTrigger(id, 'install');
    const before = [...unit.triggers];
    config.everyMinutes = 2;
    assertThrows(() => manageAdminPanelTrigger(id, 'install'), 'Ongeldige auto-sync periode. Gebruik 1, 5, 10, 15 of 30 minuten.');
    assertEquals(before.length, unit.triggers.length);
    before.forEach(trigger => assertTrue(unit.triggers.includes(trigger)));
  });
}

function panelPublicationFixture_() {
  requireAdminPanelUnit_();
  const c = CONFIG.websitePublications.columns;
  const headers = Object.values(c);
  const values = id => headers.map(header => ({ [c.gigId]: id, [c.title]: 'Optreden ' + id, [c.status]: 'READY' })[header] || '');
  const sheet = unit.makeSheet(CONFIG.websitePublications.sheetName, [headers, values('first'), values('second')]);
  unit.select(sheet.name, 2);
  return sheet;
}

function testAdminPanelPublicationIdentity() {
  const sheet = panelPublicationFixture_();
  const selected = getAdminPanelSelection();
  assertEquals(0, sheet.protections.length);
  assertEquals('{}', JSON.stringify(unit.cache));
  unit.select(sheet.name, 3);
  const result = runAdminPanelPublication('skip', selected);
  assertEquals('success', result.tone);
  const status = Object.keys(CONFIG.websitePublications.columns).indexOf('status');
  assertEquals('SKIPPED', sheet.values[1][status]);
  assertEquals('READY', sheet.values[2][status]);
  assertEquals(0, unit.alerts.length);
  assertThrows(() => runAdminPanelPublication('skip', selected), 'De publicatie is gewijzigd. Laad de selectie opnieuw en controleer de gegevens.');
}

function testAdminPanelPublicationChangedAndDuplicate() {
  const sheet = panelPublicationFixture_();
  const selected = getAdminPanelSelection();
  const title = Object.keys(CONFIG.websitePublications.columns).indexOf('title');
  sheet.values[1][title] = 'Gewijzigd';
  assertThrows(() => runAdminPanelPublication('create', selected), 'De publicatie is gewijzigd. Laad de selectie opnieuw en controleer de gegevens.');
  assertEquals(0, unit.requests.length);
  const id = Object.keys(CONFIG.websitePublications.columns).indexOf('gigId');
  sheet.values[2][id] = 'first';
  assertThrows(getAdminPanelSelection, 'Gig ID ontbreekt of komt meerdere keren voor.');
  assertThrows(() => runAdminPanelPublication('skip', selected), 'Gig ID ontbreekt of komt meerdere keren voor in website-publications.');
}

function testAdminPanelDraftResult() {
  requireAdminPanelUnit_();
  const { c, sheet } = websiteReady_();
  const expected = getAdminPanelSelection();
  // De huidige selectie mag een ander blad zijn; de geladen identiteit is leidend.
  unit.select(sheet.name, 2);
  const result = runAdminPanelPublication('create', expected);
  assertEquals('success', result.tone);
  assertEquals(1, unit.requests.length);
  assertEquals('DRAFT_CREATED', websitePublicationSheetService.getByGigId(expected.gigId)[c.status]);
  assertEquals(0, unit.alerts.length);
}

function testAdminPanelDraftErrorResult() {
  requireAdminPanelUnit_();
  websiteReady_();
  const expected = getAdminPanelSelection();
  unit.networkError = true;
  const result = runAdminPanelPublication('create', expected);
  assertEquals('error', result.tone);
  assertFalse(result.message.includes(unit.properties.WORDPRESS_APPLICATION_PASSWORD));
  assertEquals(1, unit.requests.length);
  assertThrows(() => runAdminPanelPublication('create', expected), 'De publicatie is gewijzigd. Laad de selectie opnieuw en controleer de gegevens.');
  assertEquals(1, unit.requests.length);
}
