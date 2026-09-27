/** Archiveert uitsluitend oude regels. Een onzekere batch blokkeert vervolgacties tot handmatig herstel. */
const auditMaintenanceService = (() => {
  const PENDING_KEY = 'AUDIT_ARCHIVE_PENDING';
  const FIELDS = ['timestamp', 'action', 'entityId', 'entityTitle', 'oldStatus', 'newStatus', 'userEmail', 'details'];
  const MAX_BYTES = 5 * 1024 * 1024;

  function digest_(text) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
      .map(value => (value & 255).toString(16).padStart(2, '0')).join('');
  }

  function read_(sheet) {
    if (sheet.getLastColumn() !== 8 || sheet.getLastRow() < 1) throw new Error('Auditlog moet een header en precies acht kolommen hebben.');
    const rows = sheet.getDataRange().getValues();
    if (rows[0].some(value => typeof value !== 'string' || !value.trim()) || new Set(rows[0]).size !== 8) {
      throw new Error('Ongeldige auditheaders; archivering gestopt.');
    }
    return rows;
  }

  /** Selectie op timestamp; gelijke timestamps behouden hun oorspronkelijke rijvolgorde. */
  function select(rows, cutoff, limit) {
    return rows.slice(1).map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(item => item.row[0] instanceof Date && Number.isFinite(item.row[0].getTime()) && item.row[0].getTime() < cutoff)
      .sort((a, b) => a.row[0] - b.row[0] || a.rowNumber - b.rowNumber).slice(0, limit);
  }

  function serialize(items) {
    return items.map(item => JSON.stringify(Object.fromEntries(FIELDS.map((key, i) =>
      [key, i === 0 ? item.row[i].toISOString() : item.row[i]])))).join('\n') + '\n';
  }

  /** Verwijder opeenvolgende rijblokken onderaan eerst; geen clear-and-rewrite van recente regels. */
  function groups_(items) {
    const numbers = items.map(item => item.rowNumber).sort((a, b) => b - a);
    const groups = [];
    numbers.forEach(row => {
      const last = groups[groups.length - 1];
      if (last && row === last.start - 1) { last.start = row; last.count++; }
      else groups.push({ start: row, count: 1 });
    });
    return groups;
  }

  /**
   * Eén batch. Drive wordt buiten het documentlock benaderd zodat onEdit kan blijven loggen.
   * Bij iedere onzekere side effect blijft de batchregistratie staan; nooit blind opnieuw proberen.
   */
  function archive(now = new Date()) {
    const started = Date.now();
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty(PENDING_KEY)) throw new Error('Een auditarchiefbatch is niet afgerond. Controleer AUDIT_ARCHIVE_PENDING en herstel handmatig vóór een nieuwe poging.');
    const settings = appPropertiesService.getAuditArchiveSettings();
    const cutoff = now.getTime() - settings.retentionDays * 86400000;
    if (!Number.isFinite(cutoff) || !Number.isFinite(new Date(cutoff).getTime())) throw new Error('Ongeldige bewaartermijn.');
    const sheet = sheetService.getSheet(CONFIG.auditLog.sheetName);
    const snapshot = withAuditDocumentLock_(() => read_(sheet));
    const items = select(snapshot, cutoff, settings.batchSize);
    const eligible = select(snapshot, cutoff, snapshot.length).length;
    const invalid = snapshot.slice(1).filter(row => !(row[0] instanceof Date) || !Number.isFinite(row[0].getTime())).length;
    if (!items.length) return `Geen oude auditregels. ${invalid} regels met ongeldige datum behouden.`;
    const content = serialize(items);
    const blob = Utilities.newBlob(content, 'application/x-ndjson');
    if (blob.getBytes().length > MAX_BYTES) throw new Error('Batch groter dan 5 MiB. Verlaag AUDIT_ARCHIVE_BATCH_SIZE; niets verwijderd.');
    const folder = DriveApp.getFolderById(settings.folderId);
    const batchId = Utilities.getUuid();
    const name = `audit-log_${Utilities.formatDate(now, 'UTC', 'yyyyMMdd_HHmmss')}_${batchId}`;
    const state = { schemaVersion: 1, batchId, name, folderId: settings.folderId,
      spreadsheetId: sheet.getParent().getId(), sheetId: sheet.getSheetId(), headers: snapshot[0],
      startedAt: now.toISOString(), cutoff: new Date(cutoff).toISOString(), retentionDays: settings.retentionDays,
      count: items.length, sha256: digest_(content), phase: 'CREATING' };
    function save() { props.setProperty(PENDING_KEY, JSON.stringify(state)); }
    if (Date.now() - started > 60000) throw new Error('Voorbereiding duurt te lang; niets gewijzigd.');
    save(); // Vóór de eerste externe write; een timeout bij create mag geen tweede batch opleveren.
    const file = folder.createFile(blob.setName(name + '.jsonl'));
    state.fileId = file.getId();
    state.phase = 'VERIFYING'; save();
    if (file.getBlob().getDataAsString('UTF-8') !== content) throw new Error('Archiefcontrole mislukt; auditregels behouden.');
    const manifest = { ...state, phase: 'ARCHIVED', sourceRows: items.map(item => item.rowNumber),
      sourceSnapshotSha256: digest_(JSON.stringify(snapshot)) };
    const metadataText = JSON.stringify(manifest, null, 2);
    const metadata = folder.createFile(Utilities.newBlob(metadataText, 'application/json', name + '.manifest.json'));
    state.manifestId = metadata.getId(); save();
    if (metadata.getBlob().getDataAsString('UTF-8') !== metadataText) throw new Error('Metadata niet bevestigd; auditregels behouden.');
    if (Date.now() - started > 120000) throw new Error('Tijdslimiet voorbereiding bereikt; archief bewaard, opschonen niet gestart.');
    withAuditDocumentLock_(() => {
      const current = read_(sheet);
      if (JSON.stringify(current.slice(0, snapshot.length)) !== JSON.stringify(snapshot)) {
        throw new Error('Auditlog gewijzigd tijdens archivering; niets verwijderd. Controleer de batch.');
      }
      state.phase = 'DELETING'; save();
      const deleteStarted = Date.now();
      for (const group of groups_(items)) {
        if (Date.now() - deleteStarted > 3000) throw new Error('Opschonen onderbroken om auditwrites vrij te geven. Controleer de gedeeltelijk verwerkte batch.');
        sheet.deleteRows(group.start, group.count);
      }
      SpreadsheetApp.flush();
      state.phase = 'COMPLETED'; save();
    });
    props.deleteProperty(PENDING_KEY);
    return `${items.length} auditregels gearchiveerd en verwijderd. ${eligible - items.length} oude regels resterend; ${invalid} ongeldige datums behouden. Archief: ${file.getUrl()}`;
  }

  return { archive, select, serialize };
})();
