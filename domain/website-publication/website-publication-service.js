/** Handmatige acties op de werkvoorraad. De globale entrypoints bewaken admin en scriptlock. */
const websitePublicationService = (() => {
  function assertReady_(row) {
    const c = CONFIG.websitePublications.columns;
    if (row[c.wpEventId] !== '' && row[c.wpEventId] !== null && row[c.wpEventId] !== undefined) {
      throw new Error('WP Event ID is al gevuld; een tweede create is geblokkeerd.');
    }
    if (row[c.status] !== CONFIG.websitePublications.statuses.ready) throw new Error('Alleen een READY-publicatie kan worden verwerkt.');
  }

  /** Bron alleen controleren op geschiktheid; snapshotvelden nooit verversen. */
  function assertEligible_(row, now) {
    const c = CONFIG.websitePublications.columns;
    const gc = CONFIG.entities.gig.columns;
    const matches = sheetService.getRowsAsObjects(CONFIG.entities.gig.sheetName)
      .filter(gig => String(gig[gc.gigId]) === String(row[c.gigId]));
    if (matches.length !== 1 || !websitePublicationSyncService.isEligible(matches[0], now)) {
      throw new Error('Bron-gig ontbreekt, heeft een dubbel ID, is historisch, verwijderd of niet CONFIRMED.');
    }
    const date = row[c.date];
    if (!(date instanceof Date) || !Number.isFinite(date.getTime()) ||
        Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd') <
        Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd')) {
      throw new Error('De snapshotdatum is ongeldig of historisch; geen websitepublicatie toegestaan.');
    }
  }

  /**
   * Maakt maximaal één draftpoging. ERROR wordt vóór de POST duurzaam opgeslagen.
   * Een timeout of afgebroken uitvoering vereist altijd handmatige controle en herstel.
   * @param {Date} now Controletijdstip.
   * @param {Object} [selectedRow] Onder het scriptlock opnieuw gelezen publicatie voor het beheerpaneel.
   * @returns {string} Gebruikersmelding; geen credentials of ruwe HTTP-fouten.
   */
  function createSelectedDraft(now = new Date(), selectedRow) {
    const c = CONFIG.websitePublications.columns;
    const states = CONFIG.websitePublications.statuses;
    const row = selectedRow || websitePublicationSheetService.getSelected();
    assertReady_(row);
    const gigId = row[c.gigId];
    const log = logService.forModule('website-publication-service');
    let payload, connection;
    try {
      assertEligible_(row, now);
      payload = wordpressEventMapper.map(row);
      connection = wordpressEventClient.getConnection();
    } catch (error) {
      websitePublicationSheetService.update(gigId, { status: states.error, lastError: error.message });
      return error.message;
    }

    // Schrijffouten of een mislukte flush verlaten de functie vóór de externe side effect.
    const pending = 'Createpoging gestart; bij onderbreking eerst WordPress controleren. Niet opnieuw aanmaken.';
    websitePublicationSheetService.update(gigId, { status: states.error, lastError: pending });
    SpreadsheetApp.flush();
    const reserved = websitePublicationSheetService.getByGigId(gigId);
    if (reserved[c.status] !== states.error || reserved[c.lastError] !== pending || reserved[c.wpEventId]) {
      throw new Error('Createblokkering kon niet worden bevestigd; WordPress niet aangeroepen.');
    }

    let result;
    try {
      result = wordpressEventClient.createDraft(payload, connection);
    } catch (error) {
      websitePublicationSheetService.update(gigId, { lastError: error.message });
      log.error('wordpress-create-error', error.message, `Row: ${row.rowNumber}`);
      return error.message;
    }

    try {
      // Eerst de echte identiteit opslaan, ook bij een onverwachte status/type in de response.
      websitePublicationSheetService.update(gigId, { wpEventId: result.id });
      SpreadsheetApp.flush();
      websitePublicationSheetService.update(gigId, {
        wpDraftUrl: result.draftUrl,
        lastError: result.isDraft ? '' : 'WordPress-response is geen event-draft. Controleer WordPress; geen nieuwe create.',
        status: result.isDraft ? states.draftCreated : states.error
      });
      SpreadsheetApp.flush();
    } catch (error) {
      const message = `WordPress-event ${result.id} is aangemaakt, maar terugschrijven is niet afgerond. Herstel handmatig; geen nieuwe create.`;
      log.error('wordpress-result-write-error', message, `Row: ${row.rowNumber}`);
      return message;
    }
    return result.isDraft ? `WordPress-concept ${result.id} aangemaakt.` : 'Onverwachte WordPress-response; zie Last Error.';
  }

  /** @param {Object} [selectedRow] Onder het scriptlock opnieuw gelezen publicatie; anders de huidige selectie. */
  function skipSelected(selectedRow) {
    const row = selectedRow || websitePublicationSheetService.getSelected();
    assertReady_(row);
    websitePublicationSheetService.update(row[CONFIG.websitePublications.columns.gigId], {
      status: CONFIG.websitePublications.statuses.skipped, lastError: ''
    });
    return 'Publicatie overgeslagen.';
  }

  return { createSelectedDraft, skipSelected };
})();
