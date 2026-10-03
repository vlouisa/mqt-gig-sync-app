/** Beheerpaneel: uitsluitend expliciete acties; overzichten lezen zonder Sheets of caches te wijzigen. */
const adminPanelService = (() => {
  function actions_() {
    return [
      { id: 'calendar', group: 'processing', label: 'Publiceer naar Calendar', description: 'Verwerkt alle klaarstaande rijen, inclusief verwijderverzoeken, in de vier invoerbladen.', run: syncEventsToCalendar },
      { id: 'flights', group: 'processing', label: 'Importeer vluchtmails', description: 'Scant Gmail en kan rijen en maillabels wijzigen.', run: scanFlightEmailsAndImport },
      { id: 'hotels', group: 'processing', label: 'Importeer hotelmails', description: 'Scant Gmail en kan rijen en maillabels wijzigen.', run: scanHotelEmailsAndImport },
      { id: 'website', group: 'website', label: 'Werk websitewerkvoorraad bij', description: 'Voegt nieuwe publicaties toe. Bestaande snapshots en WordPress-concepten blijven behouden.', run: syncWebsitePublications },
      { id: 'notifications', group: 'processing', label: 'Controleer notificaties', description: 'Controleert tijdgestuurde regels en kan meldingen klaarzetten.', run: checkScheduledNotifications },
      { id: 'worker', group: 'processing', label: 'Verwerk notificatiewachtrij', description: 'Kan meldingen afleveren via de ingestelde provider.', run: processEventQueueNotifications },
      { id: 'archive', group: 'maintenance', label: 'Archiveer auditlog', description: 'Schrijft een archief naar Drive en verwijdert daarna de gecontroleerde oude auditregels.', confirm: true, run: archiveAuditLogResult_ },
      { id: 'protection', group: 'maintenance', label: 'Bescherm technische kolommen', description: 'Herstelt de ingestelde kolombeveiligingen in de invoerbladen.', confirm: true, run: protectTechnicalColumns },
      { id: 'setupWebsite', group: 'maintenance', label: 'Richt websitewerkvoorraad in', description: 'Maakt het tabblad zo nodig aan en stelt opmaak en beveiliging in.', confirm: true, run: setupWebsitePublications },
      { id: 'statusSheet', group: 'maintenance', label: 'Werk statustabblad bij', description: 'Herschrijft system-status met de huidige triggeraantallen.', run: refreshSystemStatus }
    ];
  }

  function triggers_() {
    return [
      { id: 'calendar', label: 'Calendar', handler: TRIGGER_HANDLERS.autoSync, interval: `${CONFIG.autoSync.everyMinutes} minuten`, install: installAutoSyncTrigger, remove: removeAutoSyncTriggers },
      { id: 'flights', label: 'Vluchtimport', handler: TRIGGER_HANDLERS.flightMailImport, interval: `${CONFIG.entities.flight.mailImport.autoSync.everyMinutes} minuten`, install: installFlightMailImportTrigger, remove: removeFlightMailImportTriggers },
      { id: 'hotels', label: 'Hotelimport', handler: TRIGGER_HANDLERS.hotelMailImport, interval: `${CONFIG.entities.hotel.mailImport.autoSync.everyMinutes} minuten`, install: installHotelMailImportTrigger, remove: removeHotelMailImportTriggers },
      { id: 'website', label: 'Websitewerkvoorraad', handler: TRIGGER_HANDLERS.websitePublications, interval: `${CONFIG.websitePublications.everyHours} uur`, install: installWebsitePublicationTrigger, remove: removeWebsitePublicationTriggers },
      { id: 'notifications', label: 'Notificatiecontrole', handler: TRIGGER_HANDLERS.scheduledNotifications, interval: `${CONFIG.notifications.schedule.everyHours} uur`, install: installScheduledNotificationTrigger, remove: removeScheduledNotificationTriggers },
      { id: 'worker', label: 'Notificatieverwerking', handler: TRIGGER_HANDLERS.notificationWorker, interval: '1 minuut', install: installNotificationWorkerTrigger, remove: removeNotificationWorkerTriggers },
      { id: 'status', label: 'Statustabblad', handler: TRIGGER_HANDLERS.systemStatus, interval: '30 minuten', install: installSystemStatusTrigger, remove: removeSystemStatusTriggers }
    ];
  }

  function sources_() {
    return ['gig', 'flight', 'hotel', 'blockedDate'].map(key => ({
      id: key, config: CONFIG.entities[key], statusColumn: CONFIG.entities[key].columns.syncStatus,
      waiting: [CONFIG.syncStatuses.needsSync, CONFIG.syncStatuses.deleteRequested]
    })).concat([{ id: 'website', config: CONFIG.websitePublications,
      statusColumn: CONFIG.websitePublications.columns.status, waiting: [CONFIG.websitePublications.statuses.ready] }]);
  }

  /** Leest actuele headers rechtstreeks; aanmaken en cachevulling zijn hier ongewenst. */
  function read_(source) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(source.config.sheetName);
    if (!sheet) throw new Error(`Tabblad ontbreekt: ${source.config.sheetName}`);
    const values = sheet.getDataRange().getValues();
    const headers = values[0] || [];
    const required = [source.statusColumn, source.config.columns.lastError];
    if (required.some(header => headers.filter(value => value === header).length !== 1)) {
      throw new Error(`Status- of foutkolom ontbreekt of is dubbel in ${source.config.sheetName}.`);
    }
    return { sheet, rows: values.slice(1).map((values, index) => Object.assign(
      Object.fromEntries(headers.map((header, column) => [header, values[column]])), { rowNumber: index + 2 })) };
  }

  /** @returns {Object} Serialiseerbaar overzicht; voert geen beheeracties uit. */
  function snapshot() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const baseUrl = spreadsheet.getUrl();
    const handlers = ScriptApp.getProjectTriggers().map(trigger => trigger.getHandlerFunction());
    return {
      checkedAt: new Date().toISOString(), account: Session.getActiveUser().getEmail(),
      actions: actions_().map(({ run, ...action }) => action),
      triggers: triggers_().map(({ install, remove, ...trigger }) => ({
        ...trigger, count: handlers.filter(handler => handler === trigger.handler).length
      })),
      sources: sources_().map(source => {
        const result = { id: source.id, name: source.config.sheetName };
        try {
          const { sheet, rows } = read_(source);
          const errors = rows.filter(row => row[source.statusColumn] === 'ERROR');
          const url = `${baseUrl}#gid=${sheet.getSheetId()}`;
          return { ...result, url, waiting: rows.filter(row => source.waiting.includes(row[source.statusColumn])).length,
            errorCount: errors.length, errors: errors.slice(0, 10).map(row => ({
              row: row.rowNumber, message: String(row[source.config.columns.lastError] || 'Geen foutomschrijving.'),
              url: `${url}&range=A${row.rowNumber}`
            })) };
        } catch (error) { return { ...result, issue: error.message }; }
      })
    };
  }

  /** Alleen bekende acties; geen door de browser aangeleverde functienamen uitvoeren. */
  function execute(id) {
    const action = actions_().find(item => item.id === id);
    if (!action) throw new Error('Onbekende beheeractie.');
    const result = action.run();
    if (result && typeof result === 'object' && result.message) return result;
    if (id === 'website' && typeof result === 'number') {
      return { tone: 'success', message: `${result} nieuwe websitepublicaties toegevoegd aan de werkvoorraad.` };
    }
    return { tone: 'neutral', message: typeof result === 'string' ? result :
      `${action.label}: uitvoering afgerond. Controleer de rijstatussen of het betreffende overzicht; dit bevestigt niet dat ieder record of iedere aflevering is geslaagd.` };
  }

  function manageTrigger(id, operation) {
    const trigger = triggers_().find(item => item.id === id);
    if (!trigger || !['install', 'remove'].includes(operation)) throw new Error('Onbekende triggeractie.');
    // Website-entrypoints beheren hun eigen scriptlock.
    if (id === 'website') trigger[operation]();
    else {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(1000)) throw new Error('Een andere verwerking is actief. Probeer later opnieuw.');
      try { trigger[operation](); } finally { lock.releaseLock(); }
    }
    return { tone: 'neutral', message: `${trigger.label}: trigger ${operation === 'install' ? 'geïnstalleerd' : 'verwijderd'} voor dit beheeraccount.` };
  }

  function revision_(row) {
    const values = Object.values(CONFIG.websitePublications.columns).map(column => row[column]);
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(values), Utilities.Charset.UTF_8)
      .map(value => (value & 255).toString(16).padStart(2, '0')).join('');
  }

  /** Leg identiteit en inhoud vast; de gebruiker mag daarna een andere Sheet-rij selecteren. */
  function selection() {
    const ranges = SpreadsheetApp.getActiveSpreadsheet().getActiveRangeList();
    const selected = ranges ? ranges.getRanges() : [];
    const source = sources_().find(item => item.id === 'website');
    if (selected.length !== 1 || selected[0].getSheet().getName() !== source.config.sheetName ||
        selected[0].getNumRows() !== 1 || selected[0].getRow() < 2) {
      throw new Error('Selecteer één dataregel in website-publications.');
    }
    const { rows } = read_(source);
    const c = source.config.columns;
    const row = rows.find(item => item.rowNumber === selected[0].getRow());
    if (!row || !row[c.gigId] || rows.filter(item => String(item[c.gigId]) === String(row[c.gigId])).length !== 1) {
      throw new Error('Gig ID ontbreekt of komt meerdere keren voor.');
    }
    return { gigId: String(row[c.gigId]), title: String(row[c.title] || '(zonder titel)'),
      status: String(row[c.status]), revision: revision_(row) };
  }

  function publication(operation, expected) {
    if (!['create', 'skip'].includes(operation) || !expected || typeof expected.gigId !== 'string' || !expected.revision) {
      throw new Error('Laad eerst de geselecteerde publicatie.');
    }
    return withWebsitePublicationLock_(() => {
      const row = websitePublicationSheetService.getByGigId(expected.gigId);
      if (revision_(row) !== expected.revision) throw new Error('De publicatie is gewijzigd. Laad de selectie opnieuw en controleer de gegevens.');
      const message = operation === 'create'
        ? websitePublicationService.createSelectedDraft(new Date(), row) : websitePublicationService.skipSelected(row);
      const current = websitePublicationSheetService.getByGigId(expected.gigId);
      const status = current[CONFIG.websitePublications.columns.status];
      return { tone: status === CONFIG.websitePublications.statuses.error ? 'error' : 'success', message };
    });
  }

  return { snapshot, execute, manageTrigger, selection, publication };
})();
