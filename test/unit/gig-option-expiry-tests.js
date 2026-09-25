/** Tests uitsluitend via de lokale runner; geen Google-services. */
function optionGig_(overrides = {}) {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  return Object.assign({ 'Gig ID': 'G-1', 'Gig Status': 'OPTION', SyncStatus: 'DRAFT',
    Title: 'Show', Date: new Date('2026-10-10T12:00:00Z'), Location: 'Venue',
    'Option Expiry Date': new Date('2026-09-24T22:00:00Z') }, overrides);
}

/** De grens is 09:00 lokaal, niet UTC; alleen vandaag telt. */
function testOptionExpirySelection() {
  unit.rows = [optionGig_(), optionGig_({ 'Gig Status': 'CONFIRMED' }),
    optionGig_({ 'Gig Status': 'CANCELLED' }), optionGig_({ SyncStatus: 'DELETED' }),
    optionGig_({ SyncStatus: 'DELETE_REQUESTED' }), optionGig_({ 'Option Expiry Date': '' }),
    optionGig_({ 'Option Expiry Date': new Date('2026-09-24T12:00:00Z') }),
    optionGig_({ 'Option Expiry Date': new Date('2026-09-26T12:00:00Z') })];
  gigOptionExpiryService.check(new Date('2026-09-25T06:59:00Z'));
  assertEquals(0, unit.queued.length);
  gigOptionExpiryService.check(new Date('2026-09-25T07:00:00Z'));
  assertEquals(1, unit.queued.length);
  assertEquals('GIG_OPTION_EXPIRES_TODAY', unit.queued[0].event);
  assertEquals('["2026-09-25"]', unit.queued[0].payload.notificationFingerprint);
  gigOptionExpiryService.check(new Date('2026-09-25T21:59:00Z'));
  assertEquals(2, unit.queued.length);
  assertEquals(unit.queued[0].payload.notificationFingerprint, unit.queued[1].payload.notificationFingerprint);
}

/** Onjuiste datums, ontbrekend ID en publisherfouten stoppen andere opties niet. */
function testOptionExpiryErrors() {
  unit.rows = [optionGig_({ 'Option Expiry Date': '2026-09-25' }),
    optionGig_({ 'Option Expiry Date': new Date(NaN) }), optionGig_({ 'Gig ID': '' }),
    optionGig_({ 'Gig ID': 'fail' }), optionGig_({ SyncStatus: 'ERROR' })];
  gigOptionExpiryService.check(new Date('2026-09-25T12:00:00Z'));
  assertEquals(4, unit.errors.length);
  assertEquals(1, unit.queued.length);
  unit.headers = [];
  assertThrows(() => gigOptionExpiryService.check(new Date('2026-09-25T12:00:00Z')), 'Verplichte kolom ontbreekt: Option Expiry Date');
  CONFIG.entities.gig.optionExpiry.notificationTime = '25:00';
  assertThrows(() => gigOptionExpiryService.check(), 'Ongeldig meldtijdstip voor gigopties; gebruik HH:mm.');
}

/** Tijdstip is configureerbaar en wintertijd wordt lokaal beoordeeld. */
function testOptionExpiryTimeAndExtension() {
  CONFIG.entities.gig.optionExpiry.notificationTime = '10:15';
  unit.rows = [optionGig_({ 'Option Expiry Date': new Date('2026-12-01T23:00:00Z') })];
  gigOptionExpiryService.check(new Date('2026-12-02T09:14:00Z'));
  assertEquals(0, unit.queued.length);
  gigOptionExpiryService.check(new Date('2026-12-02T09:15:00Z'));
  unit.rows[0]['Option Expiry Date'] = new Date('2026-12-02T23:00:00Z');
  gigOptionExpiryService.check(new Date('2026-12-02T10:00:00Z'));
  assertEquals(1, unit.queued.length);
  gigOptionExpiryService.check(new Date('2026-12-03T09:15:00Z'));
  assertEquals(2, unit.queued.length);
  assertTrue(unit.queued[0].payload.notificationFingerprint !== unit.queued[1].payload.notificationFingerprint);
}

/** Nieuwe template toont de juiste lokale vervaldatum. */
function testOptionExpiryMessage() {
  unit.rows = [optionGig_()];
  gigOptionExpiryService.check(new Date('2026-09-25T12:00:00Z'));
  const message = notificationMessageFactory.create(unit.queued[0].event, unit.queued[0].payload);
  assertEquals('Gigoptie verloopt vandaag', message.title);
  assertEquals('De optie voor deze gig verloopt vandaag.\n\nTitel: Show\nDatum: 10-10-2026\nLocatie: Venue\nVervaldatum: 25-09-2026', message.message);
}

/** Lockvrijgave bij fouten en uitsluitend eigen triggers vervangen. */
function testOptionExpiryTrigger() {
  unit.acquired = false;
  checkGigOptionExpiry();
  assertEquals(0, unit.releases);
  unit.acquired = true;
  CONFIG.entities.gig.optionExpiry.notificationTime = 'invalid';
  assertThrows(() => checkGigOptionExpiry(), 'Ongeldig meldtijdstip voor gigopties; gebruik HH:mm.');
  assertEquals(1, unit.releases);
  unit.triggers = ['unrelated', 'checkGigOptionExpiry', 'checkGigOptionExpiry'];
  installGigOptionExpiryTrigger();
  assertEquals('["unrelated","checkGigOptionExpiry"]', JSON.stringify(unit.triggers));
  assertEquals(5, unit.minutes);
  CONFIG.entities.gig.optionExpiry.everyMinutes = 2;
  assertThrows(() => installGigOptionExpiryTrigger(), 'Ongeldig controle-interval voor gigopties.');
  assertEquals(2, unit.triggers.length);
  removeGigOptionExpiryTriggers();
  assertEquals('["unrelated"]', JSON.stringify(unit.triggers));
}
