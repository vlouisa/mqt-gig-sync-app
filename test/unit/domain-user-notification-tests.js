/** User-ID- en gig-notificatietests met lokale mocks. */

/** Payload en fingerprint worden correct aan Notify doorgegeven, na initialisatie. */
function testGigNotificationPayload() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  gigNotificationService.publishGigPublished(unit.record);
  assertEquals(1, unit.count('initNotifications'));
  assertEquals('initNotifications', unit.calls[0].name);
  const [event, payload] = unit.last('notify');
  assertEquals('GIG_PUBLISHED', event);
  assertEquals('G-1', payload.sourceId);
  assertEquals('fingerprint-1', payload.notificationFingerprint);
  assertEquals('Show', payload.title);
  assertEquals(unit.record.Date, payload.date);
  assertEquals('23:00', payload.start);
  assertEquals('01:00', payload.end);
  assertEquals('Venue', payload.location);
  assertEquals('Engineer', payload.soundEngineer);
  assertEquals('Details', payload.description);
  assertEquals(JSON.stringify(['CONFIRMED', 'Show', unit.record.Date, '23:00', '01:00', 'Venue', 'Engineer', 'Details']),
    JSON.stringify(unit.last('fingerprint')[0]));
}

/** User-edits negeren ontbrekende events, andere tabbladen en de header. */
function testUserEditIgnored() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  assertEquals(false, userOnEditService.handle(null));
  assertEquals(false, userOnEditService.handle({}));
  assertEquals(false, userOnEditService.handle({ range: { getSheet: () => ({ getName: () => 'other' }) } }));
  assertEquals(true, userOnEditService.handle({ range: { getRow: () => 1, getSheet: () => ({ getName: () => 'user-input' }) } }));
}

/** Naam of email is voldoende voor een ID; lege rijen en bestaande IDs blijven intact. */
function testUserEditAssignsId() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  for (const values of [['Name', '', ''], ['', 'test@example.invalid', ''], ['', '', ''], ['Name', '', 'USER-existing']]) {
    let writes = 0;
    const expected = values[2] || ((values[0] || values[1]) ? 'USER-unit-uuid' : '');
    const shouldWrite = !values[2] && Boolean(values[0] || values[1]);
    const sheet = { getName: () => 'user-input', getRange(row, column) {
      assertEquals(2, row);
      return { getValue: () => values[column - 1], setValue(value) { values[column - 1] = value; writes++; } };
    } };
    assertEquals(true, userOnEditService.handle({ range: { getRow: () => 2, getSheet: () => sheet } }));
    assertEquals(expected, values[2]);
    assertEquals(shouldWrite ? 1 : 0, writes);
  }
}
