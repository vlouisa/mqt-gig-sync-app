function travelFixture_() {
  if (typeof unit === 'undefined') throw new Error('Alleen lokale unit-runner.');
  unit.rows = [{ 'Gig ID': 'gig-1', 'Gig Status': 'CONFIRMED', SyncStatus: 'DRAFT',
    Date: new Date('2026-10-11T12:00:00Z'), Title: 'Concert', Location: 'Venue' }];
  return new Date('2026-09-27T07:00:00Z');
}

function checkTravel_(now) {
  scheduledNotificationService.check(now, [gigTravelBookingsMissingRule]);
}

function testTravelMissingListAndFingerprint() {
  const now = travelFixture_(); checkTravel_(now);
  assertEquals(1, unit.queued.length);
  assertEquals(3, unit.queued[0].payload.missing.length);
  assertEquals('GIG_TRAVEL_BOOKINGS_MISSING', unit.queued[0].event);
  const message = notificationMessageFactory.create(unit.queued[0].event, unit.queued[0].payload);
  assertTrue(message.message.includes('- Heenvlucht'));
  const fingerprint = unit.queued[0].payload.notificationFingerprint;
  unit.travel['hotel-input'] = [{ 'Check-in Date': '2026-10-10', 'Check-out Date': '2026-10-12' }];
  checkTravel_(new Date('2026-10-01T07:00:00Z'));
  assertEquals(2, unit.queued[1].payload.missing.length);
  assertEquals(fingerprint, unit.queued[1].payload.notificationFingerprint);
  unit.rows[0].Date = new Date('2026-10-12T12:00:00Z');
  checkTravel_(new Date('2026-10-01T07:00:00Z'));
  assertNotEquals(fingerprint, unit.queued[2].payload.notificationFingerprint);
}

function testTravelCompleteAndDeletedBookings() {
  const now = travelFixture_();
  unit.travel['flight-input'] = [
    { 'Departure Date': '2026-10-09', 'Arrival Date': '2026-10-10', SyncStatus: 'ERROR' },
    { 'Departure Date': '2026-10-12', 'Arrival Date': '2026-10-13', SyncStatus: 'NEEDS_SYNC' }
  ];
  unit.travel['hotel-input'] = [{ 'Check-in Date': new Date('2026-10-09T12:00:00Z'), 'Check-out Date': '2026-10-12' }];
  checkTravel_(now); assertEquals(0, unit.queued.length);
  unit.travel['flight-input'][0].SyncStatus = 'DELETED';
  unit.travel['flight-input'][1].SyncStatus = 'DELETE_REQUESTED';
  unit.travel['hotel-input'][0]['Check-out Date'] = '2026-10-11';
  checkTravel_(now); assertEquals(3, unit.queued[0].payload.missing.length);
}

function testTravelDateWindowAndEligibility() {
  const now = travelFixture_(); const gig = unit.rows[0];
  unit.rows = [gig, { ...gig, 'Gig Status': 'OPTION' }, { ...gig, 'Gig Status': 'CANCELLED' },
    { ...gig, SyncStatus: 'DELETED' }, { ...gig, SyncStatus: 'DELETE_REQUESTED' },
    { ...gig, Date: new Date('2026-10-12T12:00:00Z') },
    { ...gig, Date: new Date('2026-09-27T12:00:00Z') },
    { ...gig, Date: new Date('2026-09-26T12:00:00Z') },
    { ...gig, 'Gig ID': 'late', Date: new Date('2026-09-28T12:00:00Z') }];
  checkTravel_(new Date('2026-09-27T06:59:00Z')); assertEquals(0, unit.queued.length);
  checkTravel_(now); assertEquals(2, unit.queued.length);
  assertEquals(1, unit.sourceReads['flight-input']);
  assertEquals(1, unit.sourceReads['hotel-input']);
}

function testTravelInvalidSourcesAndConfiguration() {
  const now = travelFixture_();
  unit.flightHeaders = ['Departure Date', 'SyncStatus'];
  checkTravel_(now); assertEquals(0, unit.queued.length); assertEquals(1, unit.errors.length);
  delete unit.flightHeaders;
  unit.travel['flight-input'] = [{ 'Departure Date': '2026-02-30', 'Arrival Date': '2026-10-11' }];
  checkTravel_(now); assertEquals(0, unit.queued.length); assertEquals(2, unit.errors.length);
  unit.travel['flight-input'] = [];
  CONFIG.entities.gig.travelBookings.returnDeparture = { from: 2, to: 1 };
  checkTravel_(now); assertEquals(3, unit.errors.length);
}

function testTravelConfigurableWindowsAndDst() {
  const now = travelFixture_();
  CONFIG.entities.gig.travelBookings.outboundArrival = { from: -2, to: 0 };
  CONFIG.entities.gig.travelBookings.returnDeparture = { from: 0, to: 2 };
  unit.travel['flight-input'] = [{ 'Departure Date': '2026-10-08', 'Arrival Date': '2026-10-09' },
    { 'Departure Date': '2026-10-13', 'Arrival Date': '2026-10-13' }];
  checkTravel_(now); assertEquals(1, unit.queued[0].payload.missing.length);
  for (const [date, today] of [['2026-03-30','2026-03-16'], ['2026-10-26','2026-10-12'], ['2027-01-01','2026-12-18']]) {
    unit.rows[0].Date = new Date(date + 'T12:00:00Z');
    checkTravel_(new Date(today + 'T12:00:00Z'));
  }
  assertEquals(4, unit.queued.length);
}
