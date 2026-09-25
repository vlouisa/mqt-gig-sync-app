/** Eenmalige factuurreminder na een bevestigd optreden; publiceert zelf niets. */
const gigInvoiceNeedsToBeSentRule = (() => {
  /**
   * Herinner eenmalig aan facturatie voor een bevestigd optreden van gisteren.
   * Start/eindtijd en factuurstatus spelen geen rol; gemiste dagen halen we niet in.
   * @param {Object} gig Sheet-record.
   * @param {{zone: string, yesterday: string}} context Lokale datum als yyyy-MM-dd.
   * @returns {Object|null} Payload met fingerprintwaarden, of geen melding.
   */
  function evaluate(gig, context) {
    const columns = CONFIG.entities.gig.columns;
    if (!gigNotificationRuleHelpers.isEligibleGig(gig, CONFIG.gigStatuses.confirmed)) return null;

    const gigDate = gigNotificationRuleHelpers.getLocalSheetDate(gig[columns.date], context.zone, columns.date);
    if (gigDate !== context.yesterday) return null;

    return {
      ...gigNotificationRuleHelpers.createGigPayload(gig),
      // Vaste waarde: ook na een datumwijziging eenmaal per gig en ontvanger.
      // Deze waarde behouden om bestaande queue-deduplicatie te respecteren.
      fingerprintValues: ['invoice-reminder']
    };
  }

  /** @param {Object} payload Berichtvelden. @returns {{title: string, message: string}} */
  function createMessage(payload) {
    return {
      title: 'Factuur versturen',
      message: [
        'Herinnering om de factuur voor dit optreden te versturen.',
        '',
        ...gigNotificationRuleHelpers.createGigMessageLines(payload)
      ].join('\n')
    };
  }

  return {
    id: 'gigInvoiceNeedsToBeSent',
    // Pas bij gebruik lezen: Apps Script garandeert geen bestandslaadvolgorde.
    get eventCode() { return NOTIFICATION_EVENTS.gigInvoiceNeedsToBeSent; },
    enabled: true,
    entity: 'gig',
    notificationTime: '09:00',
    requiredColumns: ['gigId', 'gigStatus', 'syncStatus', 'date'],
    evaluate,
    createMessage
  };
})();
