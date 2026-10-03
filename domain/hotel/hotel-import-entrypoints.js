/**
 * Entry point voor de tijdsgestuurde hotel mail import.
 *
 * Scant Gmail op hotelbevestigingen en importeert gevonden
 * hotelgegevens naar het hotel-input tabblad.
 */
function scanHotelEmailsAndImport() {
  hotelMailImportService.scanAndImport();
}

/**
 * Installeert een time-based trigger voor hotel mail import.
 *
 * Valideert eerst en vervangt bestaande triggers pas nadat aanmaken slaagt.
 */
function installHotelMailImportTrigger() {
  const log = logService.forModule('trigger-service');

  const minutes = CONFIG.entities.hotel.mailImport.autoSync.everyMinutes;

  if (![1, 5, 10, 15, 30].includes(minutes)) {
    throw new Error('Ongeldige auto-sync periode. Gebruik 1, 5, 10, 15 of 30 minuten.');
  }

  const previous = ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === TRIGGER_HANDLERS.hotelMailImport);
  ScriptApp.newTrigger('scanHotelEmailsAndImport')
    .timeBased()
    .everyMinutes(minutes)
    .create();
  previous.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  systemStatusService.update();
  log.info('hotel-mail-import-triggers-installed', 'HotelMailImport trigger geïnstalleerd.', `Interval: ${minutes} minuten`);
}

/**
 * Verwijdert alle bestaande time-based triggers voor hotel mail import.
 */
function removeHotelMailImportTriggers() {
  const log = logService.forModule('trigger-service');
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'scanHotelEmailsAndImport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  systemStatusService.update();
  log.info('hotel-mail-import-triggers-removed', 'Hotel mail import triggers verwijderd.', '');
}
