/** Genereert onder het website-scriptlock uitsluitend voor IDs die deze run zijn toegevoegd. */
const eventDescriptionService = (() => {
  let lastResult = { generated: 0, failed: 0, remaining: 0, configurationMissing: false };
  function fillMissing(addedIds, startedAt = Date.now()) {
    const c = CONFIG.websitePublications.columns;
    const log = logService.forModule('event-description-service');
    const blank = row => !String(row[c.eventDescription] ?? '').trim();
    const ids = new Set(addedIds);
    const rows = ids.size ? websitePublicationSheetService.getRows().filter(row => ids.has(String(row[c.gigId]))) : [];
    const candidates = rows.filter(blank);
    const result = lastResult = { generated: 0, failed: 0, remaining: candidates.length, configurationMissing: false };
    if (rows.length > candidates.length) log.info('ai-description-skipped', 'Bestaande beschrijvingen behouden.', `Aantal: ${rows.length - candidates.length}`);
    if (!candidates.length) return result;
    let settings;
    try { settings = appPropertiesService.getEventDescriptionSettings(); }
    catch (error) {
      result.configurationMissing = true;
      log.warn('ai-configuration', 'AI-configuratie ontbreekt of is ongeldig; snapshots zijn behouden.');
      return result;
    }
    const seen = new Set();
    let attempts = 0;
    for (const candidate of candidates) {
      if (attempts >= settings.maxCalls || Date.now() - startedAt >= 180000) break;
      const id = String(candidate[c.gigId] || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      let stage = 'publicatie controleren';
      try {
        const row = websitePublicationSheetService.getByGigId(id);
        if (!blank(row)) continue;
        const facts = eventDescriptionGenerator.context(row);
        stage = 'AI-aanvraag of antwoordvalidatie';
        const text = eventDescriptionGenerator.generate(facts, settings, () => {
          if (attempts >= settings.maxCalls || Date.now() - startedAt >= 180000) {
            throw new Error('AI-aanvraaglimiet of tijdsbudget bereikt.');
          }
          const latest = websitePublicationSheetService.getByGigId(id);
          if (!blank(latest) || JSON.stringify(eventDescriptionGenerator.context(latest)) !== JSON.stringify(facts)) {
            throw new Error('Publicatie tussentijds gewijzigd.');
          }
          attempts++;
        });
        stage = 'publicatie opnieuw controleren';
        const current = websitePublicationSheetService.getByGigId(id);
        if (!blank(current) || JSON.stringify(eventDescriptionGenerator.context(current)) !== JSON.stringify(facts)) {
          log.info('ai-description-changed', 'AI-antwoord verworpen wegens tussentijdse wijziging.', `Gig ID: ${id}`);
          continue;
        }
        stage = 'beschrijving opslaan';
        websitePublicationSheetService.update(id, { eventDescription: text });
        result.generated++;
        log.info('ai-description-generated', 'Eventbeschrijving gegenereerd en opgeslagen.', `Gig ID: ${id}`);
      } catch (error) {
        result.failed++;
        if (error.code === 'guidelines-missing') {
          log.error('ai-guidelines-missing', 'Event-copy guidelines ontbreken. Bouw en deploy de runtime-resource.');
        }
        log.warn('ai-description-failed', 'Beschrijving van nieuwe publicatie niet aangevuld; controleer handmatig.',
          `Gig ID: ${id}; stap: ${stage}; ${error.stopRun ? 'provider/configuratie blokkeert deze run' : 'verwerking mislukt'}`);
        if (error.stopRun) break;
      }
    }
    result.remaining = websitePublicationSheetService.getRows().filter(row => ids.has(String(row[c.gigId])) && blank(row)).length;
    return result;
  }
  return { fillMissing, getLastResult: () => ({ ...lastResult }) };
})();
