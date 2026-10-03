/** Lokale regressies met echte website-services en in-memory Google/HTTP-mocks. */
function websiteFixture_() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
  const gc = CONFIG.entities.gig.columns;
  const gig = {
    'Gig ID': 'G-1', 'Gig Status': 'CONFIRMED', SyncStatus: 'DRAFT', Title: 'Concert',
    Date: new Date('2099-12-31T12:00:00Z'), Start: '20:30', Venue: 'Zaal', City: 'Stad',
    Country: 'NL', Address: 'Straat 1', Zip: '0012 AB', 'Contact Email': 'public@example.invalid',
    'Contact Website': 'https://example.invalid', 'Contact Name': 'Private name', 'Contact Phone': '001234'
  };
  const headers = Object.values(gc);
  const sheet = unit.makeSheet(CONFIG.entities.gig.sheetName, [headers]);
  unit.addGig = changes => {
    const record = { ...gig, ...changes };
    sheet.values.push(headers.map(header => record[header] ?? ''));
  };
  unit.addGig({});
  return { gig, sheet, c: CONFIG.websitePublications.columns, states: CONFIG.websitePublications.statuses };
}

function websiteReady_() {
  const fixture = websiteFixture_();
  syncWebsitePublications();
  unit.select(CONFIG.websitePublications.sheetName, 2);
  return fixture;
}

function testWebsiteSnapshotSelectionAndIdentity() {
  const { sheet, c } = websiteFixture_();
  unit.addGig({ 'Gig ID': 'G-2' }); // Zelfde titel/datum, andere identiteit.
  unit.addGig({ 'Gig ID': 'G-3', 'Gig Status': 'OPTION' });
  unit.addGig({ 'Gig ID': 'G-4', 'Gig Status': 'CANCELLED' });
  unit.addGig({ 'Gig ID': 'G-5', SyncStatus: 'DELETED' });
  unit.addGig({ 'Gig ID': 'G-6', SyncStatus: 'DELETE_REQUESTED' });
  unit.addGig({ 'Gig ID': 'G-7', Date: new Date('2026-09-26T12:00:00Z') });
  unit.addGig({ 'Gig ID': 'G-8', Date: 'invalid' });
  unit.addGig({ 'Gig ID': 'G-9', Date: new Date('2026-09-26T22:00:00Z') }); // Vandaag lokaal.
  unit.addGig({ 'Gig ID': 'G-10', Date: '' });
  assertEquals(3, websitePublicationSyncService.sync(unit.time));
  const rows = websitePublicationSheetService.getRows();
  assertEquals('READY', rows[0][c.status]);
  assertEquals('NL', rows[0][c.country]);
  assertEquals('0012 AB', rows[0][c.zip]);
  assertEquals('', rows[0][c.price]);
  assertEquals(3, rows.length);
  assertEquals(0, websitePublicationSyncService.sync(unit.time));
  assertEquals(0, unit.requests.length);
  assertEquals('DRAFT', sheet.values[1][sheet.values[0].indexOf('SyncStatus')]);
}

function testWebsiteSnapshotPreservedAndNewId() {
  const { sheet, c } = websiteFixture_();
  const idColumn = sheet.values[0].indexOf('Gig ID');
  sheet.values[1][idColumn] = '';
  assertEquals(1, syncWebsitePublications());
  const id = sheet.values[1][idColumn];
  assertEquals('generated-1', id);
  for (const status of ['READY', 'SKIPPED', 'ERROR', 'DRAFT_CREATED']) {
    websitePublicationSheetService.update(id, { status, title: 'Public title', contactEmail: 'other@example.invalid',
      contactWebsite: 'https://public.example.invalid', ticketUrl: 'https://tickets.example.invalid', price: '0' });
    const before = JSON.stringify(websitePublicationSheetService.getRows());
    sheet.values[1][sheet.values[0].indexOf('Title')] = 'Changed source';
    syncWebsitePublications();
    assertEquals(before, JSON.stringify(websitePublicationSheetService.getRows()));
  }
  assertEquals(1, unit.uuid);
  assertEquals(id, websitePublicationSheetService.getRows()[0][c.gigId]);
}

function testWebsiteResponseReadFailure() {
  const { c } = websiteReady_();
  unit.responseError = true;
  createWordPressDraft();
  const row = websitePublicationSheetService.getRows()[0];
  assertEquals('ERROR', row[c.status]);
  assertEquals('', row[c.wpEventId]);
  assertTrue(!JSON.stringify([row, unit.logs, unit.alerts]).includes(unit.properties.WORDPRESS_APPLICATION_PASSWORD));
  assertThrows(() => createWordPressDraft(), 'Alleen een READY-publicatie kan worden verwerkt.');
  assertEquals(1, unit.requests.length);
}

function testWebsiteDuplicateSourceRejected() {
  websiteFixture_();
  unit.addGig({});
  assertEquals(0, syncWebsitePublications());
  assertEquals(0, websitePublicationSheetService.getRows().length);
  assertEquals(2, unit.logs.filter(entry => entry[2] === 'duplicate-source-id').length);
}

function testWebsiteSheetSetupAndSchema() {
  websiteFixture_();
  setupWebsitePublications();
  const sheet = unit.sheets['website-publications'];
  assertEquals('Status,Title,Date,Venue,City,Country,Start,Address,Zip,Contact Email,Contact Website,Ticket URL,Price,Google Maps Embed,Event Description,WP Event ID,WP Draft URL,Gig ID,Last Error', sheet.values[0].join(','));
  setupWebsitePublications();
  assertEquals(1, sheet.protections.length);
  assertEquals(false, sheet.protections[0].domain);
  assertEquals(false, sheet.protections[0].warningOnly);
  sheet.maxRows = 2;
  syncWebsitePublications();
  unit.addGig({ 'Gig ID': 'G-2' });
  syncWebsitePublications();
  assertEquals(3, sheet.maxRows);
  assertTrue(sheet.protections[0].ranges.every(range => range.getNumRows() === 2));
  assertEquals('2,10,11,12,13,15', sheet.protections[0].ranges.map(r => r.getColumn()).join(','));
  assertTrue(sheet.formats.some(f => f.column === 9 && f.format === '@'));
  sheet.values[0][0] = 'Wrong';
  assertThrows(() => syncWebsitePublications(), 'website-publications heeft niet de verwachte 19 headers in de juiste volgorde. Voer de website-inrichtingsactie uit voor het oude schema.');
  assertEquals('Wrong', sheet.values[0][0]);
}

function testWebsiteMapsSnapshot() {
  const { sheet, c } = websiteFixture_();
  sheet.values[1][sheet.values[0].indexOf('Location')] = 'Stadsbroek 17, 9405 BK Assen';
  unit.addGig({ 'Gig ID': 'G-2', Location: '  ' });
  unit.addGig({ 'Gig ID': 'G-3', Location: 'Café "A&B" <zaal> \'s-Hertogenbosch' });
  syncWebsitePublications();
  const rows = websitePublicationSheetService.getRows();
  const widget = rows[0][c.googleMapsEmbed];
  assertTrue(widget.includes('q=Stadsbroek%2017%2C%209405%20BK%20Assen&amp;z=12'));
  assertTrue(widget.endsWith('</iframe></div>'));
  assertFalse(widget.includes('<script'));
  assertFalse(widget.includes('acadoo'));
  assertFalse(widget.includes('id="gmap_canvas"'));
  assertEquals('', rows[1][c.googleMapsEmbed]);
  assertTrue(rows[2][c.googleMapsEmbed].includes('Caf%C3%A9%20%22A%26B%22%20%3Czaal%3E%20%27s-Hertogenbosch'));
  sheet.values[1][sheet.values[0].indexOf('Location')] = 'Ander adres';
  syncWebsitePublications();
  assertEquals(widget, websitePublicationSheetService.getRows()[0][c.googleMapsEmbed]);
  assertEquals(widget, wordpressEventMapper.map(rows[0]).meta._wolf_event_map);
  assertEquals('', wordpressEventMapper.map(rows[1]).meta._wolf_event_map);
  assertEquals(rows[2][c.googleMapsEmbed], wordpressEventMapper.map(rows[2]).meta._wolf_event_map);
  assertEquals(0, unit.requests.length);
}

function testWebsiteMapsMigration() {
  websiteFixture_();
  const c = CONFIG.websitePublications.columns;
  const headers = Object.values(c).filter(header => header !== c.googleMapsEmbed && header !== c.eventDescription);
  const original = headers.map((header, index) => 'bestaand-' + index);
  const sheet = unit.makeSheet(CONFIG.websitePublications.sheetName, [headers.slice(), original.slice()]);
  assertThrows(() => websitePublicationSheetService.getRows(), 'website-publications heeft niet de verwachte 19 headers in de juiste volgorde. Voer de website-inrichtingsactie uit voor het oude schema.');
  assertEquals(17, sheet.values[0].length);
  setupWebsitePublications();
  assertEquals(c.googleMapsEmbed, sheet.values[0][13]);
  assertEquals('', sheet.values[1][13]);
  assertEquals(JSON.stringify(original), JSON.stringify(sheet.values[1].filter((value, index) => index !== 13 && index !== 14)));
  const before = JSON.stringify(sheet.values);
  setupWebsitePublications();
  assertEquals(before, JSON.stringify(sheet.values));
  assertFalse(sheet.protections[0].ranges.some(range => range.getColumn() === 14));
  sheet.values[0][13] = ''; // Onderbroken headerwrite is herstelbaar zonder tweede kolom.
  setupWebsitePublications();
  assertEquals(before, JSON.stringify(sheet.values));
  sheet.values[0][0] = 'Onbekend';
  const invalid = JSON.stringify(sheet.values);
  assertThrows(setupWebsitePublications, 'website-publications heeft niet de verwachte 19 headers in de juiste volgorde. Voer de website-inrichtingsactie uit voor het oude schema.');
  assertEquals(invalid, JSON.stringify(sheet.values));
}

function testWebsiteMapper() {
  const { c } = websiteReady_();
  const row = websitePublicationSheetService.getSelected();
  row[c.price] = 0;
  row[c.country] = 'Custom landcode';
  row[c.start] = new Date('2026-09-27T18:30:00Z');
  row['Contact Name'] = 'Private name';
  row['Contact Phone'] = '001234';
  const payload = wordpressEventMapper.map(row);
  assertEquals(JSON.stringify({ title: 'Concert', status: 'draft', we_artist: [13], content: '', meta: {
    _wolf_event_start_date: '31-12-2099', _wolf_event_venue: 'Zaal', _wolf_event_location: 'Concert', _wolf_event_city: 'Stad',
    _wolf_event_country_short: 'Custom landcode', _wolf_event_country: '', _wolf_event_time: '20:30',
    _wolf_event_address: 'Straat 1', _wolf_event_zip: '0012 AB', _wolf_event_email: 'public@example.invalid',
    _wolf_event_website: 'https://example.invalid', _wolf_event_ticket: '', _wolf_event_price: '0', _wolf_event_map: '', _wolf_event_currency: 'EUR'
  } }), JSON.stringify(payload));
  row[c.start] = '0:05';
  assertEquals('00:05', wordpressEventMapper.map(row).meta._wolf_event_time);
  row[c.start] = '25:00';
  assertThrows(() => wordpressEventMapper.map(row), 'Start moet een geldige tijd zijn (HH:mm).');
  row[c.title] = '';
  assertThrows(() => wordpressEventMapper.map(row), 'Title is verplicht.');
}

function testWebsiteDraftSuccessAndDuplicateBlock() {
  const { c } = websiteReady_();
  websitePublicationSheetService.update('G-1', { lastError: 'oude fout', title: 'Website title' });
  unit.onFetch = () => {
    const during = websitePublicationSheetService.getByGigId('G-1');
    assertEquals('ERROR', during[c.status]);
    assertTrue(during[c.lastError].includes('Createpoging gestart'));
    assertTrue(unit.flushes > 0);
  };
  createWordPressDraft();
  const row = websitePublicationSheetService.getByGigId('G-1');
  assertEquals(2049, row[c.wpEventId]);
  assertEquals('DRAFT_CREATED', row[c.status]);
  assertEquals('', row[c.lastError]);
  assertEquals('https://example.invalid/site/wp-admin/post.php?post=2049&action=edit', row[c.wpDraftUrl]);
  const request = unit.requests[0];
  assertEquals('https://example.invalid/site/wp-json/wp/v2/event', request.url);
  assertEquals(false, request.options.followRedirects);
  assertEquals('Basic dummy-base64', request.options.headers.Authorization);
  assertEquals('Website title', JSON.parse(request.options.payload).title);
  assertEquals('test-user:dummy-application-password', unit.encoded);
  assertThrows(() => createWordPressDraft(), 'WP Event ID is al gevuld; een tweede create is geblokkeerd.');
  assertEquals(1, unit.requests.length);
}

function testWebsiteHttpErrorsAndNoSecrets() {
  const { c } = websiteReady_();
  for (const status of [400, 401, 403, 404, 500, 302, 200]) {
    // Alleen de fixture simuleert het expliciete beheerherstel tussen onafhankelijke pogingen.
    websitePublicationSheetService.update('G-1', { status: 'READY' });
    unit.status = status;
    unit.rawBody = unit.properties.WORDPRESS_APPLICATION_PASSWORD + ' Basic dummy-base64';
    createWordPressDraft();
    const row = websitePublicationSheetService.getByGigId('G-1');
    assertEquals('ERROR', row[c.status]);
    assertEquals('', row[c.wpEventId]);
    assertTrue(row[c.lastError].includes('HTTP ' + status));
  }
  const visible = JSON.stringify([unit.logs, unit.alerts, unit.sheets['website-publications'].values]);
  assertTrue(!visible.includes(unit.properties.WORDPRESS_APPLICATION_PASSWORD));
  assertTrue(!visible.includes('dummy-base64'));
}

function testWebsiteAmbiguousFailuresAndWriteFailure() {
  const { c } = websiteReady_();
  unit.networkError = true;
  createWordPressDraft();
  assertEquals('ERROR', websitePublicationSheetService.getByGigId('G-1')[c.status]);
  assertThrows(() => createWordPressDraft(), 'Alleen een READY-publicatie kan worden verwerkt.');
  assertEquals(1, unit.requests.length);
  assertTrue(!JSON.stringify(unit.logs).includes(unit.properties.WORDPRESS_APPLICATION_PASSWORD));
  unit.networkError = false;
  for (const rawBody of ['invalid-json', '{"status":"draft"}', '{"id":0}']) {
    unit.rawBody = rawBody;
    websitePublicationSheetService.update('G-1', { status: 'READY' });
    createWordPressDraft();
    assertEquals('ERROR', websitePublicationSheetService.getByGigId('G-1')[c.status]);
    assertEquals('', websitePublicationSheetService.getByGigId('G-1')[c.wpEventId]);
  }
  unit.rawBody = undefined;
  websitePublicationSheetService.update('G-1', { status: 'READY' });
  unit.failWrite = (sheet, row, column) => sheet === 'website-publications' &&
    column === Object.values(CONFIG.websitePublications.columns).indexOf(c.wpEventId) + 1;
  createWordPressDraft();
  assertTrue(unit.alerts.at(-1).includes('2049'));
  assertEquals('ERROR', websitePublicationSheetService.getByGigId('G-1')[c.status]);
  const count = unit.requests.length;
  assertThrows(() => createWordPressDraft(), 'Alleen een READY-publicatie kan worden verwerkt.');
  assertEquals(count, unit.requests.length);
}

function testWebsiteReservationFailureNoPost() {
  websiteReady_();
  unit.failFlush = true;
  assertThrows(() => createWordPressDraft(), 'Flush failed');
  assertEquals(0, unit.requests.length);
  assertEquals(2, unit.releases); // Snapshot + mislukte create.
}

function testWebsiteInvalidSelectionAndStatus() {
  const { c } = websiteReady_();
  unit.select('gig-input', 2);
  assertThrows(() => createWordPressDraft(), 'Selecteer één dataregel in website-publications.');
  unit.select('website-publications', 1);
  assertThrows(() => createWordPressDraft(), 'Selecteer één dataregel in website-publications.');
  unit.select('website-publications', 2, 2);
  assertThrows(() => createWordPressDraft(), 'Selecteer één dataregel in website-publications.');
  unit.select('website-publications', 2);
  unit.selection.push(unit.selection[0]);
  assertThrows(() => createWordPressDraft(), 'Selecteer precies één publicatieregel.');
  unit.select('website-publications', 2);
  skipWebsitePublication();
  assertEquals('SKIPPED', websitePublicationSheetService.getByGigId('G-1')[c.status]);
  assertThrows(() => createWordPressDraft(), 'Alleen een READY-publicatie kan worden verwerkt.');
  unit.sheets['website-publications'].values.push([...unit.sheets['website-publications'].values[1]]);
  assertThrows(() => createWordPressDraft(), 'Gig ID ontbreekt of komt meerdere keren voor in website-publications.');
  assertEquals(0, unit.requests.length);
}

function testWebsiteEligibilityRecheckedAtCreate() {
  const { sheet, c } = websiteReady_();
  const statusColumn = sheet.values[0].indexOf('SyncStatus');
  for (const status of ['DELETE_REQUESTED', 'DELETED']) {
    sheet.values[1][statusColumn] = status;
    websitePublicationSheetService.update('G-1', { status: 'READY' });
    createWordPressDraft();
    assertEquals('ERROR', websitePublicationSheetService.getByGigId('G-1')[c.status]);
  }
  sheet.values[1][statusColumn] = 'DRAFT';
  sheet.values[1][sheet.values[0].indexOf('Date')] = new Date('2000-01-01T12:00:00Z');
  websitePublicationSheetService.update('G-1', { status: 'READY' });
  createWordPressDraft();
  assertEquals(0, unit.requests.length);
}

function testWebsiteTriggerBoundaryAndLock() {
  websiteFixture_();
  delete unit.properties.WORDPRESS_APPLICATION_PASSWORD;
  syncWebsitePublications(); // Config is niet nodig voor een snapshot.
  assertEquals(0, unit.requests.length);
  assertThrows(() => createWordPressDraft({ triggerUid: 'time-trigger' }), 'WordPress-concepten mogen uitsluitend handmatig worden aangemaakt.');
  unit.acquired = false;
  assertThrows(() => syncWebsitePublications(), 'Een andere verwerking is actief. Probeer later opnieuw.');
  assertEquals(1, unit.releases);
  unit.activeEmail = 'other@example.invalid';
  assertThrows(() => createWordPressDraft(), "Alleen admin@example.invalid mag 'WordPress-concept aanmaken'.");
  assertEquals(0, unit.requests.length);
}

function testWebsiteTriggerInstallation() {
  websiteFixture_();
  unit.triggers = [{ getHandlerFunction: () => 'unrelated' }];
  installWebsitePublicationTrigger();
  installWebsitePublicationTrigger();
  assertEquals(2, unit.triggers.length);
  assertEquals(1, unit.interval);
  unit.failTrigger = true;
  assertThrows(() => installWebsitePublicationTrigger(), 'trigger create failed');
  assertEquals(2, unit.triggers.length);
  removeWebsitePublicationTriggers();
  assertEquals(1, unit.triggers.length);
  assertEquals('unrelated', unit.triggers[0].getHandlerFunction());
  assertEquals(0, unit.requests.length);
}

function testWebsiteConfigurationAndDraftOnly() {
  websiteReady_();
  unit.properties.WORDPRESS_BASE_URL = 'http://example.invalid';
  createWordPressDraft();
  assertEquals(0, unit.requests.length);
  unit.properties.WORDPRESS_BASE_URL = 'https://example.invalid';
  const connection = wordpressEventClient.getConnection();
  assertThrows(() => wordpressEventClient.createDraft({ status: 'publish' }, connection), 'Uitsluitend WordPress-concepten zijn toegestaan.');
  assertEquals(0, unit.requests.length);
}
