/**
 * Test de hotel mail import flow handmatig.
 *
 * Scant alle threads met label Hotels/Inbox en probeert deze te importeren.
 *
 * @returns {void}
 */
function testHotelMailScanAndImport() {
  hotelMailImportService.scanAndImport();
}

/**
 * Reset alle hotel import threads terug naar Hotels/Inbox.
 *
 * Verplaatst threads uit Processed, Discarded en Error terug naar Inbox.
 *
 * @returns {void}
 */
function resetAllHotelImportThreads() {
  resetHotelImportThreadsFromLabel_(
    CONFIG.entities.hotel.mailImport.processedLabel
  );

  resetHotelImportThreadsFromLabel_(
    CONFIG.entities.hotel.mailImport.discardedLabel
  );

  resetHotelImportThreadsFromLabel_(
    CONFIG.entities.hotel.mailImport.errorLabel
  );
}

/**
 * Verplaatst alle threads vanuit één hotel import-label terug naar Hotels/Inbox.
 *
 * @param {string} sourceLabelName Bronlabel.
 * @returns {void}
 * @private
 */
function resetHotelImportThreadsFromLabel_(sourceLabelName) {
  const labels = CONFIG.entities.hotel.mailImport;

  const sourceLabel = GmailApp.getUserLabelByName(sourceLabelName);
  const inboxLabel = GmailApp.getUserLabelByName(labels.inboxLabel);

  if (!sourceLabel || !inboxLabel) {
    throw new Error(`Hotel import label ontbreekt: ${sourceLabelName}`);
  }

  const threads = sourceLabel.getThreads();

  threads.forEach(thread => {
    thread.removeLabel(sourceLabel);
    thread.addLabel(inboxLabel);
  });

  logService
    .forModule('hotel-mail-import-test')
    .info(
      'hotel-import-threads-reset',
      'Hotel import threads teruggezet naar inbox.',
      `SourceLabel: ${sourceLabelName}, Threads: ${threads.length}`
    );
}