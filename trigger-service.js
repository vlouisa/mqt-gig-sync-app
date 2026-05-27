const TRIGGER_HANDLERS = {
  autoSync: 'syncEventsToCalendar',
  notificationWorker: 'processEventQueueNotifications',
  flightMailImport: 'scanFlightEmailsAndImport',
  hotelMailImport: 'scanHotelEmailsAndImport',
  systemStatus: 'refreshSystemStatus'
};

/**
 * Synchroniseert alle events (gigs & flights) met SyncStatus = NEEDS_SYNC naar Google Calendar.
 *
 * Gebruikt een script lock om te voorkomen dat meerdere sync-runs tegelijk draaien.
 * De daadwerkelijke sync-logica zit in syncService.sync().
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
    return;
  }

  try {
    log.info('gig-sync-started', `Calendar-publicatie voor 'gigs' gestart.`, '');
    gigSyncService.sync();
    log.info('flight-sync-started', `Calendar-publicatie voor 'flights' gestart.`, '');
    flightSyncService.sync();
    log.info('hotel-sync-started', `Calendar-publicatie voor 'hotels' gestart.`, '');
    hotelSyncService.sync();
    log.info('sync-completed', 'Calendar-publicatie afgerond.', '');
  } finally {
    lock.releaseLock();
  }
}


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
 * Entry point voor de tijdsgestuurde hotel mail import.
 *
 * Scant Gmail op hotelbevestigingen en importeert gevonden
 * hotelgegevens naar het hotel-input tabblad.
 */
function scanHotelEmailsAndImport() {
  hotelMailImportService.scanAndImport();
}

/**
 * Google Sheets simple trigger.
 *
 * Wordt automatisch aangeroepen bij edits in de spreadsheet.
 * Delegeert alle inhoudelijke logica naar onEditService.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e Het edit-event.
 */
function onEdit(e) {
  onEditService.handle(e);
}

/**
 * Verwerkt pending notificaties uit de event-queue.
 */
function processEventQueueNotifications() {
  initNotifications();
  Notify.notificationWorker.process();
}


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
 * Beschermt technische kolommen in alle input sheets.
 *
 * @returns {void}
 */
function protectTechnicalColumns() {
  sheetProtectionService.protectTechnicalColumns();
}

/**
 * Installeert de automatische time-based trigger voor Calendar-publicatie.
 *
 * Verwijdert eerst bestaande auto-sync triggers om dubbele triggers te voorkomen.
 * Werkt daarna de visuele AutoSync-indicator in de header van SyncStatus bij.
 */
function installAutoSyncTrigger() {
  const log = logService.forModule('trigger-service');
  removeAutoSyncTriggers();

  const minutes = CONFIG.autoSync.everyMinutes;

  if (![1, 5, 10, 15, 30].includes(minutes)) {
    throw new Error('Ongeldige auto-sync periode. Gebruik 1, 5, 10, 15 of 30 minuten.');
  }

  ScriptApp.newTrigger('syncEventsToCalendar')
    .timeBased()
    .everyMinutes(minutes)
    .create();

  systemStatusService.update();  
  log.info('auto-sync-trigger-installed', 'Auto-sync trigger geïnstalleerd.', `Interval: ${minutes} minuten`
);
}

/**
 * Verwijdert alle bestaande auto-sync triggers voor syncEventsToCalendar().
 *
 * Wordt gebruikt om automatische publicatie tijdelijk uit te schakelen.
 * Werkt daarna de visuele AutoSync-indicator bij.
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


/**
 * Installeert twee dagelijkse time-based triggers voor flight mail import.
 *
 * De import draait standaard:
 * - 08:00
 * - 20:00
 *
 * Verwijdert eerst bestaande flight mail import triggers om dubbele triggers
 * te voorkomen.
 */
function installFlightMailImportTrigger() {
  const log = logService.forModule('trigger-service');
  removeFlightMailImportTriggers();

  ScriptApp.newTrigger('scanFlightEmailsAndImport')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  ScriptApp.newTrigger('scanFlightEmailsAndImport')
    .timeBased()
    .everyDays(1)
    .atHour(20)
    .create();

  systemStatusService.update();
  log.info('flight-mail-import-triggers-installed', 'Flight mail import triggers geïnstalleerd.', 'Runs: 08:00 en 20:00');
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


/**
 * Installeert twee dagelijkse time-based triggers voor hotel mail import.
 *
 * De import draait:
 * - 08:00
 * - 20:00
 */
function installHotelMailImportTrigger() {
  const log = logService.forModule('trigger-service');
  removeHotelMailImportTriggers();

  ScriptApp.newTrigger('scanHotelEmailsAndImport')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  ScriptApp.newTrigger('scanHotelEmailsAndImport')
    .timeBased()
    .everyDays(1)
    .atHour(19)
    .create();

   systemStatusService.update();
   log.info('hotel-mail-import-triggers-installed', 'Hotel mail import triggers geïnstalleerd.', 'Runs: 08:00 en 20:00');
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


/**
 * Installeert de 1-minuut time-based trigger voor de notificatie-worker.
 *
 * Verwijdert eerst bestaande notificatie-worker triggers om dubbele
 * queue-verwerking te voorkomen.
 *
 * @returns {void}
 */
function installNotificationWorkerTrigger() {
  const log = logService.forModule('trigger-service');

  removeNotificationWorkerTriggers();

  ScriptApp.newTrigger(TRIGGER_HANDLERS.notificationWorker)
    .timeBased()
    .everyMinutes(1)
    .create();

  systemStatusService.update();  
  log.info(
    'notification-worker-trigger-installed',
    'Notificatie-worker trigger geïnstalleerd.',
    'Interval: 1 minuut'
  );
}

/**
 * Verwijdert alle bestaande notificatie-worker triggers.
 *
 * @returns {void}
 */
function removeNotificationWorkerTriggers() {
  const log = logService.forModule('trigger-service');

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === TRIGGER_HANDLERS.notificationWorker) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  systemStatusService.update();
  log.info(
    'notification-worker-trigger-removed',
    'Notificatie-worker trigger(s) verwijderd.',
    ''
  );
}

/**
 * Controleert of exact één notificatie-worker trigger bestaat.
 *
 * Als er geen trigger of meerdere triggers bestaan, wordt de trigger opnieuw opgebouwd.
 *
 * @returns {void}
 */
function ensureNotificationWorkerTrigger() {
  const log = logService.forModule('trigger-service');

  const count = ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === TRIGGER_HANDLERS.notificationWorker)
    .length;

  if (count === 1) {
    log.info(
      'notification-worker-trigger-ok',
      'Notificatie-worker trigger is actief.',
      ''
    );
    return;
  }

  if (count > 1) {
    log.warn(
      'notification-worker-trigger-duplicate',
      'Meerdere notificatie-worker triggers gevonden. Triggers worden opnieuw opgebouwd.',
      `Aantal: ${count}`
    );
  }

  installNotificationWorkerTrigger();
}


/**
 * Installeert de time-based trigger voor het verversen van de system-status sheet.
 *
 * Verwijdert eerst bestaande system-status triggers om dubbele status-updates te voorkomen.
 *
 * @returns {void}
 */
function installSystemStatusTrigger() {
  const log = logService.forModule('trigger-service');

  removeSystemStatusTriggers();

  ScriptApp.newTrigger(TRIGGER_HANDLERS.systemStatus)
    .timeBased()
    .everyMinutes(1)
    .create();

  log.info(
    'system-status-trigger-installed',
    'System-status trigger geïnstalleerd.',
    'Interval: 1 minuut'
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


function assertAdminUser(action) {
  const userEmail = Session.getActiveUser().getEmail();

  if (userEmail !== CONFIG.adminEmail) {
    logService.warn('trigger-service', 'unauthorized-action', 'Niet-admin probeerde beheeractie uit te voeren.', `Action: ${action}, User: ${userEmail}`);
    throw new Error(`Alleen ${CONFIG.adminEmail} mag '${action}'.`);
  }
}

function ensureGigId(rowNumber) {
  const sheet = sheetService.getSheet(CONFIG.entities.gig.sheetName);
  const headers = sheetService.getHeaders(sheet);
  const columnMap = sheetService.getColumnIndexMap(headers);

  const gigIdCell = sheet.getRange(rowNumber, columnMap[CONFIG.entities.gig.columns.gigId]);
  const currentGigId = gigIdCell.getValue();

  if (currentGigId) {
    return;
  }

  const newGigId = Utilities.getUuid();

  gigIdCell.setValue(newGigId);
}

function ensureCreatedAt(rowNumber) {
  const sheet = sheetService.getSheet(CONFIG.entities.gig.sheetName);
  const headers = sheetService.getHeaders(sheet);
  const columnMap = sheetService.getColumnIndexMap(headers);

  const createdAtCell = sheet.getRange(rowNumber, columnMap[CONFIG.entities.gig.columns.createdAt]);

  if (!createdAtCell.getValue()) {
    createdAtCell.setValue(new Date());
  }
}


