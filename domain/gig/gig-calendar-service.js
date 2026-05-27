/**
 * Service voor Google Calendar-operaties van gigs.
 */
const gigCalendarService = (() => {
  const MODULE_NAME = 'gig-calendar-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Maakt of update een Calendar-event voor een gig.
   *
   * @param {Object} gig Gig-record uit de Sheet.
   * @returns {string} Google Calendar Event ID.
   */
  function createOrUpdateEvent(gig) {
    const log = getLog_();
    const columns = CONFIG.entities.gig.columns;

    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);

    const startDateTime = buildStartDateTime_(gig);
    const endDateTime = buildEndDateTime_(gig);

    const eventPayload = buildEventPayload_(gig);

    let event;

    if (gig[columns.calendarEventId]) {
      event = calendar.getEventById(gig[columns.calendarEventId]);
    }

    if (event) {
      updateEvent_(event, startDateTime, endDateTime, eventPayload);

      log.info(
        'calendar-event-updated',
        'Gig Calendar-event bijgewerkt.',
        `GigId: ${gig[columns.gigId]}`
      );

      return event.getId();
    }

    event = calendar.createEvent(
      eventPayload.title,
      startDateTime,
      endDateTime,
      {
        description: eventPayload.description,
        location: eventPayload.location
      }
    );

    log.info(
      'calendar-event-created',
      'Gig Calendar-event aangemaakt.',
      `GigId: ${gig[columns.gigId]}`
    );

    return event.getId();
  }

  /**
   * Verwijdert een Calendar-event voor een gig.
   *
   * @param {Object} gig Gig-record uit de Sheet.
   * @returns {void}
   */
  function deleteEvent(gig) {
    const log = getLog_();
    const columns = CONFIG.entities.gig.columns;

    if (!gig[columns.calendarEventId]) {
      return;
    }

    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);

    const event = calendar.getEventById(gig[columns.calendarEventId]);

    if (!event) {
      return;
    }

    event.deleteEvent();

    log.info(
      'calendar-event-deleted',
      'Gig Calendar-event verwijderd.',
      `GigId: ${gig[columns.gigId]}`
    );
  }

  /**
   * Bouwt de startdatum+tijd van een gig.
   *
   * @param {Object} gig Gig-record uit de Sheet.
   * @returns {Date} Startdatum+tijd.
   */
  function buildStartDateTime_(gig) {
    const columns = CONFIG.entities.gig.columns;

    return calendarService.buildDateTime(
      gig[columns.date],
      gig[columns.start]
    );
  }

  /**
   * Bouwt de einddatum+tijd van een gig.
   *
   * @param {Object} gig Gig-record uit de Sheet.
   * @returns {Date} Einddatum+tijd.
   */
  function buildEndDateTime_(gig) {
    const columns = CONFIG.entities.gig.columns;

    return calendarService.buildDateTime(
      gig[columns.date],
      gig[columns.end]
    );
  }

  /**
   * Bouwt de payload voor een Calendar-event.
   *
   * @param {Object} gig Gig-record uit de Sheet.
   * @returns {{title: string, description: string, location: string}} Event payload.
   */
  function buildEventPayload_(gig) {
    const columns = CONFIG.entities.gig.columns;

    return {
      title: buildTitle_(gig),
      description: buildDescription_(gig),
      location: gig[columns.location] || ''
    };
  }

  /**
   * Bouwt de Calendar-event titel.
   *
   * @param {Object} gig Gig-record uit de Sheet.
   * @returns {string} Eventtitel.
   */
  function buildTitle_(gig) {
    const columns = CONFIG.entities.gig.columns;

    return `${gig[columns.gigStatus]} - ${gig[columns.title]}`;
  }

  /**
   * Bouwt de Calendar-event beschrijving.
   *
   * @param {Object} gig Gig-record uit de Sheet.
   * @returns {string} Eventbeschrijving.
   */
  function buildDescription_(gig) {
    const columns = CONFIG.entities.gig.columns;

    return [
    `Showtime: ${formatTime_(gig[columns.start])} - ${formatTime_(gig[columns.end])}`,
      gig[columns.description] || '',
      '',
      `Sound engineer: ${gig[columns.soundEngineer] || '-'}`
    ].join('\n').trim();
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

  /**
   * Werkt een bestaand Calendar-event bij.
   *
   * @param {GoogleAppsScript.Calendar.CalendarEvent} event Calendar-event.
   * @param {Date} startDateTime Nieuwe startdatum+tijd.
   * @param {Date} endDateTime Nieuwe einddatum+tijd.
   * @param {{title: string, description: string, location: string}} payload Event payload.
   * @returns {void}
   */
  function updateEvent_(event, startDateTime, endDateTime, payload) {
    event.setTitle(payload.title);
    event.setTime(startDateTime, endDateTime);
    event.setDescription(payload.description);
    event.setLocation(payload.location);
  }

  return {
    createOrUpdateEvent,
    deleteEvent
  };
})();