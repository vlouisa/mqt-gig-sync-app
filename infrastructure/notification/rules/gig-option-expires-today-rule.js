/** Regel voor gigopties die vandaag vervallen; publiceert zelf niets. */
const gigOptionExpiresTodayRule = (() => {
  /**
   * Meld een optie uitsluitend op de lokale vervaldag.
   * @param {Object} gig Sheet-record.
   * @param {{zone: string, today: string}} context Lokale datum als yyyy-MM-dd.
   * @returns {Object|null} Payload met fingerprintwaarden, of geen melding.
   */
  function evaluate(gig, context) {
    const columns = CONFIG.entities.gig.columns;
    if (!gigNotificationRuleHelpers.isEligibleGig(gig, CONFIG.gigStatuses.option)) return null;

    const expiryDate = gigNotificationRuleHelpers.getLocalSheetDate(
      gig[columns.optionExpiryDate], context.zone, columns.optionExpiryDate
    );
    if (expiryDate !== context.today) return null;

    return {
      ...gigNotificationRuleHelpers.createGigPayload(gig),
      // Een nieuwe vervaldatum mag een nieuwe melding opleveren.
      fingerprintValues: [expiryDate],
      expiryDate: gig[columns.optionExpiryDate]
    };
  }

  /** @param {Object} payload Berichtvelden. @returns {{title: string, message: string}} */
  function createMessage(payload) {
    return {
      title: 'Gigoptie verloopt vandaag',
      message: [
        'De optie voor deze gig verloopt vandaag.',
        '',
        ...gigNotificationRuleHelpers.createGigMessageLines(payload),
        `Vervaldatum: ${gigNotificationRuleHelpers.formatMessageDate(payload.expiryDate)}`
      ].join('\n')
    };
  }

  return {
    id: 'gigOptionExpiresToday',
    // Pas bij gebruik lezen: Apps Script garandeert geen bestandslaadvolgorde.
    get eventCode() { return NOTIFICATION_EVENTS.gigOptionExpiresToday; },
    enabled: true,
    entity: 'gig',
    get notificationTime() { return CONFIG.entities.gig.optionExpiry.notificationTime; },
    requiredColumns: ['gigId', 'gigStatus', 'syncStatus', 'optionExpiryDate'],
    evaluate,
    createMessage
  };
})();
