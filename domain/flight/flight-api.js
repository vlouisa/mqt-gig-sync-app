const flightApi = (() => {
  const FLIGHT_CACHE_SHEET_NAME = "flight-cache";

  const AERODATABOX_CONFIG = {
    baseUrl: "https://aerodatabox.p.rapidapi.com",
    rapidApiHost: "aerodatabox.p.rapidapi.com",
    dateLocalRole: "Departure"
  };

  function getFlightByNumberAndDate(flightNumber, departureDate) {
    const log = logService.forModule('flight-import-service');
    const normalizedFlightNumber = normalizeFlightNumber_(flightNumber);
    const normalizedDate = normalizeDate_(departureDate);
    const cacheKey = buildFlightCacheKey_(normalizedFlightNumber, normalizedDate);

    const cacheSheet = getOrCreateFlightCacheSheet_();

    const cached = findFlightInCache_(cacheSheet, cacheKey);
    if (cached) {
      log.info('flight-fetched', `Flight succesvol opgehaald vanuit cache`, `Flight '${normalizedFlightNumber}'`);
      return JSON.parse(cached.rawJson);
    }

    log.info('flight-search', `look for flight '${normalizedFlightNumber}' using API call.`, ``);
    const apiResponse = fetchFlightFromAeroDataBox_(normalizedFlightNumber, normalizedDate);

    saveFlightToCache_(cacheSheet, {
      cacheKey,
      flightNumber: normalizedFlightNumber,
      departureDate: normalizedDate,
      rawJson: JSON.stringify(apiResponse),
      fetchedAtUtc: new Date().toISOString()
    });

    log.info('flight-fetched', `Flight succesvol opgehaald via API`, `Flight '${normalizedFlightNumber}'`);
    return apiResponse;
  }

  function fetchFlightFromAeroDataBox_(flightNumber, departureDate) {
    const apiKey = PropertiesService
      .getScriptProperties()
      .getProperty("AERODATABOX_API_KEY");

    if (!apiKey) {
      throw new Error(
        "AERODATABOX_API_KEY ontbreekt. Zet je API key in Apps Script > Project Settings > Script Properties."
      );
    }

    const encodedFlightNumber = encodeURIComponent(flightNumber);

    const url =
      `${AERODATABOX_CONFIG.baseUrl}/flights/Number/${encodedFlightNumber}` +
      `/${departureDate}/${departureDate}` +
      `?dateLocalRole=${encodeURIComponent(AERODATABOX_CONFIG.dateLocalRole)}`;

    const response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true,
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": AERODATABOX_CONFIG.rapidApiHost
      }
    });

    const statusCode = response.getResponseCode();
    const body = response.getContentText();

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`AeroDataBox API error ${statusCode}: ${body}`);
    }

    return JSON.parse(body);
  }

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

  function saveFlightToCache_(sheet, cacheEntry) {
    const parsed = JSON.parse(cacheEntry.rawJson);
    const firstFlight = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : {};
    const flattened = flattenFlightForCache_(firstFlight);

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

  function getOrCreateFlightCacheSheet_() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(FLIGHT_CACHE_SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(FLIGHT_CACHE_SHEET_NAME);

      sheet.appendRow([
        "cache_key",
        "flight_number",
        "departure_date",
        "departure_airport_iata",
        "departure_airport_location",
        "arrival_airport_iata",
        "arrival_airport_location",
        "departure_scheduled_local",
        "arrival_scheduled_local",
        "status",
        "airline",
        "raw_json",
        "fetched_at_utc"
      ]);

      sheet.setFrozenRows(1);
      sheet.hideSheet();
    }

    return sheet;
  }

  function flattenFlightForCache_(flight) {
    return {
      departureAirportIata: getNested_(flight, "departure.airport.iata"),
      departureAirportLocation: `${getNested_(flight, "departure.airport.location.lat")}, ${getNested_(flight, "departure.airport.location.lon")}`,
      arrivalAirportIata: getNested_(flight, "arrival.airport.iata"),
      arrivalAirportLocation: `${getNested_(flight, "arrival.airport.location.lat")}, ${getNested_(flight, "arrival.airport.location.lon")}`,
      departureScheduledLocal: getNested_(flight, "departure.scheduledTime.local"),
      arrivalScheduledLocal: getNested_(flight, "arrival.scheduledTime.local"),
      status: flight.status || "",
      airlineName: getNested_(flight, "airline.name")
    };
  }

  function normalizeFlightNumber_(flightNumber) {
    if (!flightNumber) {
      throw new Error("Vluchtnummer is verplicht.");
    }

    return String(flightNumber)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function normalizeDate_(value) {
    if (!value) {
      throw new Error("Vertrekdatum is verplicht.");
    }

    if (Object.prototype.toString.call(value) === "[object Date]") {
      return Utilities.formatDate(
        value,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
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

  function buildFlightCacheKey_(flightNumber, departureDate) {
    return `${flightNumber}|${departureDate}`;
  }

  function getNested_(obj, path) {
    return path.split(".").reduce((current, key) => {
      if (current && Object.prototype.hasOwnProperty.call(current, key)) {
        return current[key];
      }
      return "";
    }, obj);
  }

  return {
    getFlightByNumberAndDate
  };
})();