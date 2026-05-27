/**
 * Service voor sync-failed notificaties.
 */
const syncFailedNotificationService = (() => {
  /**
   * Publiceert een sync-failed notificatie.
   *
   * @param {string} eventCode Notificatie-eventcode.
   * @param {Object} payload Payload.
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
   * Formatteert een datum .
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
   * Dit zorgt ervoor dat de message ten hoogste eenmaal per uur wordt getriggerd
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
    publish
  };
})();