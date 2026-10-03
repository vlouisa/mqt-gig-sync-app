/** Handmatige beheeractie; geen automatische archivering vanuit triggers. */
function archiveAuditLog(event) {
  const result = archiveAuditLogResult_(event);
  SpreadsheetApp.getUi().alert(result);
}

/** Deelt de beveiligde archiefactie met het paneel, zonder blokkerende UI-alert. */
function archiveAuditLogResult_(event) {
  if (event) throw new Error('Auditarchivering uitsluitend handmatig starten.');
  assertAdminUser('Auditlog archiveren');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Een andere verwerking is actief. Probeer later opnieuw.');
  let result;
  try { result = auditMaintenanceService.archive(); } finally { lock.releaseLock(); }
  return result;
}
