/**
 * Entry point voor de tijdsgestuurde flight mail import.
 *
 * Scant de Gmail box op vluchtbevestigingen en importeert gevonden
 * vluchtgegevens naar het flight-input tabblad.
 *
 * Wordt aangeroepen door de flight mail import triggers.
 */
function scanFlightEmailsAndImport() {
  const log = logService.forModule('trigger-service');
  log.info('flight-mail-import-started', 'Flight mail import gestart.', '');
  flightMailImportService.scanAndImport();
  log.info('flight-mail-import-completed', 'Flight mail import afgerond.', '');
}

/**
 * Installeert time-based triggers voor flight mail import.
 *
 * Valideert eerst en vervangt bestaande triggers pas nadat aanmaken slaagt.
 */
function installFlightMailImportTrigger() {
  const log = logService.forModule('trigger-service');

  const minutes = CONFIG.entities.flight.mailImport.autoSync.everyMinutes;

  if (![1, 5, 10, 15, 30].includes(minutes)) {
    throw new Error('Ongeldige auto-sync periode. Gebruik 1, 5, 10, 15 of 30 minuten.');
  }

  const previous = ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === TRIGGER_HANDLERS.flightMailImport);
  ScriptApp.newTrigger('scanFlightEmailsAndImport')
    .timeBased()
    .everyMinutes(minutes)
    .create();
  previous.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  systemStatusService.update();
  log.info('flight-mail-import-triggers-installed', 'FlightMailImport trigger geïnstalleerd.', `Interval: ${minutes} minuten`);
}

/**
 * Verwijdert alle bestaande time-based triggers voor flight mail import.
 *
 * Verwijdert alleen triggers met handler:
 * scanFlightEmailsAndImport
 */
function removeFlightMailImportTriggers() {
  const log = logService.forModule('trigger-service');
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'scanFlightEmailsAndImport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  systemStatusService.update();
  log.info('flight-mail-import-triggers-removed', 'Flight mail import triggers verwijderd.', '');
}
