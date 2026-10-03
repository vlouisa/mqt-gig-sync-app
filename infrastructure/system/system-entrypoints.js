/**
 * Werkt de system-status sheet bij.
 *
 * Deze functie is bedoeld als installable time-based trigger handler.
 *
 * @returns {void}
 */
function refreshSystemStatus() {
  systemStatusService.update();
}

/**
 * Installeert de time-based trigger voor het verversen van de system-status sheet.
 *
 * Vervangt bestaande triggers pas nadat aanmaken slaagt.
 *
 * @returns {void}
 */
function installSystemStatusTrigger() {
  const log = logService.forModule('trigger-service');

  const previous = ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === TRIGGER_HANDLERS.systemStatus);

  ScriptApp.newTrigger(TRIGGER_HANDLERS.systemStatus)
    .timeBased()
    .everyMinutes(30)
    .create();
  previous.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  log.info(
    'system-status-trigger-installed',
    'System-status trigger geïnstalleerd.',
    'Interval: 30 minuten'
  );
}

/**
 * Verwijdert alle bestaande system-status triggers.
 *
 * @returns {void}
 */
function removeSystemStatusTriggers() {
  const log = logService.forModule('trigger-service');

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === TRIGGER_HANDLERS.systemStatus) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  log.info(
    'system-status-trigger-removed',
    'System-status trigger(s) verwijderd.',
    ''
  );
}

/**
 * Logt IDs en handlernamen van de voor de uitvoerende gebruiker beschikbare projecttriggers.
 * Wijzigt geen triggers.
 * @returns {void}
 */
function toonTriggerIdsEnNamen() {
  const triggers = ScriptApp.getProjectTriggers();

  if (triggers.length === 0) {
    Logger.log('Geen triggers gevonden voor dit project.');
    return;
  }

  triggers.forEach(trigger => {
    Logger.log(
      'Trigger ID: %s | Functie: %s',
      trigger.getUniqueId(),
      trigger.getHandlerFunction()
    );
  });
}
