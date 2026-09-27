/** Lokale tests; niet rechtstreeks tegen Apps Script-services uitvoeren. */
function auditMaintenanceFixture_() {
  if (typeof unit === 'undefined') throw new Error('Alleen lokale unit-runner.');
  unit.add(new Date('2026-08-01T12:00:00Z'));
  unit.add(new Date('2026-09-27T12:00:00Z'));
  unit.add(new Date('2026-07-01T12:00:00Z'));
}

function testAuditArchiveConfiguration() {
  assertEquals(30, appPropertiesService.getAuditArchiveSettings().retentionDays);
  assertEquals(250, appPropertiesService.getAuditArchiveSettings().batchSize);
  assertEquals('1AQ9lp0c6wkIytIVaXDhhY-SpUlbouWfF', appPropertiesService.getAuditArchiveSettings().folderId);
  unit.props.AUDIT_ARCHIVE_BATCH_SIZE = '2';
  unit.props.AUDIT_RETENTION_DAYS = '60';
  unit.props.AUDIT_ARCHIVE_FOLDER_ID = 'another-folder';
  assertEquals(2, appPropertiesService.getAuditArchiveSettings().batchSize);
  assertEquals(60, appPropertiesService.getAuditArchiveSettings().retentionDays);
  for (const value of ['0', '-1', '', '1.5', 'bad']) {
    unit.props.AUDIT_ARCHIVE_BATCH_SIZE = value;
    assertThrows(() => appPropertiesService.getAuditArchiveSettings(), 'Ongeldige positieve gehele waarde voor AUDIT_ARCHIVE_BATCH_SIZE.');
  }
}

function testAuditArchiveSelectionAndJsonLines() {
  auditMaintenanceFixture_();
  unit.add(new Date(unit.now.getTime() - 30 * 86400000)); // Exacte grens behouden.
  unit.add('not a date');
  unit.props.AUDIT_ARCHIVE_BATCH_SIZE = '1';
  const result = auditMaintenanceService.archive(unit.now);
  assertTrue(result.includes('1 oude regels resterend'));
  assertEquals(2, unit.files.length);
  const record = JSON.parse(unit.files[0].blob.content.trim());
  assertEquals('2026-07-01T12:00:00.000Z', record.timestamp);
  assertEquals('a|b\nc', record.details);
  assertEquals(2, unit.files[0].blob.content.split('\n').length);
  assertEquals('[[4,1]]', JSON.stringify(unit.deleted));
  assertEquals(5, unit.rows.length);
  assertEquals(undefined, unit.props.AUDIT_ARCHIVE_PENDING);
}

function testAuditArchiveConcurrentAppendAndDuplicates() {
  auditMaintenanceFixture_();
  unit.add(new Date('2026-07-01T12:00:00Z'));
  unit.onCreate = () => {
    if (!unit.files.length) auditService.log({ toRow: () => [unit.now,'NEW','','','','','',''] });
  };
  auditMaintenanceService.archive(unit.now);
  assertEquals(3, unit.files[0].blob.content.trim().split('\n').length);
  assertEquals('[[4,2],[2,1]]', JSON.stringify(unit.deleted));
  assertEquals(3, unit.rows.length);
  assertEquals('NEW', unit.rows[2][1]);
  assertEquals(0, unit.locks);
}

function testAuditArchiveNoDataAndInvalidDates() {
  unit.add('invalid'); unit.add(new Date('invalid'));
  assertTrue(auditMaintenanceService.archive(unit.now).includes('2 regels met ongeldige datum'));
  assertEquals(0, unit.files.length);
  assertEquals(0, unit.deleted.length);
}

function testAuditArchiveDriveFailureBlocksRetry() {
  auditMaintenanceFixture_(); unit.driveError = true;
  assertThrows(() => auditMaintenanceService.archive(unit.now), 'Drive failed');
  assertEquals(0, unit.deleted.length);
  assertEquals('CREATING', JSON.parse(unit.props.AUDIT_ARCHIVE_PENDING).phase);
  unit.driveError = false;
  assertThrows(() => auditMaintenanceService.archive(unit.now), 'Een auditarchiefbatch is niet afgerond. Controleer AUDIT_ARCHIVE_PENDING en herstel handmatig vóór een nieuwe poging.');
  assertEquals(0, unit.files.length);
}

function testAuditArchiveVerificationFailure() {
  auditMaintenanceFixture_(); unit.corrupt = true;
  assertThrows(() => auditMaintenanceService.archive(unit.now), 'Archiefcontrole mislukt; auditregels behouden.');
  assertEquals(0, unit.deleted.length);
  assertTrue(!!JSON.parse(unit.props.AUDIT_ARCHIVE_PENDING).fileId);
}

function testAuditArchiveChangedSheetPreserved() {
  auditMaintenanceFixture_(); unit.onCreate = () => { unit.rows[1][3] = 'changed'; };
  assertThrows(() => auditMaintenanceService.archive(unit.now), 'Auditlog gewijzigd tijdens archivering; niets verwijderd. Controleer de batch.');
  assertEquals(0, unit.deleted.length);
  assertEquals(0, unit.locks);
}

function testAuditArchiveAmbiguousDelete() {
  auditMaintenanceFixture_(); unit.ambiguousDelete = true;
  assertThrows(() => auditMaintenanceService.archive(unit.now), 'Delete response lost');
  assertEquals('DELETING', JSON.parse(unit.props.AUDIT_ARCHIVE_PENDING).phase);
  assertEquals(2, unit.files.length);
  assertEquals(1, unit.deleted.length);
  assertEquals(0, unit.locks);
}

function testAuditArchiveLimitsAndPermissions() {
  auditMaintenanceFixture_(); unit.oversize = true;
  assertThrows(() => auditMaintenanceService.archive(unit.now), 'Batch groter dan 5 MiB. Verlaag AUDIT_ARCHIVE_BATCH_SIZE; niets verwijderd.');
  assertEquals(0, unit.files.length);
  assertEquals(undefined, unit.props.AUDIT_ARCHIVE_PENDING);
  unit.admin = false;
  assertThrows(() => archiveAuditLog(), "Alleen admin@example.invalid mag 'Auditlog archiveren'.");
  assertThrows(() => archiveAuditLog({}), 'Auditarchivering uitsluitend handmatig starten.');
  unit.admin = true; unit.documentAvailable = false;
  assertThrows(() => auditService.log({ toRow: () => [] }), 'Auditlog is tijdelijk bezet; schrijven niet uitgevoerd.');
  assertEquals(4, unit.rows.length);
}

function testAuditArchiveDefaultBatchAndNextRun() {
  for (let i = 0; i < 251; i++) unit.add(new Date('2026-07-01T12:00:00Z'), String(i));
  const first = auditMaintenanceService.archive(unit.now);
  assertTrue(first.includes('250 auditregels'));
  assertTrue(first.includes('1 oude regels resterend'));
  assertEquals(2, unit.rows.length);
  assertEquals('250', unit.rows[1][7]);
  auditMaintenanceService.archive(unit.now);
  assertEquals(1, unit.rows.length);
  assertEquals(4, unit.files.length);
  assertEquals(undefined, unit.props.AUDIT_ARCHIVE_PENDING);
}

function testAuditArchiveFolderAndMetadataFailure() {
  auditMaintenanceFixture_(); unit.folderError = true;
  assertThrows(() => auditMaintenanceService.archive(unit.now), 'Folder access denied');
  assertEquals(undefined, unit.props.AUDIT_ARCHIVE_PENDING);
  unit.folderError = false;
  unit.onCreate = () => { if (unit.files.length === 1) unit.corrupt = true; };
  assertThrows(() => auditMaintenanceService.archive(unit.now), 'Metadata niet bevestigd; auditregels behouden.');
  assertEquals(0, unit.deleted.length);
  assertEquals(4, unit.rows.length);
}

function testAuditArchiveEntrypointAndSchema() {
  auditMaintenanceFixture_(); unit.scriptAvailable = false;
  assertThrows(() => archiveAuditLog(), 'Een andere verwerking is actief. Probeer later opnieuw.');
  assertEquals(0, unit.files.length);
  unit.scriptAvailable = true;
  unit.rows[0].push('extra');
  assertThrows(() => archiveAuditLog(), 'Auditlog moet een header en precies acht kolommen hebben.');
  assertTrue(unit.scriptReleased);
  assertEquals(0, unit.files.length);
  unit.rows[0].pop();
  archiveAuditLog();
  assertTrue(unit.message.includes('https://example.invalid/archive'));
  assertEquals(0, unit.locks);
}
