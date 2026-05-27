/**
 * Mapper voor flightdata naar een flight-input sheetrecord.
 */
const flightToRecordMapper = (() => {
  /**
   * Zet flightdata om naar een sheetrecord.
   *
   * @param {Object} flight Flightdata.
   * @returns {Object} Sheetrecord.
   */
  function map(flight) {
    validateFlight_(flight);

    const columns = CONFIG.entities.flight.columns;
    const departureLocal = flight.departure?.scheduledTime?.local || '';
    const arrivalLocal = flight.arrival?.scheduledTime?.local || '';

    return {
      [columns.flightId]: Utilities.getUuid(),
      [columns.flightNumber]: flight.number,
      [columns.airline]: flight.airline?.name || '',
      [columns.departureAirport]: flight.departure?.airport?.iata || '',
      [columns.departureDate]: getDatePart_(departureLocal),
      [columns.departureTime]: getTimePart_(departureLocal),
      [columns.arrivalAirport]: flight.arrival?.airport?.iata || '',
      [columns.arrivalDate]: getDatePart_(arrivalLocal),
      [columns.arrivalTime]: getTimePart_(arrivalLocal),
      [columns.arrivalLocation]: buildAirportLocation_(flight.arrival?.airport),
      [columns.description]: buildDescription_(flight),
      [columns.syncStatus]: CONFIG.syncStatuses.needsSync,
      [columns.createdAt]: new Date(),
      [columns.updatedAt]: new Date()
    };
  }

  /**
   * Valideert minimale flightdata.
   *
   * @param {Object} flight Flightdata.
   * @returns {void}
   * @throws {Error} Als verplichte flightdata ontbreekt.
   */
  function validateFlight_(flight) {
    if (!flight?.number) {
      throw new Error('Flight API response mist verplicht veld: number');
    }
  }

  /**
   * Bouwt een locatie-string op basis van airport latitude/longitude.
   *
   * Format: "lat, lon"
   *
   * @param {Object} airport Airportdata uit de flight response.
   * @returns {string} Locatie als "lat, lon" of lege string.
   */
  function buildAirportLocation_(airport) {
    const lat = airport?.location?.lat;
    const lon = airport?.location?.lon;

    if (lat === undefined || lon === undefined) {
      return '';
    }

    return `${lat}, ${lon}`;
  }

  /**
   * Bouwt de flight description voor het sheetrecord.
   *
   * @param {Object} flight Flightdata.
   * @returns {string} Description.
   */
  function buildDescription_(flight) {
    return [
      `Departure Airport: ${flight.departure?.airport?.name || '-'}`,
      `Arrival Airport: ${flight.arrival?.airport?.name || '-'}`,
      ``,
      `Departure Terminal: ${flight.departure?.terminal || '-'}`,
      `Airline: ${flight.airline?.name || '-'}`,
      `Aircraft: ${flight.aircraft?.model || '-'}`,
    ].join('\n');
  }

  /**
   * Haalt het datumdeel uit een lokale datetime-string.
   *
   * @param {string} value Lokale datetime-string.
   * @returns {string} Datumdeel.
   */
  function getDatePart_(value) {
    return value ? value.slice(0, 10) : '';
  }

  /**
   * Haalt het tijddeel uit een lokale datetime-string.
   *
   * @param {string} value Lokale datetime-string.
   * @returns {string} Tijddeel.
   */
  function getTimePart_(value) {
    return value ? value.slice(11, 16) : '';
  }

  return {
    map
  };
})();