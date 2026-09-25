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
  gigOptionExpiryService.check(new Date('2026-09-25T12:00:00Z'));
  assertTrue(unit.errors[4][1].includes('Verplichte kolom ontbreekt:'));
  CONFIG.entities.gig.optionExpiry.notificationTime = '25:00';
  gigOptionExpiryService.check();
  assertTrue(unit.errors[5][1].includes('Ongeldige notificatieregel'));
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
  checkScheduledNotifications();
  assertEquals(0, unit.releases);
  unit.acquired = true;
  const original = scheduledNotificationService.check;
  scheduledNotificationService.check = () => { throw new Error('Controle mislukt'); };
  assertThrows(() => checkScheduledNotifications(), 'Controle mislukt');
  scheduledNotificationService.check = original;
  assertEquals(1, unit.releases);
  unit.triggers = ['unrelated', 'checkGigOptionExpiry', 'checkGigOptionExpiry'];
  installGigOptionExpiryTrigger();
  assertEquals('["unrelated","checkScheduledNotifications"]', JSON.stringify(unit.triggers));
  assertEquals(1, unit.hours);
  installScheduledNotificationTrigger();
  assertEquals(2, unit.triggers.length);
  CONFIG.notifications.schedule.everyHours = 3;
  assertThrows(() => installScheduledNotificationTrigger(), 'Ongeldig controle-interval voor notificaties.');
  assertEquals(2, unit.triggers.length);
  removeScheduledNotificationTriggers();
  assertEquals('["unrelated"]', JSON.stringify(unit.triggers));
}

/** Alleen bevestigde gigs van gisteren; de fingerprint blijft gelijk bij hercontrole/verplaatsing. */
function testInvoiceSelection() {
  const gig = optionGig_({ 'Gig Status': 'CONFIRMED', Date: new Date('2026-09-24T12:00:00Z') });
  unit.rows = [gig, { ...gig, 'Gig Status': 'OPTION', 'Option Expiry Date': '' },
    { ...gig, 'Gig Status': 'CANCELLED' }, { ...gig, SyncStatus: 'DELETED' },
    { ...gig, SyncStatus: 'DELETE_REQUESTED' }, { ...gig, Date: new Date('2026-09-23T12:00:00Z') },
    { ...gig, Date: new Date('2026-09-25T12:00:00Z') }];
  scheduledNotificationService.check(new Date('2026-09-25T06:59:00Z'));
  assertEquals(0, unit.queued.length);
  assertEquals(0, unit.reads);
  scheduledNotificationService.check(new Date('2026-09-25T07:00:00Z'));
  assertEquals(1, unit.queued.length);
  assertEquals(1, unit.reads);
  assertEquals('GIG_INVOICE_NEEDS_TO_BE_SENT', unit.queued[0].event);
  const first = unit.queued[0].payload;
  const message = notificationMessageFactory.create(unit.queued[0].event, first);
  assertEquals('Factuur versturen', message.title);
  assertTrue(message.message.includes('Datum: 24-09-2026'));
  scheduledNotificationService.check(new Date('2026-09-25T21:59:00Z'));
  assertEquals(2, unit.queued.length);
  assertEquals(first.notificationFingerprint, unit.queued[1].payload.notificationFingerprint);
  unit.rows = [gig];
  scheduledNotificationService.check(new Date('2026-09-26T07:00:00Z'));
  assertEquals(2, unit.queued.length); // Geen inhaalactie.
  gig.Date = new Date('2026-09-26T12:00:00Z');
  scheduledNotificationService.check(new Date('2026-09-27T07:00:00Z'));
  assertEquals(first.notificationFingerprint, unit.queued[2].payload.notificationFingerprint);
}

/** Kalenderdagen blijven correct rond jaarwissel en beide DST-overgangen. */
function testInvoiceCalendarBoundaries() {
  for (const [date, now] of [
    ['2025-12-31T23:00:00Z', '2026-01-02T08:00:00Z'],
    ['2026-02-28T12:00:00Z', '2026-03-01T08:00:00Z'],
    ['2026-03-28T23:00:00Z', '2026-03-30T07:00:00Z'],
    ['2026-10-24T22:00:00Z', '2026-10-26T08:00:00Z']
  ]) {
    unit.queued = [];
    unit.rows = [optionGig_({ 'Gig Status': 'CONFIRMED', Date: new Date(date), Start: '23:00', End: '01:00' })];
    scheduledNotificationService.check(new Date(now));
    assertEquals(1, unit.queued.length);
  }
}

/** Een defecte regel, ontbrekende optieheader en ongeldige records blokkeren facturen niet. */
function testScheduledIsolation() {
  const gig = optionGig_({ 'Gig Status': 'CONFIRMED', Date: new Date('2026-09-24T12:00:00Z') });
  unit.headers = unit.headers.filter(header => header !== 'Option Expiry Date');
  unit.rows = [{ ...gig, Date: '2026-09-24' }, { ...gig, Date: new Date(NaN) },
    { ...gig, Date: '' }, { ...gig, 'Gig ID': '' }, { ...gig, 'Gig ID': 'fail' }, gig];
  scheduledNotificationService.check(new Date('2026-09-25T07:00:00Z'));
  assertEquals(5, unit.errors.length);
  assertEquals(1, unit.queued.length);
  const rules = scheduledNotificationRules.getAll();
  rules[0].notificationTime = '25:00';
  scheduledNotificationService.check(new Date('2026-09-25T07:00:00Z'), rules);
  assertEquals(2, unit.queued.length);
}

/** Een derde regel vereist geen aanpassingen aan runner, trigger of berichtfactory. */
function testScheduledExtension() {
  unit.rows = [optionGig_()];
  const rules = scheduledNotificationRules.getAll();
  rules.push({ id: 'example', eventCode: 'EXAMPLE', enabled: true, entity: 'gig',
    notificationTime: '09:00', requiredColumns: ['gigId'],
    evaluate: gig => ({ sourceId: gig['Gig ID'], fingerprintValues: ['once'] }),
    createMessage: () => ({ title: 'Example', message: 'Example message' }) });
  const original = scheduledNotificationRules.getAll;
  scheduledNotificationRules.getAll = () => rules;
  try {
    scheduledNotificationService.check(new Date('2026-09-25T07:00:00Z'));
    assertEquals(2, unit.queued.length);
    assertEquals(1, unit.reads);
    assertEquals('Example', notificationMessageFactory.create('EXAMPLE', {}).title);
    rules[2].enabled = false;
    scheduledNotificationService.check(new Date('2026-09-25T07:00:00Z'));
    assertEquals(3, unit.queued.length);
  } finally {
    scheduledNotificationRules.getAll = original;
  }
}
