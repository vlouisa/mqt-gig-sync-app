/**
 * Test de happy flow van flightToRecordMapper.
 *
 * @returns {void}
 */
function testFlightToRecordMapperHappyFlow() {
  const record = flightToRecordMapper.map(buildFlightMapperTestFlight_());

  assertEquals('HV 6036', record[CONFIG.entities.flight.columns.flightNumber], 'Flight');
  assertEquals('Transavia', record[CONFIG.entities.flight.columns.airline], 'Airline');
  assertEquals('FCO', record[CONFIG.entities.flight.columns.departureAirport], 'Departure Airport');
  assertEquals('RTM', record[CONFIG.entities.flight.columns.arrivalAirport], 'Arrival Airport');
  assertEquals('51.9569, 4.43722', record[CONFIG.entities.flight.columns.arrivalLocation], 'Arrival Location');
  assertEquals('2025-12-20', record[CONFIG.entities.flight.columns.departureDate], 'Departure Date');
  assertEquals('19:25', record[CONFIG.entities.flight.columns.departureTime], 'Departure Time');
  assertEquals('2025-12-20', record[CONFIG.entities.flight.columns.arrivalDate], 'Arrival Date');
  assertEquals('21:50', record[CONFIG.entities.flight.columns.arrivalTime], 'Arrival Time');
  assertEquals(
    [
      'Departure Airport: Rome Leonardo da Vinci–Fiumicino',
      'Arrival Airport: Rotterdam The Hague',
      '',
      'Departure Terminal: 3',
      'Airline: Transavia',      
      'Aircraft: Boeing 737-800',
    ].join('\n'),
    record[CONFIG.entities.flight.columns.description],
    'Description'
  );
  assertEquals(CONFIG.syncStatuses.needsSync, record[CONFIG.entities.flight.columns.syncStatus], 'SyncStatus');

  if (!record[CONFIG.entities.flight.columns.flightId]) {
    throw new Error('Flight ID ontbreekt.');
  }
}

/**
 * Test dat de mapper faalt als flight.number ontbreekt.
 *
 * @returns {void}
 */
function testFlightToRecordMapperMissingNumberThrows() {
  const flight = buildFlightMapperTestFlight_();
  delete flight.number;

  assertThrows(
    () => flightToRecordMapper.map(flight),
    'Flight API response mist verplicht veld: number'
  );
}

/**
 * Test dat lege airport location resulteert in lege Arrival Location.
 *
 * @returns {void}
 */
function testFlightToRecordMapperMissingArrivalLocation() {
  const flight = buildFlightMapperTestFlight_();
  delete flight.arrival.airport.location;

  const record = flightToRecordMapper.map(flight);

  assertEquals(
    '',
    record[CONFIG.entities.flight.columns.arrivalLocation],
    'Arrival Location'
  );
}

/**
 * Bouwt een representatieve AeroDataBox flight response voor mappertests.
 *
 * @returns {Object} Flight response.
 * @private
 */
function buildFlightMapperTestFlight_() {
  return {
    departure: {
      airport: {
        iata: 'FCO',
        name: 'Rome Leonardo da Vinci–Fiumicino',
        location: {
          lat: 41.8045,
          lon: 12.2508
        }
      },
      scheduledTime: {
        local: '2025-12-20 19:25+01:00'
      },
      terminal: '3'
    },
    arrival: {
      airport: {
        iata: 'RTM',
        name: 'Rotterdam The Hague',    
        location: {
          lat: 51.9569,
          lon: 4.43722
        }
      },
      scheduledTime: {
        local: '2025-12-20 21:50+01:00'
      },
      baggageBelt: '1'
    },
    number: 'HV 6036',
    status: 'Arrived',
    aircraft: {
      model: 'Boeing 737-800'
    },
    airline: {
      name: 'Transavia'
    }
  };
}
