/** Lokale controles met de echte resource; geen live AI-verzoeken. */
function testCopyGuidelinesComposition() {
  websiteFixture_();
  descriptionAi_();
  syncWebsitePublications();
  const body = JSON.parse(unit.requests[0].options.payload);
  assertEquals(eventCopyGuidelinesProvider.get(), body.instructions);
  for (const city of ['DEINZE', 'ASSEN', 'ENSCHEDE', 'HELMOND']) assertTrue(body.instructions.includes(city));
  assertTrue(body.instructions.includes('style references only'));
  assertTrue(body.instructions.includes('Rejected example'));
  const input = JSON.parse(body.input);
  assertEquals('Stad', input.eventData.city);
  assertFalse(body.input.includes('18:35'));
  assertFalse(body.input.includes('ab-bookings'));
  assertFalse(body.input.includes('guidelines'));
  assertFalse(body.instructions.includes('#Cacaofabriek'));
}

function testCopyQualityRetry() {
  const { c } = websiteFixture_();
  descriptionAi_();
  const good = unit.body;
  unit.onFetch = () => {
    unit.body = unit.requests.length === 1
      ? { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Too short.' }] }] }
      : good;
  };
  syncWebsitePublications();
  assertEquals(2, unit.requests.length);
  const first = JSON.parse(unit.requests[0].options.payload);
  const second = JSON.parse(unit.requests[1].options.payload);
  assertEquals(first.instructions, second.instructions);
  assertEquals(JSON.stringify(JSON.parse(first.input).eventData), JSON.stringify(JSON.parse(second.input).eventData));
  assertTrue(JSON.parse(second.input).qualityFeedback.some(item => item.includes('Too short')));
  assertEquals(unit.description, websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
}

function testCopyQualityRejectionAndBudget() {
  websiteFixture_();
  unit.addGig({ 'Gig ID': 'G-2' });
  unit.addGig({ 'Gig ID': 'G-3' });
  descriptionAi_();
  unit.body.output[0].content[0].text = 'For more information, visit https://example.invalid.';
  syncWebsitePublications();
  assertEquals(5, unit.requests.length); // Twee herkansingen en één laatste eerste poging.
  assertEquals(3, eventDescriptionService.getLastResult().failed);
  assertEquals(3, eventDescriptionService.getLastResult().remaining);
  const facts = unit.requests.map(request => JSON.parse(JSON.parse(request.options.payload).input).eventData);
  assertEquals(JSON.stringify(facts[0]), JSON.stringify(facts[1]));
  syncWebsitePublications();
  assertEquals(5, unit.requests.length); // Geen latere automatische aanvulling.
}

function testCopyQualitySignals() {
  websiteFixture_();
  descriptionAi_();
  const good = unit.description;
  for (const bad of [
    good.replace('31 December 2099', '2099-12-31'),
    'Miracle comes to Zaal on 31 December 2099.\n\n' + good,
    good + '\n\nFor more information, visit https://example.invalid.',
    Array(15).fill('Venue: Zaal in Stad with all the practical information about this event').join('\n'),
    '<p>' + good + '</p>'
  ]) {
    unit.body.output[0].content[0].text = bad;
    let calls = 0;
    assertThrows(() => eventDescriptionGenerator.generate({}, appPropertiesService.getEventDescriptionSettings(), () => calls++),
      'AI-antwoord na kwaliteitscontrole afgewezen.');
    assertEquals(2, calls);
  }
  // Headlines en meer dan zes korte alinea's zijn toegestaan.
  unit.body.output[0].content[0].text = good.replace(/\. /g, '.\n\n');
  assertTrue(eventDescriptionGenerator.generate({}, appPropertiesService.getEventDescriptionSettings(), () => {}).includes('STAD'));
}

function testCopyRetryStopsAfterEditOrDeadline() {
  const { c } = websiteReady_();
  descriptionAi_();
  unit.body.output[0].content[0].text = 'Too short';
  unit.onFetch = () => websitePublicationSheetService.update('G-1', { eventDescription: 'Manual text' });
  eventDescriptionService.fillMissing(['G-1']);
  assertEquals(1, unit.requests.length);
  assertEquals('Manual text', websitePublicationSheetService.getByGigId('G-1')[c.eventDescription]);
  websitePublicationSheetService.update('G-1', { eventDescription: '' });
  const originalNow = Date.now;
  try {
    Date.now = () => 1000;
    unit.onFetch = () => { Date.now = () => 181001; };
    eventDescriptionService.fillMissing(['G-1'], 1000);
    assertEquals(2, unit.requests.length); // De tweede call hoort bij de nieuwe test-run, geen retry.
  } finally { Date.now = originalNow; }
}

function testCopyGuidelinesUnavailable() {
  for (const resource of [undefined, null, { text: '' }, { text: ' ' }]) {
    EVENT_COPY_GUIDELINES_RESOURCE = resource;
    assertThrows(() => eventCopyGuidelinesProvider.get(), 'Event-copy guidelines ontbreken. Bouw en deploy de runtime-resource.');
  }
}
