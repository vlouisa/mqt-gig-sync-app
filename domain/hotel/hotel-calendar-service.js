/**
 * Service voor Google Calendar-operaties van hotels.
 */
const hotelCalendarService = (() => {
  const MODULE_NAME = 'hotel-calendar-service';

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Maakt of update een all-day Calendar-event voor een hotel.
   *
   * @param {Object} hotel Hotel-record uit de Sheet.
   * @returns {string} Google Calendar Event ID.
   */
  function createOrUpdateEvent(hotel) {
    const log = getLog_();
    const columns = CONFIG.entities.hotel.columns;

    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);
    const startDate = buildCheckInDate_(hotel);
    const endDate = buildCheckOutDate_(hotel);
    const eventPayload = buildEventPayload_(hotel);

    let event;

    if (hotel[columns.calendarEventId]) {
      event = calendar.getEventById(hotel[columns.calendarEventId]);
    }

    if (event) {
      updateEvent_(event, startDate, endDate, eventPayload);

      log.info(
        'hotel-calendar-event-updated',
        'Hotel Calendar-event bijgewerkt.',
        `HotelId: ${hotel[columns.hotelId]}`
      );

      return event.getId();
    }

    event = calendar.createAllDayEvent(
      eventPayload.title,
      startDate,
      endDate,
      {
        description: eventPayload.description,
        location: eventPayload.location
      }
    );

    log.info(
      'hotel-calendar-event-created',
      'Hotel Calendar-event aangemaakt.',
      `HotelId: ${hotel[columns.hotelId]}`
    );

    return event.getId();
  }

  /**
   * Verwijdert een Calendar-event voor een hotel.
   *
   * @param {Object} hotel Hotel-record uit de Sheet.
   * @returns {void}
   */
  function deleteEvent(hotel) {
    const log = getLog_();
    const columns = CONFIG.entities.hotel.columns;

    if (!hotel[columns.calendarEventId]) {
      return;
    }

    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);
    const event = calendar.getEventById(hotel[columns.calendarEventId]);

    if (!event) {
      return;
    }

    event.deleteEvent();

    log.info(
      'hotel-calendar-event-deleted',
      'Hotel Calendar-event verwijderd.',
      `HotelId: ${hotel[columns.hotelId]}`
    );
  }

  /**
   * Bouwt een lokale datum zonder UTC-shift.
   *
   * @param {*} value Datumwaarde.
   * @returns {Date} Lokale datum.
   */
  function buildLocalDate_(value) {
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const parts = String(value).slice(0, 10).split('-');

    return new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );
  }

  /**
   * Bouwt de check-in datum voor een hotel.
   *
   * @param {Object} hotel Hotel-record.
   * @returns {Date} Check-in datum.
   */
  function buildCheckInDate_(hotel) {
    return buildLocalDate_(
      hotel[CONFIG.entities.hotel.columns.checkInDate]
    );
  }

  /**
   * Bouwt de check-out datum voor een hotel.
   *
   * @param {Object} hotel Hotel-record.
   * @returns {Date} Check-out datum.
   */
  function buildCheckOutDate_(hotel) {
    return buildLocalDate_(
      hotel[CONFIG.entities.hotel.columns.checkOutDate]
    );
  }

  /**
   * Bouwt de payload voor een hotel Calendar-event.
   *
   * @param {Object} hotel Hotel-record.
   * @returns {{title: string, description: string, location: string}} Event payload.
   */
  function buildEventPayload_(hotel) {
    const columns = CONFIG.entities.hotel.columns;

    return {
      title: buildTitle_(hotel),
      description: buildDescription_(hotel),
      location: hotel[columns.address] || ''
    };
  }

  /**
   * Bouwt de Calendar-event titel.
   *
   * @param {Object} hotel Hotel-record.
   * @returns {string} Eventtitel.
   */
  function buildTitle_(hotel) {
    const columns = CONFIG.entities.hotel.columns;

    return `HOTEL - ${hotel[columns.hotel] || ''}`.trim();
  }

  /**
   * Bouwt de Calendar-event beschrijving.
   *
   * @param {Object} hotel Hotel-record.
   * @returns {string} Eventbeschrijving.
   */
  function buildDescription_(hotel) {
    const columns = CONFIG.entities.hotel.columns;

    return [
      `Hotel: ${hotel[columns.hotel] || '-'}`,
      `Address: ${hotel[columns.address] || '-'}`,
      `Country: ${hotel[columns.country] || '-'}`,
      `Reservation: ${hotel[columns.reservationReference] || '-'}`
    ].join('\n');
  }

  /**
   * Werkt een bestaand hotel Calendar-event bij.
   *
   * @param {GoogleAppsScript.Calendar.CalendarEvent} event Calendar-event.
   * @param {Date} startDate Nieuwe startdatum.
   * @param {Date} endDate Nieuwe einddatum.
   * @param {{title: string, description: string, location: string}} payload Event payload.
   * @returns {void}
   */
  function updateEvent_(event, startDate, endDate, payload) {
    event.setTitle(payload.title);
    event.setAllDayDates(startDate, endDate);
    event.setDescription(payload.description);
    event.setLocation(payload.location);
  }

  return {
    createOrUpdateEvent,
    deleteEvent
  };
})();