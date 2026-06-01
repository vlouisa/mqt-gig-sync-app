/**
 * API-service voor het ophalen van flight-data via AeroDataBox.
 *
 * Ondersteunt:
 * - lookup op vluchtnummer + vertrekdatum;
 * - lookup op route + vertrekdatum/tijd;
 * - caching in het verborgen flight-cache tabblad.
 */
const flightApi = (() => {
  const MODULE_NAME = 'flight-import-service';
  const FLIGHT_CACHE_SHEET_NAME = 'flight-cache';

  const AERODATABOX_CONFIG = {
    baseUrl: 'https://aerodatabox.p.rapidapi.com',
    rapidApiHost: 'aerodatabox.p.rapidapi.com',
    dateLocalRole: 'Departure',

    // Zeer klein zoekvenster omdat de parser een exacte vertrektijd uit de mail haalt.
    // Verhoog naar 5, 10 of 20 minuten als andere airlines minder exacte tijden leveren.
    routeTimeWindowMinutes: 1
  };

  /**
   * Haalt de logger voor deze service op.
   *
   * @returns {Object} Logger.
   */
  function getLog_() {
    return logService.forModule(MODULE_NAME);
  }

  /**
   * Haalt een vlucht op basis van vluchtnummer en vertrekdatum op.
   *
   * @param {string} flightNumber Vluchtnummer, bijvoorbeeld HV6036.
   * @param {Date|string} departureDate Vertrekdatum als Date of yyyy-MM-dd.
   * @returns {Object[]} AeroDataBox flight response.
   */
  function getFlightByNumberAndDate(flightNumber, departureDate) {
    const log = getLog_();
    const normalizedFlightNumber = normalizeFlightNumber_(flightNumber);
    const normalizedDate = normalizeDate_(departureDate);
    const cacheKey = buildFlightCacheKey_(normalizedFlightNumber, normalizedDate);

    const cacheSheet = getOrCreateFlightCacheSheet_();
    const cached = findFlightInCache_(cacheSheet, cacheKey);

    if (cached) {
      log.info(
        'flight-fetched',
        'Flight succesvol opgehaald vanuit cache.',
        `Flight '${normalizedFlightNumber}'`
      );

      return JSON.parse(cached.rawJson);
    }

    log.info(
      'flight-search',
      `Look for flight '${normalizedFlightNumber}' using API call.`,
      ''
    );

    const apiResponse = fetchFlightFromAeroDataBox_(
      normalizedFlightNumber,
      normalizedDate
    );

    saveFlightToCache_(cacheSheet, {
      cacheKey,
      flightNumber: normalizedFlightNumber,
      departureDate: normalizedDate,
      rawJson: JSON.stringify(apiResponse),
      fetchedAtUtc: new Date().toISOString()
    });

    log.info(
      'flight-fetched',
      'Flight succesvol opgehaald via API.',
      `Flight '${normalizedFlightNumber}'`
    );

    return apiResponse;
  }

  /**
   * Zoekt vluchten op basis van route en vertrektijd.
   *
   * De API haalt departures op vanaf de vertrekluchthaven binnen een tijdvenster.
   * Daarna wordt lokaal gefilterd op bestemming en vertrektijd.
   *
   * @param {Object} search Route/time zoekopdracht.
   * @param {string} search.departureAirport Vertrek IATA-code.
   * @param {string} search.arrivalAirport Aankomst IATA-code.
   * @param {Date|string} search.departureDate Vertrekdatum als Date of yyyy-MM-dd.
   * @param {string} search.departureTime Vertrektijd in HH:mm.
   * @returns {Object[]} Gefilterde AeroDataBox flight candidates.
   */
  function getFlightsByRouteAndTime(search) {
    const log = getLog_();
    const normalizedSearch = normalizeRouteTimeSearch_(search);
    const cacheKey = buildRouteTimeCacheKey_(normalizedSearch);

    const cacheSheet = getOrCreateFlightCacheSheet_();
    const cached = findFlightInCache_(cacheSheet, cacheKey);

    if (cached) {
      log.info(
        'flight-route-time-fetched',
        'Route/time flights succesvol opgehaald vanuit cache.',
        cacheKey
      );

      return JSON.parse(cached.rawJson);
    }

    log.info(
      'flight-route-time-search',
      'Zoek flight candidates via route/tijd.',
      `${normalizedSearch.departureAirport} → ${normalizedSearch.arrivalAirport}, ${normalizedSearch.departureDate} ${normalizedSearch.departureTime}`
    );

    const apiResponse = fetchDeparturesFromAeroDataBox_(normalizedSearch);
    const candidates = filterFlightsByRouteAndTime_(
      apiResponse,
      normalizedSearch
    );

    log.info(
      'flight-route-time-candidates-filtered',
      'Route/time candidates gefilterd.',
      `Candidates: ${candidates.length}`
    );

    saveFlightToCache_(cacheSheet, {
      cacheKey,
      flightNumber: candidates[0] ? normalizeFlightNumber_(candidates[0].number) : '',
      departureAirport: normalizedSearch.departureAirport,
      departureDate: normalizedSearch.departureDate,
      rawJson: JSON.stringify(candidates),
      fetchedAtUtc: new Date().toISOString()
    });

    log.info(
      'flight-route-time-fetched',
      'Route/time flight candidates succesvol opgehaald via API.',
      `Candidates: ${candidates.length}`
    );

    return candidates;
  }

  /**
   * Haalt een vlucht op bij AeroDataBox op basis van vluchtnummer.
   *
   * @param {string} flightNumber Genormaliseerd vluchtnummer.
   * @param {string} departureDate Vertrekdatum yyyy-MM-dd.
   * @returns {Object[]} AeroDataBox response.
   */
  function fetchFlightFromAeroDataBox_(flightNumber, departureDate) {
    const apiKey = getAeroDataBoxApiKey_();
    const encodedFlightNumber = encodeURIComponent(flightNumber);

    const url =
      `${AERODATABOX_CONFIG.baseUrl}/flights/Number/${encodedFlightNumber}` +
      `/${departureDate}/${departureDate}` +
      `?dateLocalRole=${encodeURIComponent(AERODATABOX_CONFIG.dateLocalRole)}`;

    return fetchJsonFromAeroDataBox_(url, apiKey);
  }

  /**
   * Haalt departures op bij AeroDataBox voor een vertrek-airport en tijdvenster.
   *
   * @param {{departureAirport: string, departureDate: string, departureTime: string}} search Genormaliseerde zoekdata.
   * @returns {Object|Object[]} AeroDataBox response.
   */
  function fetchDeparturesFromAeroDataBox_(search) {
    const apiKey = getAeroDataBoxApiKey_();

    const fromLocal = buildLocalDateTime_(
      search.departureDate,
      search.departureTime,
      -AERODATABOX_CONFIG.routeTimeWindowMinutes
    );

    const toLocal = buildLocalDateTime_(
      search.departureDate,
      search.departureTime,
      AERODATABOX_CONFIG.routeTimeWindowMinutes
    );

    getLog_().info(
      'flight-route-time-window',
      'AeroDataBox route/time zoekvenster.',
      `${fromLocal} → ${toLocal}`
    );

    const url =
      `${AERODATABOX_CONFIG.baseUrl}/flights/airports/iata/${encodeURIComponent(search.departureAirport)}` +
      `/${encodeURIComponent(fromLocal)}/${encodeURIComponent(toLocal)}` +
      '?direction=Departure&withCancelled=false&withCodeshared=false&withCargo=false&withPrivate=false';

    return fetchJsonFromAeroDataBox_(url, apiKey);
  }

  /**
   * Voert een GET request uit naar AeroDataBox en parseert JSON.
   *
   * @param {string} url API URL.
   * @param {string} apiKey RapidAPI key.
   * @returns {*} JSON response.
   */
  function fetchJsonFromAeroDataBox_(url, apiKey) {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': AERODATABOX_CONFIG.rapidApiHost
      }
    });

    const statusCode = response.getResponseCode();
    const body = response.getContentText();

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`AeroDataBox API error ${statusCode}: ${body}`);
    }

    return JSON.parse(body);
  }

  /**
   * Haalt de AeroDataBox API key op uit Script Properties.
   *
   * @throws {Error} Als de API key ontbreekt.
   * @returns {string} API key.
   */
  function getAeroDataBoxApiKey_() {
    const apiKey = PropertiesService
      .getScriptProperties()
      .getProperty('AERODATABOX_API_KEY');

    if (!apiKey) {
      throw new Error(
        'AERODATABOX_API_KEY ontbreekt. Zet je API key in Apps Script > Project Settings > Script Properties.'
      );
    }

    return apiKey;
  }

  /**
   * Zoekt een cache-entry op basis van cache-key.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Cache sheet.
   * @param {string} cacheKey Cache key.
   * @returns {{rawJson: string}|null} Cache resultaat of null.
   */
  function findFlightInCache_(sheet, cacheKey) {
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return null;
    }

    const values = sheet
      .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
      .getValues();

    for (const row of values) {
      if (row[0] === cacheKey) {
        return {
          rawJson: row[11]
        };
      }
    }

    return null;
  }

  /**
   * Slaat een flight response op in de cache.
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Cache sheet.
   * @param {Object} cacheEntry Cache-entry.
   * @param {string} cacheEntry.cacheKey Cache key.
   * @param {string} cacheEntry.flightNumber Vluchtnummer.
   * @param {string} [cacheEntry.departureAirport] Vertrek IATA-code bij route/time lookup.
   * @param {string} cacheEntry.departureDate Vertrekdatum yyyy-MM-dd.
   * @param {string} cacheEntry.rawJson Raw JSON.
   * @param {string} cacheEntry.fetchedAtUtc Fetch timestamp.
   * @returns {void}
   */
  function saveFlightToCache_(sheet, cacheEntry) {
    const parsed = JSON.parse(cacheEntry.rawJson);
    const firstFlight = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : {};
    const flattened = flattenFlightForCache_(
      firstFlight,
      cacheEntry.departureAirport
    );

    sheet.appendRow([
      cacheEntry.cacheKey,
      cacheEntry.flightNumber,
      cacheEntry.departureDate,
      flattened.departureAirportIata,
      flattened.departureAirportLocation,
      flattened.arrivalAirportIata,
      flattened.arrivalAirportLocation,
      flattened.departureScheduledLocal,
      flattened.arrivalScheduledLocal,
      flattened.status,
      flattened.airlineName,
      cacheEntry.rawJson,
      cacheEntry.fetchedAtUtc
    ]);
  }

  /**
   * Haalt de cache sheet op of maakt deze aan.
   *
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} Cache sheet.
   */
  function getOrCreateFlightCacheSheet_() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(FLIGHT_CACHE_SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(FLIGHT_CACHE_SHEET_NAME);

      sheet.appendRow([
        'cacheKey',
        'flightNumber',
        'departureDate',
        'departureAirportIata',
        'departureAirportLocation',
        'arrivalAirportIata',
        'arrivalAirportLocation',
        'departureScheduledLocal',
        'arrivalScheduledLocal',
        'status',
        'airlineName',
        'rawJson',
        'fetchedAtUtc'
      ]);

      sheet.setFrozenRows(1);
      sheet.hideSheet();
    }

    return sheet;
  }

  /**
   * Maakt cache-velden van een AeroDataBox flight.
   *
   * Ondersteunt zowel:
   * - flight-number lookup responses;
   * - airport departure route/time responses.
   *
   * @param {Object} flight AeroDataBox flight.
   * @param {string} [departureAirport] Vertrek IATA-code uit de route/time zoekopdracht.
   * @returns {Object} Platte cachevelden.
   */
  function flattenFlightForCache_(flight, departureAirport) {
    const departureIata =
      getNested_(flight, 'departure.airport.iata') ||
      departureAirport ||
      '';

    const arrivalIata =
      getNested_(flight, 'arrival.airport.iata') ||
      getNested_(flight, 'movement.airport.iata') ||
      '';

    const departureScheduledLocal =
      getNested_(flight, 'departure.scheduledTime.local') ||
      getNested_(flight, 'movement.scheduledTime.local') ||
      '';

    return {
      departureAirportIata: departureIata,
      departureAirportLocation: buildLocationString_(
        getNested_(flight, 'departure.airport.location.lat'),
        getNested_(flight, 'departure.airport.location.lon')
      ),
      arrivalAirportIata: arrivalIata,
      arrivalAirportLocation: buildLocationString_(
        getNested_(flight, 'arrival.airport.location.lat'),
        getNested_(flight, 'arrival.airport.location.lon')
      ),
      departureScheduledLocal,
      arrivalScheduledLocal: getNested_(flight, 'arrival.scheduledTime.local'),
      status: flight.status || '',
      airlineName: getNested_(flight, 'airline.name')
    };
  }

  /**
   * Bouwt een locatie-string uit latitude/longitude.
   *
   * @param {*} lat Latitude.
   * @param {*} lon Longitude.
   * @returns {string} Locatie-string of leeg.
   */
  function buildLocationString_(lat, lon) {
    if (!lat || !lon) {
      return '';
    }

    return `${lat}, ${lon}`;
  }

  /**
   * Normaliseert een route/time zoekopdracht.
   *
   * @param {Object} search Route/time zoekopdracht.
   * @returns {{departureAirport: string, arrivalAirport: string, departureDate: string, departureTime: string}}
   */
  function normalizeRouteTimeSearch_(search) {
    return {
      departureAirport: normalizeAirportCode_(search.departureAirport, 'Vertrekluchthaven'),
      arrivalAirport: normalizeAirportCode_(search.arrivalAirport, 'Aankomstluchthaven'),
      departureDate: normalizeDate_(search.departureDate),
      departureTime: normalizeTime_(search.departureTime)
    };
  }

  /**
   * Normaliseert een vluchtnummer.
   *
   * @param {*} flightNumber Vluchtnummer.
   * @throws {Error} Als vluchtnummer ontbreekt.
   * @returns {string} Genormaliseerd vluchtnummer.
   */
  function normalizeFlightNumber_(flightNumber) {
    if (!flightNumber) {
      throw new Error('Vluchtnummer is verplicht.');
    }

    return String(flightNumber)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  /**
   * Normaliseert een datumwaarde naar yyyy-MM-dd.
   *
   * @param {*} value Datumwaarde.
   * @throws {Error} Als de datum ontbreekt of ongeldig is.
   * @returns {string} Datum in yyyy-MM-dd formaat.
   */
  function normalizeDate_(value) {
    if (!value) {
      throw new Error('Vertrekdatum is verplicht.');
    }

    if (Object.prototype.toString.call(value) === '[object Date]') {
      return Utilities.formatDate(
        value,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd'
      );
    }

    const str = String(value).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      throw new Error(
        `Ongeldige datum "${str}". Gebruik formaat YYYY-MM-DD, bijvoorbeeld 2025-12-20.`
      );
    }

    return str;
  }

  /**
   * Normaliseert een tijdwaarde naar HH:mm.
   *
   * @param {*} value Tijdwaarde.
   * @throws {Error} Als de tijd ontbreekt of ongeldig is.
   * @returns {string} Tijd in HH:mm formaat.
   */
  function normalizeTime_(value) {
    if (!value) {
      throw new Error('Vertrektijd is verplicht.');
    }

    const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);

    if (!match) {
      throw new Error(`Ongeldige tijd "${value}". Gebruik formaat HH:mm.`);
    }

    return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  }

  /**
   * Normaliseert een IATA airport code.
   *
   * @param {*} value Airportwaarde.
   * @param {string} fieldName Naam van het veld voor foutmeldingen.
   * @throws {Error} Als de IATA-code ontbreekt of ongeldig is.
   * @returns {string} IATA-code.
   */
  function normalizeAirportCode_(value, fieldName) {
    const airportCode = String(value || '').trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(airportCode)) {
      throw new Error(`${fieldName} moet een geldige IATA-code zijn.`);
    }

    return airportCode;
  }

  /**
   * Bouwt een cache-key voor vluchtnummer lookup.
   *
   * @param {string} flightNumber Vluchtnummer.
   * @param {string} departureDate Vertrekdatum.
   * @returns {string} Cache key.
   */
  function buildFlightCacheKey_(flightNumber, departureDate) {
    return `${flightNumber}|${departureDate}`;
  }

  /**
   * Bouwt een cache-key voor route/time lookup.
   *
   * @param {{departureAirport: string, arrivalAirport: string, departureDate: string, departureTime: string}} search Zoekdata.
   * @returns {string} Cache key.
   */
  function buildRouteTimeCacheKey_(search) {
    return [
      'ROUTE_TIME',
      search.departureAirport,
      search.arrivalAirport,
      search.departureDate,
      search.departureTime
    ].join('|');
  }

  /**
   * Bouwt een lokale datetime-string met minuten-offset zonder timezone-conversie.
   *
   * AeroDataBox airport endpoints verwachten lokale airport datetime strings.
   * Daarom gebruiken we hier geen Session.getScriptTimeZone().
   *
   * @param {string} date Datum yyyy-MM-dd.
   * @param {string} time Tijd HH:mm.
   * @param {number} offsetMinutes Offset in minuten.
   * @returns {string} Lokale datetime zonder timezone.
   */
  function buildLocalDateTime_(date, time, offsetMinutes) {
    const dateParts = date.split('-');
    const timeParts = time.split(':');

    const base = new Date(
      Number(dateParts[0]),
      Number(dateParts[1]) - 1,
      Number(dateParts[2]),
      Number(timeParts[0]),
      Number(timeParts[1]),
      0
    );

    base.setMinutes(base.getMinutes() + offsetMinutes);

    return [
      base.getFullYear(),
      String(base.getMonth() + 1).padStart(2, '0'),
      String(base.getDate()).padStart(2, '0')
    ].join('-') + 'T' + [
      String(base.getHours()).padStart(2, '0'),
      String(base.getMinutes()).padStart(2, '0')
    ].join(':');
  }

  /**
   * Filtert AeroDataBox departures op bestemming en tijd.
   *
   * @param {Object|Object[]} apiResponse AeroDataBox airport response.
   * @param {{arrivalAirport: string, departureDate: string, departureTime: string}} search Zoekdata.
   * @returns {Object[]} Gefilterde flight candidates.
   */
  function filterFlightsByRouteAndTime_(apiResponse, search) {
    const flights = extractFlightsFromAirportResponse_(apiResponse);

    return flights.filter(flight => {
      const destinationIata = getNested_(flight, 'movement.airport.iata');
      const scheduledLocal = getNested_(flight, 'movement.scheduledTime.local');

      return (
        String(destinationIata).toUpperCase() === search.arrivalAirport &&
        isWithinTimeWindow_(
          scheduledLocal,
          search.departureDate,
          search.departureTime,
          AERODATABOX_CONFIG.routeTimeWindowMinutes
        )
      );
    });
  }

  /**
   * Haalt flights uit verschillende mogelijke AeroDataBox airport response-structuren.
   *
   * @param {Object|Object[]} apiResponse AeroDataBox response.
   * @returns {Object[]} Flights.
   */
  function extractFlightsFromAirportResponse_(apiResponse) {
    if (Array.isArray(apiResponse)) {
      return apiResponse;
    }

    if (Array.isArray(apiResponse.departures)) {
      return apiResponse.departures;
    }

    if (Array.isArray(apiResponse.flights)) {
      return apiResponse.flights;
    }

    if (apiResponse.departures && Array.isArray(apiResponse.departures.items)) {
      return apiResponse.departures.items;
    }

    return [];
  }

  /**
   * Controleert of een scheduled local datetime binnen het tijdvenster valt.
   *
   * @param {string} scheduledLocal AeroDataBox local datetime.
   * @param {string} date Verwachte datum.
   * @param {string} time Verwachte tijd.
   * @param {number} maxMinutes Maximaal verschil in minuten.
   * @returns {boolean} True als de tijd matcht.
   */
  function isWithinTimeWindow_(scheduledLocal, date, time, maxMinutes) {
    if (!scheduledLocal) {
      return false;
    }

    const actualValue = String(scheduledLocal).replace(' ', 'T');
    const actual = new Date(actualValue);
    const expected = new Date(`${date}T${time}:00`);

    if (isNaN(actual.getTime()) || isNaN(expected.getTime())) {
      return false;
    }

    const diffMinutes = Math.abs(actual.getTime() - expected.getTime()) / 60000;

    return diffMinutes <= maxMinutes;
  }

  /**
   * Haalt een geneste property uit een object.
   *
   * @param {Object} obj Object.
   * @param {string} path Dot-notatie pad.
   * @returns {*} Waarde of lege string.
   */
  function getNested_(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (current && Object.prototype.hasOwnProperty.call(current, key)) {
        return current[key];
      }

      return '';
    }, obj);
  }

  return {
    getFlightByNumberAndDate,
    getFlightsByRouteAndTime
  };
})();