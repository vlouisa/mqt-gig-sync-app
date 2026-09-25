/** Controleert gigopties onafhankelijk van Calendar-publicatie. */
const gigOptionExpiryService = (() => {
  /**
   * Publiceert vervalmeldingen vanaf het ingestelde tijdstip, alleen op de dag zelf.
   * De caller bewaakt gelijktijdige publicaties met een scriptlock.
   * @param {Date} [now] Controletijdstip; standaard het huidige tijdstip.
   * @throws {Error} Bij ongeldige configuratie of ontbrekende Sheet-header.
   */
  function check(now = new Date()) {
    const log = logService.forModule('gig-option-expiry-service');
    const time = CONFIG.entities.gig.optionExpiry.notificationTime;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error('Ongeldig meldtijdstip voor gigopties; gebruik HH:mm.');
    }
    const zone = Session.getScriptTimeZone();
    if (Utilities.formatDate(now, zone, 'HH:mm') < time) return;
    const today = Utilities.formatDate(now, zone, 'yyyy-MM-dd');
    const columns = CONFIG.entities.gig.columns;
    const sheetName = CONFIG.entities.gig.sheetName;
    const headers = sheetService.getHeaders(sheetService.getSheet(sheetName));
    if (!headers.includes(columns.optionExpiryDate)) {
      throw new Error(`Verplichte kolom ontbreekt: ${columns.optionExpiryDate}`);
    }
    sheetService.getRowsAsObjects(sheetName).forEach(gig => {
      if (gig[columns.gigStatus] !== CONFIG.gigStatuses.option) return;
      if ([CONFIG.syncStatuses.deleteRequested, CONFIG.syncStatuses.deleted]
        .includes(gig[columns.syncStatus])) return;
      const expiry = gig[columns.optionExpiryDate];
      if (expiry === '' || expiry === null || expiry === undefined) return;
      try {
        if (!(expiry instanceof Date) || !Number.isFinite(expiry.getTime())) {
          throw new Error('Option Expiry Date moet een geldige Sheet-datum zijn.');
        }
        const expiryDate = Utilities.formatDate(expiry, zone, 'yyyy-MM-dd');
        if (expiryDate !== today) return;
        if (!gig[columns.gigId]) throw new Error('Gig ID ontbreekt voor vervalmelding.');
        gigNotificationService.publishOptionExpiresToday(gig, expiryDate);
      } catch (error) {
        log.error('gig-option-expiry-error', error.message,
          `Row: ${gig.rowNumber}, GigId: ${gig[columns.gigId] || ''}`);
      }
    });
  }

  return { check };
})();
