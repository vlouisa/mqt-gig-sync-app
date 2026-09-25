/** Gedeelde gigselectie en berichtvelden; businessdatums en fingerprints staan in de rules. */
const gigNotificationRuleHelpers = (() => {
  /** Controleert boekingsstatus en sluit verwijderde/te verwijderen gigs uit. */
  function isEligibleGig(gig, requiredStatus) {
    const columns = CONFIG.entities.gig.columns;
    if (gig[columns.gigStatus] !== requiredStatus) return false;

    const syncStatus = gig[columns.syncStatus];
    return syncStatus !== CONFIG.syncStatuses.deleteRequested &&
      syncStatus !== CONFIG.syncStatuses.deleted;
  }

  /** Zet de gemeenschappelijke Sheet-velden om naar berichtvelden voor Notify. */
  function createGigPayload(gig) {
    const columns = CONFIG.entities.gig.columns;
    return {
      sourceId: gig[columns.gigId],
      title: gig[columns.title],
      date: gig[columns.date],
      location: gig[columns.location]
    };
  }

  /**
   * @returns {string|null} Lokale kalenderdatum als yyyy-MM-dd; null bij een lege cel.
   * @throws {Error} Bij tekst of een ongeldige Date in het Sheet-datumveld.
   */
  function getLocalSheetDate(value, zone, columnName) {
    if (value === '' || value === null || value === undefined) return null;
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      throw new Error(`${columnName} moet een geldige Sheet-datum zijn.`);
    }
    return Utilities.formatDate(value, zone, 'yyyy-MM-dd');
  }

  /** Formatteert een datum voor weergave in een notificatiebericht. */
  function formatMessageDate(value) {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd-MM-yyyy');
  }

  /** Bouwt de gedeelde titel-, datum- en locatieregels van gigberichten. */
  function createGigMessageLines(payload) {
    return [
      `Titel: ${payload.title || '-'}`,
      `Datum: ${formatMessageDate(payload.date)}`,
      `Locatie: ${payload.location || '-'}`
    ];
  }

  return { isEligibleGig, createGigPayload, getLocalSheetDate, formatMessageDate, createGigMessageLines };
})();
