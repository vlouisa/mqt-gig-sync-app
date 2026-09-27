/** Datumgebaseerde signalering voor de reizen van de zanger; geen bewijs van een boeking bij een gig. */
const gigTravelBookingsMissingRule = (() => {
  function date_(value, zone) {
    if (value instanceof Date && Number.isFinite(value.getTime())) return Utilities.formatDate(value, zone, 'yyyy-MM-dd');
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = new Date(value + 'T12:00:00Z');
      if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) return value;
    }
    throw new Error('Ongeldige reisdatum; boekingscontrole niet uitgevoerd.');
  }

  function shift_(date, days) {
    const value = new Date(date + 'T12:00:00Z');
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  /** Leest en valideert reisbronnen eenmaal per run; bronfouten mogen geen ontbrekende boeking suggereren. */
  function prepare(getSource, context) {
    const config = CONFIG.entities.gig.travelBookings;
    if (!Number.isSafeInteger(config.daysBefore) || config.daysBefore < 1) throw new Error('Ongeldige remindertermijn.');
    for (const window of [config.outboundArrival, config.returnDeparture]) {
      if (!Number.isSafeInteger(window.from) || !Number.isSafeInteger(window.to) || window.from > window.to ||
          Math.abs(window.from) > 365 || Math.abs(window.to) > 365) throw new Error('Ongeldig reisdatumvenster.');
    }
    function rows(name, keys) {
      const c = CONFIG.entities[name].columns;
      const source = getSource(name);
      if (keys.concat('syncStatus').some(key => !source.headers.includes(c[key]))) throw new Error(`Verplichte reiskolom ontbreekt: ${name}.`);
      return source.rows.filter(row => ![CONFIG.syncStatuses.deleted, CONFIG.syncStatuses.deleteRequested].includes(row[c.syncStatus]));
    }
    const f = CONFIG.entities.flight.columns;
    const h = CONFIG.entities.hotel.columns;
    return {
      config,
      flights: rows('flight', ['arrivalDate', 'departureDate']).map(row => ({
        arrival: date_(row[f.arrivalDate], context.zone), departure: date_(row[f.departureDate], context.zone)
      })),
      hotels: rows('hotel', ['checkInDate', 'checkOutDate']).map(row => {
        const start = date_(row[h.checkInDate], context.zone), end = date_(row[h.checkOutDate], context.zone);
        if (end <= start) throw new Error('Ongeldige hotelperiode; boekingscontrole niet uitgevoerd.');
        return { start, end };
      })
    };
  }

  function evaluate(gig, context) {
    if (!gigNotificationRuleHelpers.isEligibleGig(gig, CONFIG.gigStatuses.confirmed)) return null;
    const c = CONFIG.entities.gig.columns;
    const date = gigNotificationRuleHelpers.getLocalSheetDate(gig[c.date], context.zone, c.date);
    const { config, flights, hotels } = context.prepared;
    if (!date || date <= context.today || date > shift_(context.today, config.daysBefore)) return null;
    const missing = [];
    function inWindow(value, window) { return value >= shift_(date, window.from) && value <= shift_(date, window.to); }
    if (!flights.some(flight => inWindow(flight.arrival, config.outboundArrival))) missing.push('Heenvlucht');
    if (!flights.some(flight => inWindow(flight.departure, config.returnDeparture))) missing.push('Terugvlucht');
    if (!hotels.some(hotel => hotel.start <= date && hotel.end > date)) missing.push('Hotelovernachting na het optreden');
    if (!missing.length) return null;
    return { ...gigNotificationRuleHelpers.createGigPayload(gig), missing,
      fingerprintValues: ['travel-bookings-reminder', date] };
  }

  function createMessage(payload) {
    return { title: 'Reisboekingen controleren', message: [
      ...gigNotificationRuleHelpers.createGigMessageLines(payload), '',
      'Geen passende boeking gevonden. Nog te controleren:', ...payload.missing.map(item => '- ' + item)
    ].join('\n') };
  }

  return { id: 'gigTravelBookingsMissing', enabled: true, entity: 'gig',
    get eventCode() { return NOTIFICATION_EVENTS.gigTravelBookingsMissing; },
    get notificationTime() { return CONFIG.entities.gig.travelBookings.notificationTime; },
    requiredColumns: ['gigId', 'gigStatus', 'syncStatus', 'date'], prepare, evaluate, createMessage };
})();
