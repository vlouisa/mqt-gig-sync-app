/** Volledig gigbericht met stringdatum en getrimde tijdstrings. */
function testNotificationMessageGig() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const result = notificationMessageFactory.create(NOTIFICATION_EVENTS.gigPublished, {
    title: 'Show', date: '2026-09-24', start: ' 20:30:00 ', end: '23:00:00',
    location: 'Venue', soundEngineer: 'Engineer', description: 'Details'
  });
  assertEquals('GIG_PUBLISHED', NOTIFICATION_EVENTS.gigPublished);
  assertEquals('Gig gepubliceerd', result.title);
  assertEquals('Gig gepubliceerd naar MQT agenda.\n\nTitel: Show\nDatum: 24-09-2026\nTijd: 20:30 - 23:00\nLocatie: Venue\nGeluid: Engineer\n\nDetails', result.message);
  assertEquals(1, unit.formats.length);
  assertEquals(new Date('2026-09-24').getTime(), unit.formats[0].date.getTime());
  assertEquals('Europe/Brussels', unit.formats[0].zone);
  assertEquals('dd-MM-yyyy', unit.formats[0].pattern);
}

/** Date-waarden worden met de scripttijdzone aan Utilities doorgegeven. */
function testNotificationMessageDates() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const date = new Date('2026-09-24T18:30:00Z');
  const result = notificationMessageFactory.create(NOTIFICATION_EVENTS.gigPublished, { date, start: date, end: date });
  assertTrue(result.message.includes('Tijd: 20:30 - 20:30'));
  assertEquals(3, unit.formats.length);
  unit.formats.forEach((call, index) => {
    assertEquals(date, call.date);
    assertEquals('Europe/Brussels', call.zone);
    assertEquals(index === 0 ? 'dd-MM-yyyy' : 'HH:mm', call.pattern);
  });
}

/** Lege payloadvelden gebruiken placeholders zonder datumformattering. */
function testNotificationMessageGigFallbacks() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const result = notificationMessageFactory.create(NOTIFICATION_EVENTS.gigPublished, {});
  assertEquals('Gig gepubliceerd naar MQT agenda.\n\nTitel: -\nDatum: -\nTijd: - - -\nLocatie: -\nGeluid: -', result.message);
  assertEquals(0, unit.formats.length);
}

/** Alle foutcodes leveren hun eigen titel en dezelfde payloadvelden/fallbacks. */
function testNotificationMessageSyncFailures() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const cases = [
    [NOTIFICATION_EVENTS.gigSyncFailed, 'GIG_SYNC_FAILED', 'Gig sync mislukt'],
    [NOTIFICATION_EVENTS.flightSyncFailed, 'FLIGHT_SYNC_FAILED', 'Flight sync mislukt'],
    [NOTIFICATION_EVENTS.hotelSyncFailed, 'HOTEL_SYNC_FAILED', 'Hotel sync mislukt']
  ];
  cases.forEach(([event, code, title]) => {
    assertEquals(code, event);
    const result = notificationMessageFactory.create(event, {
      date: '24-09-2026 20:30', entity: 'Entity', rowNumber: 7, recordTitle: 'Record', errorMessage: 'Failure'
    });
    assertEquals(title, result.title);
    assertEquals('Synchronisatie naar Calendar is mislukt.\n\nDatum: 24-09-2026 20:30\nEntity: Entity\nRow: 7\nId: Record\n\nFout: Failure', result.message);
    const empty = notificationMessageFactory.create(event, {});
    assertEquals(title, empty.title);
    assertEquals('Synchronisatie naar Calendar is mislukt.\n\nDatum: -\nEntity: -\nRow: -\nId: -\n\nFout: -', empty.message);
  });
  assertEquals(0, unit.formats.length);
}

/** Onbekende eventcodes falen expliciet. */
function testNotificationMessageUnknownEvent() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  assertThrows(() => notificationMessageFactory.create('UNKNOWN', {}), 'Geen notificatietemplate gevonden voor event: UNKNOWN');
}
