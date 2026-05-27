/**
 * Service voor Google Calendar-operaties van flights.
 */
const flightCalendarService = (() => {
  const MODULE_NAME = 'flight-calendar-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Maakt of update een Calendar-event voor een flight.
   *
   * @param {Object} flight Flight-record uit de Sheet.
   * @returns {string} Google Calendar Event ID.
   */
  function createOrUpdateEvent(flight) {
    const log = getLog_();
    const columns = CONFIG.entities.flight.columns;

    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);

    const startDateTime = buildDepartureDateTime_(flight);
    const endDateTime = buildArrivalDateTime_(flight);

    const eventPayload = buildEventPayload_(flight);

    let event;

    if (flight[columns.calendarEventId]) {
      event = calendar.getEventById(flight[columns.calendarEventId]);
    }

    if (event) {
      updateEvent_(event, startDateTime, endDateTime, eventPayload);

      log.info(
        'flight-calendar-event-updated',
        'Flight Calendar-event bijgewerkt.',
        `FlightId: ${flight[columns.flightId]}`
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
      'flight-calendar-event-created',
      'Flight Calendar-event aangemaakt.',
      `FlightId: ${flight[columns.flightId]}`
    );

    return event.getId();
  }

  /**
   * Verwijdert een Calendar-event voor een flight.
   *
   * @param {Object} flight Flight-record uit de Sheet.
   * @returns {void}
   */
  function deleteEvent(flight) {
    const log = getLog_();
    const columns = CONFIG.entities.flight.columns;

    if (!flight[columns.calendarEventId]) {
      return;
    }

    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);

    const event = calendar.getEventById(
      flight[columns.calendarEventId]
    );

    if (!event) {
      return;
    }

    event.deleteEvent();

    log.info(
      'flight-calendar-event-deleted',
      'Flight Calendar-event verwijderd.',
      `FlightId: ${flight[columns.flightId]}`
    );
  }

  /**
   * Bouwt de vertrekdatum+tijd van een flight.
   *
   * @param {Object} flight Flight-record.
   * @returns {Date} Vertrekdatum+tijd.
   */
  function buildDepartureDateTime_(flight) {
    const columns = CONFIG.entities.flight.columns;

    return calendarService.buildDateTime(
      flight[columns.departureDate],
      flight[columns.departureTime]
    );
  }

  /**
   * Bouwt de aankomstdatum+tijd van een flight.
   *
   * @param {Object} flight Flight-record.
   * @returns {Date} Aankomstdatum+tijd.
   */
  function buildArrivalDateTime_(flight) {
    const columns = CONFIG.entities.flight.columns;

    return calendarService.buildDateTime(
      flight[columns.arrivalDate],
      flight[columns.arrivalTime]
    );
  }

  /**
   * Bouwt de payload voor een Calendar-event.
   *
   * @param {Object} flight Flight-record.
   * @returns {{title: string, description: string, location: string}} Event payload.
   */
  function buildEventPayload_(flight) {
    const columns = CONFIG.entities.flight.columns;

    return {
      title: buildTitle_(flight),
      description: buildDescription_(flight),
      location: buildLocation_(flight)
    };
  }

  /**
   * Bouwt de Calendar-event titel.
   *
   * @param {Object} flight Flight-record.
   * @returns {string} Eventtitel.
   */
  function buildTitle_(flight) {
    const columns = CONFIG.entities.flight.columns;

    return `FLIGHT - ${flight[columns.flightNumber]} (${flight[columns.departureAirport]} ➞ ${flight[columns.arrivalAirport]})`; 
      }

  /**
   * Bouwt de Calendar-event beschrijving.
   *
   * @param {Object} flight Flight-record.
   * @returns {string} Eventbeschrijving.
   */
  function buildDescription_(flight) {
    const columns = CONFIG.entities.flight.columns;

    return `${flight[columns.description]}`;
  }

  /**
   * Bouwt de Calendar-event locatie.
   *
   * @param {Object} flight Flight-record.
   * @returns {string} Eventlocatie.
   */
  function buildLocation_(flight) {
    const columns = CONFIG.entities.flight.columns;

    return `${flight[columns.arrivalLocation]}`;
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