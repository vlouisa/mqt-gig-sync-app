/**
 * Service voor gig-gerelateerde notificaties.
 */
const gigNotificationService = (() => {
  /**
   * Publiceert een notificatie nadat een gig succesvol naar Calendar is gesynchroniseerd.
   *
   * @param {Object} gig Gig-record uit de sheet.
   * @returns {void}
   */
  function publishGigPublished(gig) {
    initNotifications();

    const columns = CONFIG.entities.gig.columns;

    Notify.notificationPublisher.publish(NOTIFICATION_EVENTS.gigPublished, {
      sourceId: gig[columns.gigId],
      notificationFingerprint: createGigPublishedFingerprint_(gig),
      title: gig[columns.title],
      date: gig[columns.date],
      start: gig[columns.start],
      end: gig[columns.end],
      location: gig[columns.location],
      description: gig[columns.description],
      soundEngineer: gig[columns.soundEngineer]
    });
  }

  /**
   * Maakt een fingerprint voor relevante gig-publicatie-inhoud.
   *
   * @param {Object} gig Gig-record uit de sheet.
   * @returns {string} Notification fingerprint.
   * @private
   */
  function createGigPublishedFingerprint_(gig) {
    const columns = CONFIG.entities.gig.columns;

    return Notify.notificationFingerprintService.create([
      gig[columns.gigStatus],
      gig[columns.title],
      gig[columns.date],
      gig[columns.start],
      gig[columns.end],
      gig[columns.location],
      gig[columns.soundEngineer],
      gig[columns.description]
    ]);
  }

  return {
    publishGigPublished
  };
})();