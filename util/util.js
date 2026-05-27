function getColumnIndexMapCaches() {
  const gigMap = sheetService.getColumnIndexMapCached(CONFIG.entities.gig.sheetName);
  const flightMap = sheetService.getColumnIndexMapCached(CONFIG.entities.flight.sheetName);
  const hotelMap = sheetService.getColumnIndexMapCached(CONFIG.entities.hotel.sheetName);

  console.log('Gig column map:', JSON.stringify(gigMap, null, 2));
  console.log('Flight column map:', JSON.stringify(flightMap, null, 2));
  console.log('Hotel column map:', JSON.stringify(hotelMap, null, 2));
}

function showCachedColumns() {
    const cache = CacheService.getScriptCache();
  
    const gigMap = cache.get("column-map-gig-input");
    const flightMap = cache.get("column-map-flight-input");
    const hotelMap = cache.get("column-map-hotel-input");

    console.log('Gig column map:',gigMap);
    console.log('Flight column map:', flightMap);
    console.log('Hotel column map:', hotelMap);

}
function clearAllColumnIndexMapCaches() {
  sheetService.clearColumnIndexMapCache(CONFIG.entities.gig.sheetName);
  sheetService.clearColumnIndexMapCache(CONFIG.entities.flight.sheetName);
  sheetService.clearColumnIndexMapCache(CONFIG.entities.hotel.sheetName);
}

/**
 * Formatteert een datum naar dd-MM-yyyy.
 *
 * @param {Date|string} value Datumwaarde.
 * @returns {string} Geformatteerde datum.
 */
function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date
    ? value
    : new Date(value);

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'dd-MM-yyyy'
  );
}


/**
 * Formatteert een datum-tijd naar hh:mm.
 *
 * @param {Date|string} value DatumTijdwaarde.
 * @returns {string} Geformatteerde tijd.
 */
function formatTime(value) {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date
    ? value
    : new Date(value);

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'hh:mm'
  );
}
