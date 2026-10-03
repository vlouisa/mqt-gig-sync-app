/** Alleen in-memory HTTP- en Sheet-mocks via de lokale runner. */
function descriptionAi_() {
  unit.properties.OPENAI_API_KEY = 'dummy-ai-key';
  unit.description = 'STAD, TURN IT UP!\n\n' +
    'On 31 December 2099, join Miracle, The International Queen Tribute at Zaal in Stad for a celebration of Queen. ' +
    'Bring your voice and share the music with us.\n\nVenue: Zaal, Stad\n\n' +
    'Powerful vocals, iconic guitar work and soaring harmonies bring the energy of Queen to the stage. ' +
    'From rock intensity to theatrical dynamics, this is music made to be shared with the people around you. ' +
    'Whether you love the harmonies or the guitar, make room for a little Queen in your evening.\n\n' +
    'Stad, let us hear you!';
  unit.status = 200;
  unit.body = { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: unit.description }] }] };
}

function testDescriptionGenerationAndSourceIsolation() {
  const { sheet, c } = websiteFixture_();
  sheet.values[1][sheet.values[0].indexOf('Description')] = 'PRIVATE SOURCE DESCRIPTION';
  descriptionAi_();
  assertEquals(1, syncWebsitePublications());
  assertEquals(unit.description, websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  const request = unit.requests[0];
  assertEquals('https://api.openai.com/v1/responses', request.url);
  const body = JSON.parse(request.options.payload);
  assertEquals(false, body.store);
  assertEquals('gpt-5.4-mini', body.model);
  const facts = JSON.parse(body.input).eventData;
  assertEquals('31 December 2099', facts.date);
  assertFalse(Object.hasOwn(facts, 'start'));
  assertFalse(Object.hasOwn(facts, 'contactWebsite'));
  assertEquals('Concert', facts.internalTitle);
  assertFalse(request.options.payload.includes('PRIVATE SOURCE DESCRIPTION'));
  assertFalse(request.options.payload.includes('Private name'));
  assertFalse(request.options.payload.includes('public@example.invalid'));
  assertFalse(Object.hasOwn(facts, 'description'));
  assertEquals(0, syncWebsitePublications());
  assertEquals(1, unit.requests.length);
}

function testDescriptionExistingRowsPreserved() {
  const { c } = websiteReady_(); // Ontbrekende key verhindert de snapshot niet.
  descriptionAi_();
  for (const status of ['READY', 'SKIPPED', 'ERROR', 'DRAFT_CREATED']) {
    websitePublicationSheetService.update('G-1', { eventDescription: '  ', status, lastError: 'Bewaar WP-fout', wpEventId: '42' });
    syncWebsitePublications();
    const row = websitePublicationSheetService.getByGigId('G-1');
    assertEquals('  ', row[c.eventDescription]);
    assertEquals(status, row[c.status]);
    assertEquals('Bewaar WP-fout', row[c.lastError]);
    assertEquals('42', row[c.wpEventId]);
  }
  websitePublicationSheetService.update('G-1', { eventDescription: 'Handmatig aangepast' });
  const count = unit.requests.length;
  syncWebsitePublications();
  assertEquals(count, unit.requests.length);
  assertEquals('Handmatig aangepast', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  websitePublicationSheetService.update('G-1', { eventDescription: '' });
  for (let i = 2; i <= 7; i++) websitePublicationSheetService.append({ gigId: 'old-' + i });
  unit.addGig({ 'Gig ID': 'new-gig', Title: 'New event' });
  syncWebsitePublications();
  assertEquals(1, unit.requests.length);
  assertEquals('New event', JSON.parse(JSON.parse(unit.requests[0].options.payload).input).eventData.internalTitle);
  assertEquals('', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  assertEquals(unit.description, websitePublicationSheetService.getByGigId('new-gig')[c.eventDescription]);
}

function testDescriptionFailuresWithoutRetry() {
  const { c } = websiteFixture_();
  unit.addGig({ 'Gig ID': 'G-2' });
  descriptionAi_();
  unit.networkError = true;
  assertEquals(2, syncWebsitePublications());
  assertEquals(2, unit.requests.length);
  assertEquals(2, eventDescriptionService.getLastResult().failed);
  assertEquals('', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  assertFalse(JSON.stringify(unit.logs).includes('dummy-ai-key'));
  unit.networkError = false;
  syncWebsitePublications();
  assertEquals(2, unit.requests.length);
  assertEquals('', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  assertEquals(2, websitePublicationSheetService.getRows().length);
}

function testDescriptionLimitsForNewRows() {
  websiteFixture_();
  for (let i = 2; i <= 7; i++) unit.addGig({ 'Gig ID': 'G-' + i, Title: 'Event ' + i });
  descriptionAi_();
  unit.status = 500;
  syncWebsitePublications();
  assertEquals(5, unit.requests.length);
  syncWebsitePublications();
  assertEquals(5, unit.requests.length);
  unit.addGig({ 'Gig ID': 'G-8' });
  unit.addGig({ 'Gig ID': 'G-9' });
  unit.status = 401;
  syncWebsitePublications();
  assertEquals(6, unit.requests.length); // Autorisatiefout stopt de run.
  assertEquals(9, websitePublicationSheetService.getRows().length);
  eventDescriptionService.fillMissing(['G-9'], Date.now() - 180001);
  assertEquals(6, unit.requests.length);
}

function testDescriptionConcurrentEdits() {
  const { c } = websiteReady_();
  descriptionAi_();
  unit.onFetch = () => websitePublicationSheetService.update('G-1', { eventDescription: 'Handmatige tekst' });
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals('Handmatige tekst', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  websitePublicationSheetService.update('G-1', { eventDescription: '' });
  unit.onFetch = () => websitePublicationSheetService.update('G-1', { title: 'Gewijzigd tijdens HTTP' });
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals('', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  unit.onFetch = () => unit.sheets['website-publications'].values.push([...unit.sheets['website-publications'].values[1]]);
  eventDescriptionService.fillMissing(['G-1']);
  assertTrue(websitePublicationSheetService.getRows().every(row => row[c.eventDescription] === ''));
  const count = unit.requests.length;
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals(count, unit.requests.length); // Dubbele identiteit nooit naar AI.
}

function testDescriptionResponseValidation() {
  const { c } = websiteReady_();
  descriptionAi_();
  const responses = [
    { status: 'incomplete', output: [] },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] },
    { status: 'completed', output: [] },
    ...['One paragraph', '<p>A</p>\n\nB\n\nC', '```text\nA\n\nB\n\nC```'].map(text =>
      ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }))
  ];
  for (const body of responses) {
    unit.body = body;
    eventDescriptionService.fillMissing(['G-1']);
    assertEquals('', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  }
  unit.rawBody = 'invalid JSON dummy-ai-key';
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals('', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  assertFalse(JSON.stringify(unit.logs).includes('dummy-ai-key'));
}

function testDescriptionMigrationAndRecovery() {
  websiteFixture_();
  const c = CONFIG.websitePublications.columns;
  const headers = Object.values(c).filter(header => header !== c.eventDescription);
  const values = headers.map(header => 'original ' + header);
  const sheet = unit.makeSheet('website-publications', [headers.slice(), values.slice()]);
  setupWebsitePublications();
  assertEquals('Event Description', sheet.values[0][14]);
  assertEquals('', sheet.values[1][14]);
  assertEquals(JSON.stringify(values), JSON.stringify(sheet.values[1].filter((v, i) => i !== 14)));
  const before = JSON.stringify(sheet.values);
  sheet.values[0][14] = '';
  setupWebsitePublications();
  assertEquals(before, JSON.stringify(sheet.values));
  assertEquals(true, sheet.wrap);
  sheet.values[0][14] = '';
  sheet.values[1][14] = 'Do not replace';
  let failed = false;
  try { setupWebsitePublications(); } catch (error) { failed = true; }
  assertTrue(failed);
  assertEquals('Do not replace', sheet.values[1][14]);
}

function testDescriptionConfiguration() {
  websiteFixture_();
  syncWebsitePublications();
  assertTrue(eventDescriptionService.getLastResult().configurationMissing);
  assertEquals(0, unit.requests.length);
  descriptionAi_();
  unit.properties.EVENT_DESCRIPTION_PROVIDER = 'unsupported';
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals(0, unit.requests.length);
  unit.properties.EVENT_DESCRIPTION_PROVIDER = 'openai';
  unit.properties.EVENT_DESCRIPTION_MAX_CALLS = '0';
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals(0, unit.requests.length);
  unit.properties.EVENT_DESCRIPTION_MAX_CALLS = '1';
  unit.properties.OPENAI_MODEL = 'configured-model';
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals('configured-model', JSON.parse(unit.requests[0].options.payload).model);
}

function testDescriptionWordPressContent() {
  const { c } = websiteReady_();
  const text = 'First paragraph.\n\nSecond paragraph.';
  websitePublicationSheetService.update('G-1', { eventDescription: text });
  descriptionAi_(); // Geldige AI-configuratie mag create niet tot generatie aanzetten.
  unit.status = 201;
  unit.body = { id: 2049, status: 'draft', type: 'event' };
  createWordPressDraft();
  assertEquals(1, unit.requests.length);
  assertTrue(unit.requests[0].url.includes('/wp-json/'));
  assertEquals(text, JSON.parse(unit.requests[0].options.payload).content);
  assertEquals(text, websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
}

function testDescriptionWriteFailureAndMovedRow() {
  const { c } = websiteReady_();
  descriptionAi_();
  unit.failWrite = (name, row, col) => name === 'website-publications' && col === 15;
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals(1, eventDescriptionService.getLastResult().failed);
  assertEquals('', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  unit.failWrite = null;
  websitePublicationSheetService.append({ gigId: 'G-2', eventDescription: 'Keep me' });
  unit.onFetch = () => {
    const values = unit.sheets['website-publications'].values;
    [values[1], values[2]] = [values[2], values[1]];
  };
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals(unit.description, websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  assertEquals('Keep me', websitePublicationSheetService.getByGigId('G-2')[c.eventDescription]);
}
