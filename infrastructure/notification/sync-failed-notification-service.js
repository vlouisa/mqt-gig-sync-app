/**
 * Service voor sync-failed notificaties.
 */
const syncFailedNotificationService = (() => {
  /**
   * Probeert een foutnotificatie te publiceren zonder de sync-foutafhandeling te onderbreken.
   * Ontbrekende bron-IDs worden overgeslagen; Notify-fouten worden technisch gelogd.
   * Geen retry: Notify kan al een deel van de ontvangers hebben verwerkt.
   * @param {string} eventCode Notificatie-eventcode.
   * @param {Object} payload Dezelfde payload als publish().
   * @returns {void}
   */
  function tryPublish(eventCode, payload) {
    const log = logService.forModule('sync-failed-notification-service');
    const context = `Event: ${eventCode}, Entity: ${payload.entity}, SourceId: ${payload.sourceId || ''}, Row: ${payload.rowNumber}`;

    if (!payload.sourceId) {
      log.warn('sync-failed-notification-skipped',
        'Foutnotificatie overgeslagen: bron-ID ontbreekt.', context);
      return;
    }

    try {
      publish(eventCode, payload);
    } catch (error) {
      log.error('sync-failed-notification-error', error.message, context);
    }
  }

  /**
   * Publiceert een sync-failed notificatie.
   *
   * @param {string} eventCode Notificatie-eventcode.
   * @param {Object} payload Payload.
   * @param {string} payload.sourceId Bronrecord-ID, vereist door Notify.
   * @param {string} payload.entity Domeinnaam.
   * @param {string} payload.recordTitle Weergegeven recordidentificatie.
   * @param {number} payload.rowNumber 1-based Sheet-rijnummer.
   * @param {string} payload.errorMessage Foutmelding, ook onderdeel van de fingerprint.
   * @throws {Error} Als initialisatie of publicatie via Notify faalt.
   * @returns {void}
   */
  function publish(eventCode, payload) {
    initNotifications();

    Notify.notificationPublisher.publish(eventCode, {
      sourceId: payload.sourceId,
      notificationFingerprint: Notify.notificationFingerprintService.create([
        eventCode,
        payload.sourceId,
        payload.errorMessage,
        formatFingerprintDate_(new Date())
      ]),
      entity: payload.entity,
      recordTitle: payload.recordTitle,
      date: formatDate_(new Date()),
      rowNumber: payload.rowNumber,
      errorMessage: payload.errorMessage
    });
  }

   /**
   * Formatteert een tijdstip als dd-MM-yyyy hh:mm:ss in de scripttijdzone.
   *
   * @param {*} value Datumwaarde.
   * @returns {string} Geformatteerde datum of fallback.
   */
  function formatDate_(value) {
    if (!value) return '-';

    const date = value instanceof Date ? value : new Date(value);

    return Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      'dd-MM-yyyy hh:mm:ss'
    );
  }


   /**
   * Formatteert een datum tbv de fingerprint.
   * Gebruikt dd-MM-yyyy hh in de scripttijdzone. Notify dedupliceert queue-entries
   * op eventcode, bronrecord, fingerprint en ontvanger. Andere foutmeldingen
   * kunnen binnen hetzelfde uur nieuwe entries opleveren. Dit is geen afleverlimiet.
   *
   * @param {*} value Datumwaarde.
   * @returns {string} Geformatteerde datum of fallback.
   */
  function formatFingerprintDate_(value) {
    if (!value) return '-';

    const date = value instanceof Date ? value : new Date(value);

    return Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      'dd-MM-yyyy hh'
    );
  }

  return {
    publish,
    tryPublish
  };
})();
