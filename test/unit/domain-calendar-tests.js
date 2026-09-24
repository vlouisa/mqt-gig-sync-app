/** Calendar-contracttests voor vier domeinen; vereisen de lokale unit-fixture. */

/** Aanmaken gebruikt de juiste kalender, inhoud en domeinspecifieke datumgrenzen. */
function testDomainCalendarCreate() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const row = unit.record;
  const before = row.Enddate.getTime();
  assertEquals('event-1', unit.getService().createOrUpdateEvent(row));
  assertEquals('unit-calendar', unit.last('calendar')[0]);
  const allDay = ['hotel', 'blockedDate'].includes(unit.domain);
  const args = unit.last(allDay ? 'createAllDayEvent' : 'createEvent');
  assertEquals(1, unit.count(allDay ? 'createAllDayEvent' : 'createEvent'));
  const titles = { gig: 'CONFIRMED - Show', hotel: 'HOTEL - Hotel', blockedDate: 'BLOCKED - Member' };
  if (titles[unit.domain]) assertEquals(titles[unit.domain], args[0]);
  else {
    assertTrue(args[0].includes('HV 123'));
    assertTrue(args[0].includes('BRU'));
    assertTrue(args[0].includes('FCO'));
  }
  assertEquals(2026, args[1].getFullYear());
  if (unit.domain === 'gig') {
    assertEquals(23, args[1].getHours());
    assertEquals(1, args[2].getHours());
    assertEquals(2027, args[2].getFullYear());
    assertTrue(args[3].description.includes('Showtime: 23:00 - 01:00'));
    assertEquals('Venue', args[3].location);
  } else if (unit.domain === 'flight') {
    assertEquals(10, args[1].getHours());
    assertEquals(12, args[2].getHours());
    assertEquals('41, 12', args[3].location);
    assertEquals('Details', args[3].description);
  } else {
    assertEquals(2027, args[2].getFullYear());
    assertEquals(unit.domain === 'hotel' ? 2 : 1, args[2].getDate());
    assertEquals(before, row.Enddate.getTime());
    if (unit.domain === 'hotel') {
      assertEquals('Street', args[3].location);
      assertTrue(args[3].description.includes('BOOK-1'));
    }
  }
}

/** Een bestaand event wordt bijgewerkt, zonder tweede event aan te maken. */
function testDomainCalendarUpdate() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.record.CalendarEventId = 'old-event';
  unit.existingEvent = unit.event;
  assertEquals('event-1', unit.getService().createOrUpdateEvent(unit.record));
  assertEquals('old-event', unit.last('getEvent')[0]);
  assertEquals(0, unit.count('createEvent') + unit.count('createAllDayEvent'));
  assertEquals(1, unit.count('setTitle'));
  assertEquals(1, unit.count('setDescription'));
  assertEquals(1, unit.count(['hotel', 'blockedDate'].includes(unit.domain) ? 'setAllDayDates' : 'setTime'));
}

/** Een stale event-ID resulteert in een nieuw event. */
function testDomainCalendarMissingEventRecreated() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.record.CalendarEventId = 'missing';
  unit.getService().createOrUpdateEvent(unit.record);
  assertEquals(1, unit.count('createEvent') + unit.count('createAllDayEvent'));
}

/** Verwijderen is een no-op zonder ID of event, en verwijdert een gevonden event eenmaal. */
function testDomainCalendarDelete() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.getService().deleteEvent(unit.record);
  assertEquals(0, unit.count('calendar'));
  unit.record.CalendarEventId = 'old-event';
  unit.getService().deleteEvent(unit.record);
  assertEquals(0, unit.count('deleteEvent'));
  unit.existingEvent = unit.event;
  unit.getService().deleteEvent(unit.record);
  assertEquals(1, unit.count('deleteEvent'));
}
