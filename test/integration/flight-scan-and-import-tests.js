/**
 * Test de flight mail import flow handmatig.
 *
 * Scant alle threads met label Flights/Inbox en probeert deze te importeren.
 *
 * @returns {void}
 */
function testFlightMailScanAndImport() {
  flightMailImportService.scanAndImport();
}

/**
 * Reset alle flight import threads terug naar Flights/Inbox.
 *
 * Verplaatst threads uit Processed, Discarded en Error terug naar Inbox.
 *
 * @returns {void}
 */
function resetAllFlightImportThreads() {
  resetFlightImportThreadsFromLabel_(
    CONFIG.entities.flight.mailImport.processedLabel
  );

  resetFlightImportThreadsFromLabel_(
    CONFIG.entities.flight.mailImport.discardedLabel
  );

  resetFlightImportThreadsFromLabel_(
    CONFIG.entities.flight.mailImport.errorLabel
  );
}

/**
 * Verplaatst alle threads vanuit één flight import-label terug naar Flights/Inbox.
 *
 * @param {string} sourceLabelName Bronlabel.
 * @returns {void}
 * @private
 */
function resetFlightImportThreadsFromLabel_(sourceLabelName) {
  const labels = CONFIG.entities.flight.mailImport;

  const sourceLabel = GmailApp.getUserLabelByName(sourceLabelName);
  const inboxLabel = GmailApp.getUserLabelByName(labels.inboxLabel);

  if (!sourceLabel || !inboxLabel) {
    throw new Error(`Flight import label ontbreekt: ${sourceLabelName}`);
  }

  const threads = sourceLabel.getThreads();

  threads.forEach(thread => {
    thread.removeLabel(sourceLabel);
    thread.addLabel(inboxLabel);
  });

  logService
    .forModule('flight-mail-import-test')
    .info(
      'flight-import-threads-reset',
      'Flight import threads teruggezet naar inbox.',
      `SourceLabel: ${sourceLabelName}, Threads: ${threads.length}`
    );
}