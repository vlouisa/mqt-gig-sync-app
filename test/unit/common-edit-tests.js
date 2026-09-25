/** Ontbrekende events en onbekende tabbladen hebben geen editcontext. */
function testCommonContextIgnored() {
  requireCommonUnit_();
  assertEquals(null, onEditContextProvider.getContext());
  assertEquals(null, onEditContextProvider.getContext({}));
  assertEquals(null, onEditContextProvider.getContext({ range: { getSheet: () => ({ getName: () => 'unknown' }) } }));
  assertEquals(0, unit.calls.length);
}

/** Elke provider gebruikt de juiste headers, auditfactory en technische kolommen. */
function testCommonContextDomains() {
  requireCommonUnit_();
  [['gig', 'GIG', 'gigId'], ['flight', 'FLIGHT', 'flightId'], ['hotel', 'HOTEL', 'hotelId'], ['blockedDate', 'BLOCKED_DATE', 'blockId']].forEach(([domain, prefix, idKey]) => {
    const config = CONFIG.entities[domain];
    unit.headers = ['Other', config.columns.syncStatus];
    const sheet = { getName: () => config.sheetName };
    const event = { range: { getSheet: () => sheet, getRow: () => 7, getColumn: () => 2 } };
    const context = onEditContextProvider.getContext(event);
    assertEquals(event, context.event);
    assertEquals(sheet, context.sheet);
    assertEquals(config.sheetName, context.sheetName);
    assertEquals(7, context.rowNumber);
    assertEquals(2, context.columnNumber);
    assertEquals(config.columns.syncStatus, context.columnName);
    assertEquals(config.columns, context.provider.columns);
    assertEquals(config.columns.syncStatus, context.provider.syncStatusColumn);
    assertEquals(entry[domain], context.provider.auditEntryFactory);
    assertCommonData_({ created: `${prefix}_CREATED`, changedAfterPublication: `${prefix}_CHANGED_AFTER_PUBLICATION` }, context.provider.auditActions);
    assertCommonData_([idKey, 'syncStatus', 'calendarEventId', 'lastSyncedAt', 'lastError', 'createdAt', 'updatedAt'].map(key => config.columns[key]), context.provider.ignoredColumns);
  });
  assertEquals(4, unit.all('headers').length);
}

/** Ongeldige context en technische edits lezen geen record. */
function testCommonRecordIgnored() {
  requireCommonUnit_();
  onEditRecordService.handleRecordEdit(null);
  onEditRecordService.handleRecordEdit({});
  onEditRecordService.handleRecordEdit(makeContext('ID'));
  onEditRecordService.handleRecordEdit(makeContext('Status'));
  assertEquals(0, unit.calls.length);
}

/** Nieuwe records krijgen DRAFT en een audit met de daadwerkelijk uitgevoerde overgang. */
function testCommonRecordCreated() {
  requireCommonUnit_();
  const context = makeContext();
  delete context.provider.ignoredColumns;
  unit.row = { Title: 'Concert' };
  onEditRecordService.handleRecordEdit(context);
  assertCommonData_([[4, 'input']], unit.all('row'));
  assertCommonData_([[4, 'DRAFT', 'input', 'Status']], unit.all('transition'));
  assertCommonData_([[{ domain: 'gig', action: 'CREATED', record: unit.row, details: 'Column: Title', oldStatus: '', newStatus: 'DRAFT' }]], unit.all('audit'));
  assertCommonData_(['row', 'transition', 'audit'], unit.calls.map(call => call.name));
}

/** Gepubliceerde en gefaalde records krijgen NEEDS_SYNC met passende audit. */
function testCommonRecordChanged() {
  requireCommonUnit_();
  ['SYNCED', 'ERROR'].forEach(status => {
    unit.calls = [];
    unit.row = { Status: status, Title: 'Changed' };
    onEditRecordService.handleRecordEdit(makeContext());
    assertCommonData_([[4, 'NEEDS_SYNC', 'input', 'Status']], unit.all('transition'));
    assertCommonData_([[{ domain: 'gig', action: 'CHANGED', record: unit.row, details: 'Column: Title', oldStatus: status, newStatus: 'NEEDS_SYNC' }]], unit.all('audit'));
  });
}

/** Overige statussen veroorzaken geen nieuwe status of audit. */
function testCommonRecordUnchangedStatuses() {
  requireCommonUnit_();
  ['DRAFT', 'NEEDS_SYNC', 'DELETE_REQUESTED', 'DELETED', 'UNKNOWN'].forEach(status => {
    unit.row = { Status: status };
    onEditRecordService.handleRecordEdit(makeContext());
  });
  assertEquals(5, unit.all('row').length);
  assertEquals(0, unit.all('transition').length);
  assertEquals(0, unit.all('audit').length);
}

/** Een mislukte statuswijziging wordt niet als geslaagd geaudit. */
function testCommonRecordTransitionFailure() {
  requireCommonUnit_();
  unit.failAt = 'transition';
  assertThrows(() => onEditRecordService.handleRecordEdit(makeContext()), 'transition failed');
  assertEquals(0, unit.all('audit').length);
}

/** Alleen edits in de statuskolom worden door deze handler afgehandeld. */
function testCommonManualIgnored() {
  requireCommonUnit_();
  assertFalse(onEditSyncStatusService.handleSyncStatusEdit(null));
  assertFalse(onEditSyncStatusService.handleSyncStatusEdit({}));
  assertFalse(onEditSyncStatusService.handleSyncStatusEdit(makeContext()));
  assertEquals(0, unit.calls.length);
}

/** Geldige statusovergangen worden getrimd gevalideerd zonder herstel of audit. */
function testCommonManualAllowed() {
  requireCommonUnit_();
  const context = makeContext('Status');
  context.event.oldValue = ' DRAFT ';
  context.event.value = ' NEEDS_SYNC ';
  assertTrue(onEditSyncStatusService.handleSyncStatusEdit(context));
  assertCommonData_([['DRAFT', 'NEEDS_SYNC']], unit.all('canTransition'));
  assertEquals(0, unit.all('restore').length);
  assertEquals(0, unit.all('audit').length);
}

/** Wissen van een status wordt volgens het bestaande contract overgeslagen. */
function testCommonManualCleared() {
  requireCommonUnit_();
  [undefined, '', '   '].forEach(value => {
    const context = makeContext('Status');
    context.event.oldValue = 'SYNCED';
    context.event.value = value;
    assertTrue(onEditSyncStatusService.handleSyncStatusEdit(context));
  });
  assertEquals(0, unit.calls.length);
}

/** Een verboden edit wordt eerst hersteld, vervolgens geaudit en afgewezen. */
function testCommonManualRejected() {
  requireCommonUnit_();
  unit.allowed = false;
  [' DRAFT ', undefined].forEach(oldValue => {
    unit.calls = [];
    const context = makeContext('Status');
    context.event.oldValue = oldValue;
    context.event.value = ' SYNCED ';
    const oldStatus = oldValue ? 'DRAFT' : '';
    assertThrows(() => onEditSyncStatusService.handleSyncStatusEdit(context), `Ongeldige SyncStatus overgang: ${oldStatus || '(leeg)'} → SYNCED`);
    assertCommonData_([[oldStatus]], unit.all('restore'));
    assertCommonData_(['canTransition', 'restore', 'row', 'audit'], unit.calls.map(call => call.name));
    assertCommonData_([[{ domain: 'gig', action: 'INVALID_SYNC_STATUS_TRANSITION', record: unit.row,
      details: `Manual change rejected: ${oldStatus || '(leeg)'} → SYNCED`, oldStatus, newStatus: 'SYNCED' }]], unit.all('audit'));
  });
}

/** Een mislukte restore wordt niet als herstelde edit geaudit. */
function testCommonManualRestoreFailure() {
  requireCommonUnit_();
  unit.allowed = false;
  unit.failAt = 'restore';
  const context = makeContext('Status');
  context.event.value = 'SYNCED';
  assertThrows(() => onEditSyncStatusService.handleSyncStatusEdit(context), 'restore failed');
  assertEquals(0, unit.all('audit').length);
}

/** User-edits worden als eerste afgehandeld; overige handlers blijven ongebruikt. */
function testCommonDispatchUser() {
  requireCommonUnit_();
  unit.userHandled = true;
  const event = {};
  onEditService.handle(event);
  assertCommonData_([{ name: 'user', args: [event] }], unit.calls);
}

/** Zonder context stopt de dispatcher. */
function testCommonDispatchNoContext() {
  requireCommonUnit_();
  onEditService.handle({});
  assertCommonData_(['user', 'context'], unit.calls.map(call => call.name));
}

/** Status-edits worden niet nogmaals als record-edit verwerkt. */
function testCommonDispatchStatus() {
  requireCommonUnit_();
  unit.context = { sheetName: 'input' };
  unit.statusHandled = true;
  onEditService.handle({});
  assertCommonData_(['user', 'context', 'statusEdit'], unit.calls.map(call => call.name));
  assertEquals(unit.context, unit.all('statusEdit')[0][0]);
}

/** Reguliere edits krijgen context, statuscheck, recordafhandeling en succeslog. */
function testCommonDispatchRecord() {
  requireCommonUnit_();
  const event = {};
  unit.context = { sheetName: 'input', rowNumber: 4, columnName: 'Title' };
  onEditService.handle(event);
  assertCommonData_(['user', 'context', 'statusEdit', 'recordEdit', 'info'], unit.calls.map(call => call.name));
  assertEquals(event, unit.all('context')[0][0]);
  assertEquals(unit.context, unit.all('recordEdit')[0][0]);
  assertCommonData_([['on-edit-service', 'on-edit-processed', 'onEdit succesvol verwerkt.', 'Sheet: input, Row: 4, Column: Title']], unit.all('info'));
}

/** Fouten binnen de try worden gelogd met editlocatie, zonder succeslog. */
function testCommonDispatchErrors() {
  requireCommonUnit_();
  const event = { range: { getSheet: () => ({ getName: () => 'input' }), getRow: () => 4, getColumn: () => 2 } };
  unit.context = {};
  ['context', 'statusEdit', 'recordEdit'].forEach(stage => {
    unit.calls = [];
    unit.failAt = stage;
    onEditService.handle(event);
    assertCommonData_([['on-edit-service', 'on-edit-error', `${stage} failed`, 'Sheet: input, Row: 4, Column: 2']], unit.all('error'));
    assertEquals(0, unit.all('info').length);
  });
  unit.calls = [];
  unit.failAt = 'context';
  onEditService.handle(undefined);
  assertEquals('Sheet: -, Row: -, Column: -', unit.all('error')[0][3]);
}

/** De user-handler valt buiten de try; diens fouten worden doorgegeven. */
function testCommonDispatchUserError() {
  requireCommonUnit_();
  unit.failAt = 'user';
  assertThrows(() => onEditService.handle({}), 'user failed');
  assertEquals(0, unit.all('context').length);
  assertEquals(0, unit.all('error').length);
}
