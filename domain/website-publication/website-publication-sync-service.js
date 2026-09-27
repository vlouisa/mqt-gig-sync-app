/** Maakt nieuwe snapshots; kent geen WordPress-client en wijzigt bestaande snapshots nooit. */
const websitePublicationSyncService = (() => {
  /** @returns {boolean} Vandaag/toekomst, CONFIRMED en niet technisch verwijderd. */
  function isEligible(gig, now = new Date()) {
    const c = CONFIG.entities.gig.columns;
    const date = gig[c.date];
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return false;
    const zone = Session.getScriptTimeZone();
    return gig[c.gigStatus] === CONFIG.gigStatuses.confirmed &&
      ![CONFIG.syncStatuses.deleteRequested, CONFIG.syncStatuses.deleted].includes(gig[c.syncStatus]) &&
      Utilities.formatDate(date, zone, 'yyyy-MM-dd') >= Utilities.formatDate(now, zone, 'yyyy-MM-dd');
  }

  /** De entrypoint houdt hetzelfde scriptlock vast als Calendar-sync. */
  function sync(now = new Date()) {
    const config = CONFIG.entities.gig;
    const c = config.columns;
    const headers = sheetService.getHeaders(sheetService.getSheet(config.sheetName));
    const keys = ['gigId', 'gigStatus', 'syncStatus', 'title', 'date', 'venue', 'city',
      'country', 'start', 'address', 'zip', 'contactEmail', 'contactWebsite'];
    if (keys.some(key => !headers.includes(c[key]))) throw new Error('Verplichte gig-input headers ontbreken.');
    const existing = new Set(websitePublicationSheetService.getRows()
      .map(row => String(row[CONFIG.websitePublications.columns.gigId] || '')).filter(Boolean));
    const rows = sheetService.getRowsAsObjects(config.sheetName);
    const counts = new Map();
    rows.forEach(row => {
      const id = String(row[c.gigId] || '');
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    });
    const log = logService.forModule('website-publication-sync-service');
    let added = 0;
    rows.forEach(gig => {
      if (!isEligible(gig, now)) return;
      let id = String(gig[c.gigId] || '');
      if (id && counts.get(id) > 1) {
        log.warn('duplicate-source-id', 'Dubbel Gig ID; publicatie overgeslagen.', `Row: ${gig.rowNumber}`);
        return;
      }
      if (existing.has(id)) return;
      try {
        if (!id) {
          ensureGigId(gig.rowNumber);
          SpreadsheetApp.flush();
          gig = sheetService.getRowAsObject(gig.rowNumber, config.sheetName);
          id = String(gig[c.gigId] || '');
        }
        if (!id || !isEligible(gig, now) || existing.has(id)) return;
        // Reserveer vóór append: ook een ambigue Sheet-fout leidt binnen deze run niet tot retry.
        existing.add(id);
        const snapshot = { status: CONFIG.websitePublications.statuses.ready };
        keys.filter(key => !['gigStatus', 'syncStatus'].includes(key))
          .forEach(key => { snapshot[key] = gig[c[key]]; });
        websitePublicationSheetService.append(snapshot);
        added++;
      } catch (error) {
        log.error('website-snapshot-error', 'Snapshot niet afgerond; controleer headers en Sheet-toegang.', `Row: ${gig.rowNumber}`);
      }
    });
    return added;
  }

  return { sync, isEligible };
})();
