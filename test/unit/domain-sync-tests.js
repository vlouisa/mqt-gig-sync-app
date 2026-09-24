/** Sync-contracttests, met in-memory Sheets en nagebootste Calendar/audit/notificaties. */

/** Publicatie schrijft event-ID, status en audit, en wist een eerdere fout. */
function testDomainSyncPublish() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.rows.push(unit.record);
  unit.getService().sync();
  assertEquals('SYNCED', unit.record.SyncStatus);
  assertEquals('event-1', unit.record.CalendarEventId);
  assertEquals('', unit.record.LastError);
  assertTrue(unit.record.LastSyncedAt instanceof Date);
  assertEquals(1, unit.count('publish'));
  assertEquals(1, unit.count('audit'));
  assertEquals('NEEDS_SYNC', unit.last('audit')[0].oldStatus);
  assertEquals('SYNCED', unit.last('audit')[0].newStatus);
  assertEquals(unit.domain === 'gig' ? 1 : 0, unit.count('successNotification'));
}

/** Niet-verwerkbare statussen veroorzaken geen publicatie of terugschrijven. */
function testDomainSyncSkipsInactiveRows() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  for (const status of ['', 'DRAFT', 'SYNCED', 'DELETED', 'ERROR']) {
    unit.rows.push({ ...unit.record, SyncStatus: status });
  }
  unit.getService().sync();
  assertEquals(0, unit.count('publish') + unit.count('delete'));
  assertEquals(0, unit.count('updateCell') + unit.count('audit'));
}

/** Een verwijderverzoek leegt de eventkoppeling en wordt DELETED. */
function testDomainSyncDelete() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.record.SyncStatus = 'DELETE_REQUESTED';
  unit.record.CalendarEventId = 'old-event';
  unit.rows.push(unit.record);
  unit.getService().sync();
  assertEquals(1, unit.count('delete'));
  assertEquals(0, unit.count('publish'));
  assertEquals('DELETED', unit.record.SyncStatus);
  assertEquals('', unit.record.CalendarEventId);
  assertEquals('', unit.record.LastError);
  assertEquals('DELETED', unit.last('audit')[0].newStatus);
}

/** Eén Calendar-fout verhindert de volgende geldige rij niet. */
function testDomainSyncErrorIsolation() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  unit.record.fail = true;
  const next = { ...unit.record, rowNumber: 3, fail: false };
  unit.rows.push(unit.record, next);
  unit.getService().sync();
  assertEquals('ERROR', unit.record.SyncStatus);
  assertEquals('Calendar unavailable', unit.record.LastError);
  assertEquals('SYNCED', next.SyncStatus);
  assertEquals(2, unit.count('audit'));
  assertEquals(unit.domain === 'blockedDate' ? 0 : 1, unit.count('failureNotification'));
}

/** Een ontbrekend verplicht veld wordt afgewezen vóór Calendar-publicatie. */
function testDomainSyncRequiredField() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const field = { gig: 'Title', flight: 'Flight', hotel: 'Hotel', blockedDate: 'Name' }[unit.domain];
  delete unit.record[field];
  unit.rows.push(unit.record);
  unit.getService().sync();
  assertEquals('ERROR', unit.record.SyncStatus);
  assertEquals('Verplicht veld ontbreekt: ' + field, unit.record.LastError);
  assertEquals(0, unit.count('publish'));
}

/** Gelijke gig-tijden worden afgewezen; een blokkade mag niet achteruit lopen. */
function testDomainSyncInvalidDateRange() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  if (unit.domain === 'gig') unit.record.End = unit.record.Start;
  else unit.record.Enddate = new Date(2026, 11, 30);
  unit.rows.push(unit.record);
  unit.getService().sync();
  assertEquals('ERROR', unit.record.SyncStatus);
  assertEquals(0, unit.count('publish'));
  assertTrue(unit.record.LastError.includes(unit.domain === 'gig' ? 'End' : 'Einddatum'));
}

/** Handmatige records krijgen een ontbrekend ID en CreatedAt; bestaande waarden blijven intact. */
function testDomainSyncTechnicalFields() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const id = unit.domain === 'gig' ? 'Gig ID' : 'Block ID';
  delete unit.record[id];
  delete unit.record.CreatedAt;
  unit.rows.push(unit.record);
  unit.getService().sync();
  assertEquals('unit-uuid', unit.record[id]);
  assertTrue(unit.record.CreatedAt instanceof Date);
  assertTrue(unit.record.UpdatedAt instanceof Date);
}
