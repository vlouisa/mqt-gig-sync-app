/**
 * Factory voor het maken van notificatieberichten.
 */
const notificationMessageFactory = (() => {
  /**
   * Maakt een notificatiebericht voor een event.
   *
   * @param {string} eventCode Code van het notificatie-event.
   * @param {Object} payload Eventpayload.
   * @returns {{title: string, message: string}} Notificatiebericht.
   */
  function create(eventCode, payload) {
    switch (eventCode) {
      case NOTIFICATION_EVENTS.gigPublished:
        return createGigPublishedMessage_(payload);
      case 'GIG_SYNC_FAILED':
        return createSyncFailedMessage_('Gig sync mislukt', payload);

      case 'FLIGHT_SYNC_FAILED':
        return createSyncFailedMessage_('Flight sync mislukt', payload);

      case 'HOTEL_SYNC_FAILED':
        return createSyncFailedMessage_('Hotel sync mislukt', payload);
      default:
        throw new Error(`Geen notificatietemplate gevonden voor event: ${eventCode}`);
    }
  }

  /**
   * Maakt het bericht voor een gepubliceerde gig.
   *
   * @param {Object} payload Eventpayload.
   * @returns {{title: string, message: string}} Notificatiebericht.
   */
  function createGigPublishedMessage_(payload) {
    return {
      title: 'Gig gepubliceerd',
      message: [
        'Gig gepubliceerd naar MQT agenda.',
        '',
        `Titel: ${payload.title || '-'}`,
        `Datum: ${formatDate_(payload.date)}`,
        `Tijd: ${formatTime_(payload.start) || '-'} - ${formatTime_(payload.end) || '-'}`,
        `Locatie: ${payload.location || '-'}`,
        `Geluid: ${payload.soundEngineer || '-'}`,
        '',
        payload.description || ''
      ].join('\n').trim()
    };
  }

  /**
   * Maakt een generiek sync-failed notificatiebericht.
   *
   * @param {string} title Titel van de notificatie.
   * @param {Object} payload Eventpayload.
   * @returns {{title: string, message: string}} Notificatiebericht.
   */
  function createSyncFailedMessage_(title, payload) {
    return {
      title,
      message: [
        'Synchronisatie naar Calendar is mislukt.',
        '',
        `Datum: ${payload.date || '-'}`,
        `Entity: ${payload.entity || '-'}`,
        `Row: ${payload.rowNumber || '-'}`,
        `Id: ${payload.recordTitle || '-'}`,
        '',
        `Fout: ${payload.errorMessage || '-'}`
      ].join('\n').trim()
    };
  }

  /**
   * Formatteert een datum voor notificatieberichten.
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
      'dd-MM-yyyy'
    );
  }

  /**
   * Formatteert een tijdwaarde naar HH:mm.
   *
   * @param {*} value Tijdwaarde.
   * @returns {string} Tijd in HH:mm formaat of fallback.
   */
  function formatTime_(value) {
    if (!value) return '-';

    if (value instanceof Date) {
      return Utilities.formatDate(
        value,
        Session.getScriptTimeZone(),
        'HH:mm'
      );
    }

    return String(value).trim().slice(0, 5);
  }

  return {
    create
  };
})();