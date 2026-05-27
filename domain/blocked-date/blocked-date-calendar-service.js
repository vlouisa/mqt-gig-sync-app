/**
 * Service voor Google Calendar-operaties van blocked dates.
 */
const blockedDateCalendarService = (() => {
  const MODULE_NAME = 'blocked-date-calendar-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Maakt of update een all-day Calendar-event voor een blocked date.
   *
   * @param {Object} blockedDate Blocked-date record uit de Sheet.
   * @returns {string} Google Calendar Event ID.
   */
  function createOrUpdateEvent(blockedDate) {
    const log = getLog_();
    const columns = CONFIG.entities.blockedDate.columns;

    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);
    const eventPayload = buildEventPayload_(blockedDate);

    let event;

    if (blockedDate[columns.calendarEventId]) {
      event = calendar.getEventById(blockedDate[columns.calendarEventId]);
    }

    if (event) {
      updateEvent_(event, eventPayload);

      log.info(
        'calendar-event-updated',
        'Blocked-date Calendar-event bijgewerkt.',
        `BlockId: ${blockedDate[columns.blockId]}`
      );

      return event.getId();
    }

    event = calendar.createAllDayEvent(
      eventPayload.title,
      eventPayload.startDate,
      eventPayload.endDate,
      {
        description: eventPayload.description
      }
    );

    log.info(
      'calendar-event-created',
      'Blocked-date Calendar-event aangemaakt.',
      `BlockId: ${blockedDate[columns.blockId]}`
    );

    return event.getId();
  }

  /**
   * Verwijdert een Calendar-event voor een blocked date.
   *
   * @param {Object} blockedDate Blocked-date record uit de Sheet.
   * @returns {void}
   */
  function deleteEvent(blockedDate) {
    const log = getLog_();
    const columns = CONFIG.entities.blockedDate.columns;

    if (!blockedDate[columns.calendarEventId]) {
      return;
    }

    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);
    const event = calendar.getEventById(blockedDate[columns.calendarEventId]);

    if (!event) {
      return;
    }

    event.deleteEvent();

    log.info(
      'calendar-event-deleted',
      'Blocked-date Calendar-event verwijderd.',
      `BlockId: ${blockedDate[columns.blockId]}`
    );
  }

  /**
   * Bouwt de payload voor een blocked-date Calendar-event.
   *
   * @param {Object} blockedDate Blocked-date record uit de Sheet.
   * @returns {{title: string, startDate: Date, endDate: Date, description: string}} Event payload.
   */
  function buildEventPayload_(blockedDate) {
    const columns = CONFIG.entities.blockedDate.columns;

    return {
      title: buildTitle_(blockedDate),
      startDate: blockedDate[columns.startDate],
      endDate: buildExclusiveEndDate_(blockedDate[columns.endDate]),
      description: buildDescription_(blockedDate)
    };
  }

  /**
   * Bouwt de Calendar-event titel.
   *
   * @param {Object} blockedDate Blocked-date record uit de Sheet.
   * @returns {string} Eventtitel.
   */
  function buildTitle_(blockedDate) {
    const columns = CONFIG.entities.blockedDate.columns;

    return `BLOCKED - ${blockedDate[columns.name]}`;
  }

  /**
   * Bouwt de Calendar-event beschrijving.
   *
   * @param {Object} blockedDate Blocked-date record uit de Sheet.
   * @returns {string} Eventbeschrijving.
   */
  function buildDescription_(blockedDate) {
    const columns = CONFIG.entities.blockedDate.columns;

    return [
      `Naam: ${blockedDate[columns.name]}`,
      `Reden: ${blockedDate[columns.reason] || '-'}`,
      '',
      `Block ID: ${blockedDate[columns.blockId]}`
    ].join('\n').trim();
  }

  /**
   * Zet een inclusieve einddatum uit de Sheet om naar een exclusieve Calendar einddatum.
   *
   * Google Calendar all-day events gebruiken een exclusieve einddatum.
   * Een blokkade van 1 t/m 1 januari wordt dus opgeslagen als 1 januari t/m 2 januari.
   *
   * @param {Date} endDate Inclusieve einddatum uit de Sheet.
   * @returns {Date} Exclusieve einddatum voor Calendar.
   */
  function buildExclusiveEndDate_(endDate) {
    const result = new Date(endDate);
    result.setDate(result.getDate() + 1);

    return result;
  }

  /**
   * Werkt een bestaand Calendar-event bij.
   *
   * @param {GoogleAppsScript.Calendar.CalendarEvent} event Calendar-event.
   * @param {{title: string, startDate: Date, endDate: Date, description: string}} payload Event payload.
   * @returns {void}
   */
  function updateEvent_(event, payload) {
    event.setTitle(payload.title);
    event.setAllDayDates(payload.startDate, payload.endDate);
    event.setDescription(payload.description);
  }

  return {
    createOrUpdateEvent,
    deleteEvent
  };
})();