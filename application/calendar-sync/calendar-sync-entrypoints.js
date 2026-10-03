/**
 * Verwerkt NEEDS_SYNC en DELETE_REQUESTED voor gigs, flights, hotels en blocked dates.
 *
 * Gebruikt een script lock om te voorkomen dat meerdere sync-runs tegelijk draaien.
 * Roept achtereenvolgens de vier domeinsyncservices aan. Deze wijzigen Calendar,
 * technische Sheet-velden, statussen en auditregels en publiceren waar van toepassing notificaties.
 * Een fout die een domeinservice verlaat stopt de resterende domeinen; eerdere mutaties blijven bestaan.
 *
 * Wordt aangeroepen door:
 * - menu-item "Publiceer events naar Calendar"
 * - auto-sync trigger
 */

function syncEventsToCalendar() {
  const log = logService.forModule('trigger-service');
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    log.warn('sync-skipped-lock', 'Sync overgeslagen: er draait al een sync.', '');
    return { tone: 'warning', message: 'Calendar-publicatie overgeslagen: er draait al een verwerking.' };
  }

  try {
    log.info('gig-sync-started', `Calendar-publicatie voor 'gigs' gestart.`, '');
    gigSyncService.sync();
    log.info('flight-sync-started', `Calendar-publicatie voor 'flights' gestart.`, '');
    flightSyncService.sync();
    log.info('hotel-sync-started', `Calendar-publicatie voor 'hotels' gestart.`, '');
    hotelSyncService.sync();
    log.info('blocked-date-sync-started', `Calendar-publicatie voor 'blocked-dates' gestart.`, '');
    blockedDateSyncService.sync();
    log.info('sync-completed', 'Calendar-publicatie afgerond.', '');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Installeert de automatische time-based trigger voor Calendar-publicatie.
 *
 * Valideert eerst en maakt een nieuwe trigger vóór bestaande triggers worden verwijderd.
 * Werkt daarna de system-status sheet bij.
 * @throws {Error} Bij een ongeldig interval; bestaande triggers blijven behouden.
 */
function installAutoSyncTrigger() {
  const log = logService.forModule('trigger-service');

  const minutes = CONFIG.autoSync.everyMinutes;

  if (![1, 5, 10, 15, 30].includes(minutes)) {
    throw new Error('Ongeldige auto-sync periode. Gebruik 1, 5, 10, 15 of 30 minuten.');
  }

  const previous = ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === TRIGGER_HANDLERS.autoSync);
  ScriptApp.newTrigger('syncEventsToCalendar')
    .timeBased()
    .everyMinutes(minutes)
    .create();
  previous.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  systemStatusService.update();
  log.info('auto-sync-trigger-installed', 'Auto-sync trigger geïnstalleerd.', `Interval: ${minutes} minuten`);
}

/**
 * Verwijdert alle bestaande auto-sync triggers voor syncEventsToCalendar().
 *
 * Wordt gebruikt om automatische publicatie tijdelijk uit te schakelen.
 * Werkt daarna de system-status sheet bij.
 */
function removeAutoSyncTriggers() {
  const log = logService.forModule('trigger-service');
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncEventsToCalendar') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  systemStatusService.update();
  log.info('auto-sync-trigger-removed','Auto-sync trigger(s) verwijderd.', '');
}
